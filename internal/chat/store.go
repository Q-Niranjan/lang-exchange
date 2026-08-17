package chat

import (
	"context"

	"github.com/google/uuid"
)

type Store interface {
	EnsureIndexes(ctx context.Context) error
	Open(ctx context.Context, a, b uuid.UUID, sessionID string) (Conversation, error)
	SaveMessage(ctx context.Context, msg Message) (Message, error)
	History(ctx context.Context, conversationID string, limit int64) ([]Message, error)
	Inbox(ctx context.Context, userID uuid.UUID) ([]Conversation, error)
	MarkRead(ctx context.Context, conversationID string, userID uuid.UUID) error
}
