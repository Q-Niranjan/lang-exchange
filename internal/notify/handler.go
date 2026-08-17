package notify

import (
	"context"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"lang-exchange/internal/chat"
	"lang-exchange/internal/httputil"
	"lang-exchange/internal/practice"
	"lang-exchange/internal/user"
)

type Item struct {
	ID             string            `json:"id"`
	Type           string            `json:"type"` // incoming_call | missed_call | message
	Partner        *practice.Partner `json:"partner,omitempty"`
	SessionID      string            `json:"session_id,omitempty"`
	ConversationID string            `json:"conversation_id,omitempty"`
	Preview        string            `json:"preview,omitempty"`
	CreatedAt      time.Time         `json:"created_at"`
	Online         bool              `json:"online"`
}

type Handler struct {
	chat     *chat.Service
	practice *practice.Service
	mm       *practice.Matchmaker
	users    *user.Repository
}

func NewHandler(chatSvc *chat.Service, practiceSvc *practice.Service, mm *practice.Matchmaker, users *user.Repository) *Handler {
	return &Handler{chat: chatSvc, practice: practiceSvc, mm: mm, users: users}
}

func (h *Handler) List(c *gin.Context) {
	userID := httputil.UserID(c)
	ctx := c.Request.Context()
	_ = h.mm.SetPresence(ctx, userID)

	items := make([]Item, 0, 8)
	seenCall := map[string]bool{}

	if incoming, ok := h.liveIncoming(ctx, userID); ok {
		items = append(items, incoming)
		seenCall[incoming.SessionID] = true
	}

	missed, err := h.mm.ListMissedCalls(ctx, userID)
	if err != nil {
		httputil.RespondError(c, err)
		return
	}
	for _, m := range missed {
		if seenCall[m.SessionID] {
			continue
		}
		caller, err := uuid.Parse(m.CallerID)
		if err != nil {
			continue
		}
		partner := h.lookup(ctx, caller)
		created := time.UnixMilli(m.CreatedAt).UTC()
		if m.CreatedAt == 0 {
			created = time.Now().UTC()
		}
		online := h.mm.IsOnline(ctx, caller)
		preview := "Missed call"
		if online {
			preview = "Missed call — they are still around. Call again."
		}
		items = append(items, Item{
			ID:        "call:" + m.SessionID,
			Type:      "missed_call",
			Partner:   partner,
			SessionID: m.SessionID,
			CreatedAt: created,
			Online:    online,
			Preview:   preview,
		})
	}

	inbox, err := h.chat.Inbox(ctx, userID)
	if err != nil {
		httputil.RespondError(c, err)
		return
	}
	for _, conv := range inbox {
		if conv.Unread <= 0 {
			continue
		}
		var partner *practice.Partner
		if conv.Partner != nil {
			pid, _ := uuid.Parse(conv.Partner.ID)
			partner = &practice.Partner{
				ID:               pid,
				Username:         conv.Partner.Username,
				NativeLanguage:   conv.Partner.NativeLanguage,
				LearningLanguage: conv.Partner.LearningLanguage,
			}
		}
		preview := conv.LastMessage
		if preview == "" {
			preview = "New message"
		}
		items = append(items, Item{
			ID:             "msg:" + conv.ID,
			Type:           "message",
			Partner:        partner,
			ConversationID: conv.ID,
			Preview:        preview,
			CreatedAt:      conv.LastMessageAt,
			Online:         conv.Online,
		})
	}

	sort.Slice(items, func(i, j int) bool {
		return items[i].CreatedAt.After(items[j].CreatedAt)
	})

	c.JSON(http.StatusOK, gin.H{
		"items":        items,
		"unread_count": len(items),
	})
}

type dismissInput struct {
	ID string `json:"id" binding:"required"`
}

func (h *Handler) Dismiss(c *gin.Context) {
	var in dismissInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httputil.RespondError(c, httputil.BadRequest("invalid_body", err.Error()))
		return
	}
	userID := httputil.UserID(c)
	ctx := c.Request.Context()
	id := strings.TrimSpace(in.ID)

	switch {
	case strings.HasPrefix(id, "call:"):
		sessionID := strings.TrimPrefix(id, "call:")
		_ = h.mm.RemoveMissedCall(ctx, userID, sessionID)
		if sid, err := uuid.Parse(sessionID); err == nil {
			incoming, _, ok, _ := h.mm.GetIncomingCall(ctx, userID)
			if ok && incoming == sid {
				_, _ = h.practice.End(ctx, userID, sid)
			}
		}
	case strings.HasPrefix(id, "msg:"):
		if err := h.chat.MarkRead(ctx, userID, strings.TrimPrefix(id, "msg:")); err != nil {
			httputil.RespondError(c, err)
			return
		}
	default:
		httputil.RespondError(c, httputil.BadRequest("invalid_id", "unknown notification id"))
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "dismissed"})
}

func (h *Handler) liveIncoming(ctx context.Context, userID uuid.UUID) (Item, bool) {
	status, err := h.practice.Status(ctx, userID)
	if err == nil && status.IncomingCall != nil {
		partner := status.IncomingCall.Partner
		online := false
		if partner != nil {
			online = h.mm.IsOnline(ctx, partner.ID)
		}
		return Item{
			ID:        "call:" + status.IncomingCall.SessionID,
			Type:      "incoming_call",
			Partner:   partner,
			SessionID: status.IncomingCall.SessionID,
			CreatedAt: time.Now().UTC(),
			Online:    online,
			Preview:   "Incoming call — they are waiting",
		}, true
	}

	sessionID, caller, ok, err := h.mm.GetIncomingCall(ctx, userID)
	if err != nil || !ok {
		return Item{}, false
	}
	partner := h.lookup(ctx, caller)
	return Item{
		ID:        "call:" + sessionID.String(),
		Type:      "incoming_call",
		Partner:   partner,
		SessionID: sessionID.String(),
		CreatedAt: time.Now().UTC(),
		Online:    h.mm.IsOnline(ctx, caller),
		Preview:   "Incoming call — they are waiting",
	}, true
}

func (h *Handler) lookup(ctx context.Context, id uuid.UUID) *practice.Partner {
	p := &practice.Partner{ID: id, Username: "Partner"}
	if h.users == nil {
		return p
	}
	u, err := h.users.GetByID(ctx, id)
	if err != nil {
		return p
	}
	p.Username = u.Username
	if prof, err := h.users.GetProfile(ctx, id); err == nil {
		p.NativeLanguage = prof.NativeLanguage
		p.LearningLanguage = prof.LearningLanguage
	}
	return p
}
