package chat

import (
	"strings"
	"time"

	"github.com/google/uuid"
)

type Message struct {
	ID             string    `json:"id" bson:"_id,omitempty"`
	ConversationID string    `json:"conversation_id" bson:"conversation_id"`
	SenderID       string    `json:"sender_id" bson:"sender_id"`
	ReceiverID     string    `json:"receiver_id" bson:"receiver_id"`
	Type           string    `json:"type" bson:"type"`
	Content        string    `json:"content" bson:"content"`
	Read           bool      `json:"read" bson:"read"`
	CreatedAt      time.Time `json:"created_at" bson:"created_at"`
}

type Conversation struct {
	ID            string         `json:"id" bson:"_id"`
	Participants  []string       `json:"participants" bson:"participants"`
	LastMessage   string         `json:"last_message" bson:"last_message"`
	LastMessageAt time.Time      `json:"last_message_at" bson:"last_message_at"`
	UnreadCount   map[string]int `json:"unread_count" bson:"unread_count"`
	SessionID     string         `json:"session_id,omitempty" bson:"session_id,omitempty"`
}

type ChatPartner struct {
	ID               string  `json:"id"`
	Username         string  `json:"username"`
	NativeLanguage   *string `json:"native_language,omitempty"`
	LearningLanguage *string `json:"learning_language,omitempty"`
}

type InboxItem struct {
	Conversation
	PartnerID string       `json:"partner_id,omitempty"`
	Partner   *ChatPartner `json:"partner,omitempty"`
	Unread    int          `json:"unread"`
	Online    bool         `json:"online"`
}

func ConversationID(a, b uuid.UUID) string {
	as, bs := a.String(), b.String()
	if as > bs {
		as, bs = bs, as
	}
	return as + "_" + bs
}

func OtherParticipant(conversationID string, me uuid.UUID) (uuid.UUID, bool) {
	parts := strings.Split(conversationID, "_")
	if len(parts) != 2 {
		return uuid.Nil, false
	}
	a, err1 := uuid.Parse(parts[0])
	b, err2 := uuid.Parse(parts[1])
	if err1 != nil || err2 != nil {
		return uuid.Nil, false
	}
	switch me {
	case a:
		return b, true
	case b:
		return a, true
	default:
		return uuid.Nil, false
	}
}
