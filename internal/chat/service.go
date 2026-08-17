package chat

import (
	"context"
	"errors"
	"sync"

	"github.com/google/uuid"
	"nhooyr.io/websocket"
	"nhooyr.io/websocket/wsjson"

	"lang-exchange/internal/httputil"
	"lang-exchange/internal/practice"
	"lang-exchange/internal/user"
)

type Service struct {
	repo     Store
	sessions *practice.Repository
	users    *user.Repository
	mm       *practice.Matchmaker
	hub      *Hub
}

func NewService(repo Store, sessions *practice.Repository, users *user.Repository, mm *practice.Matchmaker, hub *Hub) *Service {
	return &Service{repo: repo, sessions: sessions, users: users, mm: mm, hub: hub}
}

func (s *Service) OpenFromSession(ctx context.Context, userID, sessionID uuid.UUID) (Conversation, error) {
	sess, err := s.sessions.GetByID(ctx, sessionID)
	if errors.Is(err, practice.ErrNotFound) {
		return Conversation{}, httputil.NotFound("session not found")
	}
	if err != nil {
		return Conversation{}, err
	}
	if !sess.Involves(userID) {
		return Conversation{}, httputil.Forbidden("forbidden", "not a participant")
	}
	return s.repo.Open(ctx, sess.UserAID, sess.UserBID, sess.ID.String())
}

func (s *Service) OpenWith(ctx context.Context, userID, other uuid.UUID) (Conversation, error) {
	if other == userID {
		return Conversation{}, httputil.BadRequest("invalid_partner", "cannot chat with yourself")
	}
	ok, err := s.sessions.HasSessionWith(ctx, userID, other)
	if err != nil {
		return Conversation{}, err
	}
	if !ok {
		return Conversation{}, httputil.Forbidden("not_friends", "practice together first to message this partner")
	}
	return s.repo.Open(ctx, userID, other, "")
}

func (s *Service) History(ctx context.Context, userID uuid.UUID, conversationID string) ([]Message, error) {
	if _, ok := OtherParticipant(conversationID, userID); !ok {
		return nil, httputil.Forbidden("forbidden", "not a participant")
	}
	msgs, err := s.repo.History(ctx, conversationID, 50)
	if err != nil {
		return nil, err
	}
	_ = s.repo.MarkRead(ctx, conversationID, userID)
	return msgs, nil
}

func (s *Service) MarkRead(ctx context.Context, userID uuid.UUID, conversationID string) error {
	if _, ok := OtherParticipant(conversationID, userID); !ok {
		return httputil.Forbidden("forbidden", "not a participant")
	}
	return s.repo.MarkRead(ctx, conversationID, userID)
}

func (s *Service) Inbox(ctx context.Context, userID uuid.UUID) ([]InboxItem, error) {
	convs, err := s.repo.Inbox(ctx, userID)
	if err != nil {
		return nil, err
	}
	ids := make([]uuid.UUID, 0, len(convs))
	for _, conv := range convs {
		if other, ok := OtherParticipant(conv.ID, userID); ok {
			ids = append(ids, other)
		}
	}
	users, _ := s.users.GetByIDs(ctx, ids)
	profiles, _ := s.users.GetProfilesByIDs(ctx, ids)
	online := map[string]bool{}
	if s.mm != nil {
		online = s.mm.OnlineMap(ctx, ids)
	}

	out := make([]InboxItem, 0, len(convs))
	for _, conv := range convs {
		item := InboxItem{Conversation: conv, Unread: conv.UnreadCount[userID.String()]}
		other, ok := OtherParticipant(conv.ID, userID)
		if ok {
			item.PartnerID = other.String()
			item.Online = online[other.String()]
			item.Partner = partnerFrom(other, users, profiles)
		}
		out = append(out, item)
	}
	return out, nil
}

func partnerFrom(id uuid.UUID, users map[uuid.UUID]user.User, profiles map[uuid.UUID]user.Profile) *ChatPartner {
	p := &ChatPartner{ID: id.String(), Username: "Partner"}
	if u, ok := users[id]; ok {
		p.Username = u.Username
	}
	if prof, ok := profiles[id]; ok {
		p.NativeLanguage = prof.NativeLanguage
		p.LearningLanguage = prof.LearningLanguage
	}
	return p
}

func (s *Service) Send(ctx context.Context, sender uuid.UUID, conversationID, msgType, content string) (Message, error) {
	receiver, ok := OtherParticipant(conversationID, sender)
	if !ok {
		return Message{}, httputil.Forbidden("forbidden", "not a participant")
	}
	if content == "" {
		return Message{}, httputil.BadRequest("empty_content", "message content is required")
	}
	switch msgType {
	case "text", "image", "audio":
	default:
		msgType = "text"
	}
	msg, err := s.repo.SaveMessage(ctx, Message{
		ConversationID: conversationID,
		SenderID:       sender.String(),
		ReceiverID:     receiver.String(),
		Type:           msgType,
		Content:        content,
	})
	if err != nil {
		return Message{}, err
	}
	s.hub.Send(receiver, msg)
	return msg, nil
}

type Hub struct {
	mu      sync.RWMutex
	clients map[uuid.UUID]map[*websocket.Conn]struct{}
}

func NewHub() *Hub {
	return &Hub{clients: make(map[uuid.UUID]map[*websocket.Conn]struct{})}
}

func (h *Hub) Add(userID uuid.UUID, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.clients[userID] == nil {
		h.clients[userID] = make(map[*websocket.Conn]struct{})
	}
	h.clients[userID][conn] = struct{}{}
}

func (h *Hub) Remove(userID uuid.UUID, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if conns, ok := h.clients[userID]; ok {
		delete(conns, conn)
		if len(conns) == 0 {
			delete(h.clients, userID)
		}
	}
}

func (h *Hub) Send(userID uuid.UUID, payload any) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for conn := range h.clients[userID] {
		_ = wsjson.Write(context.Background(), conn, payload)
	}
}

func (h *Hub) Notify(userID uuid.UUID, payload any) {
	h.Send(userID, payload)
}
