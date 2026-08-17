package chat

import (
	"context"
	"time"

	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Repository struct {
	messages      *mongo.Collection
	conversations *mongo.Collection
}

func NewRepository(db *mongo.Database) *Repository {
	return &Repository{
		messages:      db.Collection("messages"),
		conversations: db.Collection("conversations"),
	}
}

func (r *Repository) EnsureIndexes(ctx context.Context) error {
	_, err := r.messages.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "conversation_id", Value: 1}, {Key: "created_at", Value: -1}},
	})
	if err != nil {
		return err
	}
	_, err = r.conversations.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "participants", Value: 1}},
	})
	return err
}

func (r *Repository) Open(ctx context.Context, a, b uuid.UUID, sessionID string) (Conversation, error) {
	id := ConversationID(a, b)
	conv := Conversation{
		ID:            id,
		Participants:  []string{a.String(), b.String()},
		UnreadCount:   map[string]int{a.String(): 0, b.String(): 0},
		LastMessageAt: time.Now().UTC(),
		SessionID:     sessionID,
	}
	_, err := r.conversations.UpdateByID(ctx, id, bson.M{
		"$setOnInsert": conv,
	}, options.Update().SetUpsert(true))
	if err != nil {
		return Conversation{}, err
	}
	var stored Conversation
	if err := r.conversations.FindOne(ctx, bson.M{"_id": id}).Decode(&stored); err != nil {
		return Conversation{}, err
	}
	return stored, nil
}

func (r *Repository) SaveMessage(ctx context.Context, msg Message) (Message, error) {
	if msg.ID == "" {
		msg.ID = uuid.NewString()
	}
	if msg.CreatedAt.IsZero() {
		msg.CreatedAt = time.Now().UTC()
	}
	_, err := r.messages.InsertOne(ctx, msg)
	if err != nil {
		return Message{}, err
	}
	_, err = r.conversations.UpdateByID(ctx, msg.ConversationID, bson.M{
		"$set": bson.M{
			"last_message":    msg.Content,
			"last_message_at": msg.CreatedAt,
			"participants":    []string{msg.SenderID, msg.ReceiverID},
		},
		"$inc": bson.M{
			"unread_count." + msg.ReceiverID: 1,
		},
		"$setOnInsert": bson.M{
			"_id": msg.ConversationID,
		},
	}, options.Update().SetUpsert(true))
	return msg, err
}

func (r *Repository) History(ctx context.Context, conversationID string, limit int64) ([]Message, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	cur, err := r.messages.Find(ctx, bson.M{"conversation_id": conversationID}, options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetLimit(limit))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	var out []Message
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	if out == nil {
		out = []Message{}
	}
	return out, nil
}

func (r *Repository) Inbox(ctx context.Context, userID uuid.UUID) ([]Conversation, error) {
	cur, err := r.conversations.Find(ctx, bson.M{"participants": userID.String()}, options.Find().
		SetSort(bson.D{{Key: "last_message_at", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	var out []Conversation
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	if out == nil {
		out = []Conversation{}
	}
	return out, nil
}

func (r *Repository) MarkRead(ctx context.Context, conversationID string, userID uuid.UUID) error {
	_, err := r.conversations.UpdateByID(ctx, conversationID, bson.M{
		"$set": bson.M{"unread_count." + userID.String(): 0},
	})
	if err != nil {
		return err
	}
	_, err = r.messages.UpdateMany(ctx, bson.M{
		"conversation_id": conversationID,
		"receiver_id":     userID.String(),
		"read":            false,
	}, bson.M{"$set": bson.M{"read": true}})
	return err
}
