package practice

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

const queuePrefix = "matchmaking:queue:"

type Matchmaker struct {
	rdb *redis.Client
}

func NewMatchmaker(rdb *redis.Client) *Matchmaker {
	return &Matchmaker{rdb: rdb}
}

func langPair(native, learning string) string {
	return native + "_" + learning
}

func complementary(native, learning string) string {
	return learning + "_" + native
}

func (m *Matchmaker) Enqueue(ctx context.Context, userID uuid.UUID, native, learning string) error {
	key := queuePrefix + langPair(native, learning)
	return m.rdb.ZAdd(ctx, key, redis.Z{
		Score:  float64(time.Now().UnixMilli()),
		Member: userID.String(),
	}).Err()
}

func (m *Matchmaker) Dequeue(ctx context.Context, userID uuid.UUID, native, learning string) error {
	key := queuePrefix + langPair(native, learning)
	return m.rdb.ZRem(ctx, key, userID.String()).Err()
}

func (m *Matchmaker) DequeueAll(ctx context.Context, userID uuid.UUID) error {
	var cursor uint64
	member := userID.String()
	for {
		keys, next, err := m.rdb.Scan(ctx, cursor, queuePrefix+"*", 50).Result()
		if err != nil {
			return err
		}
		for _, key := range keys {
			_ = m.rdb.ZRem(ctx, key, member).Err()
		}
		cursor = next
		if cursor == 0 {
			return nil
		}
	}
}

// PopPartner looks for a complementary language partner first, then anyone
// waiting on the same pair. The caller is left in the queue until a partner
// is found so the request can be retried.
func (m *Matchmaker) PopPartner(ctx context.Context, userID uuid.UUID, native, learning string) (uuid.UUID, bool, error) {
	keys := []string{
		queuePrefix + complementary(native, learning),
		queuePrefix + langPair(native, learning),
	}
	for _, key := range keys {
		ids, err := m.rdb.ZRange(ctx, key, 0, 20).Result()
		if err != nil {
			return uuid.Nil, false, err
		}
		for _, id := range ids {
			if id == userID.String() {
				continue
			}
			removed, err := m.rdb.ZRem(ctx, key, id).Result()
			if err != nil {
				return uuid.Nil, false, err
			}
			if removed == 0 {
				continue
			}
			partner, err := uuid.Parse(id)
			if err != nil {
				continue
			}
			_ = m.rdb.ZRem(ctx, queuePrefix+langPair(native, learning), userID.String()).Err()
			return partner, true, nil
		}
	}
	return uuid.Nil, false, nil
}

func (m *Matchmaker) PublishMatch(ctx context.Context, userID uuid.UUID, sessionID uuid.UUID) error {
	return m.rdb.Publish(ctx, fmt.Sprintf("match:%s", userID), sessionID.String()).Err()
}

func (m *Matchmaker) SetPending(ctx context.Context, userID, sessionID uuid.UUID) error {
	return m.rdb.Set(ctx, "match:result:"+userID.String(), sessionID.String(), 10*time.Minute).Err()
}

func (m *Matchmaker) ClearPending(ctx context.Context, userID uuid.UUID) error {
	return m.rdb.Del(ctx, "match:result:"+userID.String()).Err()
}

func (m *Matchmaker) GetPending(ctx context.Context, userID uuid.UUID) (uuid.UUID, bool, error) {
	val, err := m.rdb.Get(ctx, "match:result:"+userID.String()).Result()
	if err == redis.Nil {
		return uuid.Nil, false, nil
	}
	if err != nil {
		return uuid.Nil, false, err
	}
	id, err := uuid.Parse(val)
	if err != nil {
		return uuid.Nil, false, err
	}
	return id, true, nil
}

func (m *Matchmaker) SetPresence(ctx context.Context, userID uuid.UUID) error {
	return m.rdb.Set(ctx, "presence:"+userID.String(), "online", 60*time.Second).Err()
}

func (m *Matchmaker) IsOnline(ctx context.Context, userID uuid.UUID) bool {
	n, err := m.rdb.Exists(ctx, "presence:"+userID.String()).Result()
	return err == nil && n == 1
}

func (m *Matchmaker) OnlineMap(ctx context.Context, ids []uuid.UUID) map[string]bool {
	out := make(map[string]bool, len(ids))
	if len(ids) == 0 {
		return out
	}
	pipe := m.rdb.Pipeline()
	cmds := make([]*redis.IntCmd, len(ids))
	for i, id := range ids {
		cmds[i] = pipe.Exists(ctx, "presence:"+id.String())
	}
	_, _ = pipe.Exec(ctx)
	for i, id := range ids {
		out[id.String()] = cmds[i].Val() == 1
	}
	return out
}

type storedInvite struct {
	SessionID string `json:"session_id"`
	CallerID  string `json:"caller_id"`
}

func incomingKey(userID uuid.UUID) string {
	return "call:incoming:" + userID.String()
}

func (m *Matchmaker) SetIncomingCall(ctx context.Context, callee, sessionID, caller uuid.UUID) error {
	payload, err := json.Marshal(storedInvite{
		SessionID: sessionID.String(),
		CallerID:  caller.String(),
	})
	if err != nil {
		return err
	}
	return m.rdb.Set(ctx, incomingKey(callee), payload, 90*time.Second).Err()
}

func (m *Matchmaker) GetIncomingCall(ctx context.Context, userID uuid.UUID) (sessionID, caller uuid.UUID, ok bool, err error) {
	val, err := m.rdb.Get(ctx, incomingKey(userID)).Result()
	if err == redis.Nil {
		return uuid.Nil, uuid.Nil, false, nil
	}
	if err != nil {
		return uuid.Nil, uuid.Nil, false, err
	}
	var inv storedInvite
	if err := json.Unmarshal([]byte(val), &inv); err != nil {
		return uuid.Nil, uuid.Nil, false, nil
	}
	sessionID, err = uuid.Parse(inv.SessionID)
	if err != nil {
		return uuid.Nil, uuid.Nil, false, nil
	}
	caller, err = uuid.Parse(inv.CallerID)
	if err != nil {
		return uuid.Nil, uuid.Nil, false, nil
	}
	return sessionID, caller, true, nil
}

func (m *Matchmaker) ClearIncomingCall(ctx context.Context, userID uuid.UUID) error {
	return m.rdb.Del(ctx, incomingKey(userID)).Err()
}

type MissedCall struct {
	SessionID string `json:"session_id"`
	CallerID  string `json:"caller_id"`
	CreatedAt int64  `json:"created_at"`
}

func missedKey(userID uuid.UUID) string {
	return "call:missed:" + userID.String()
}

func (m *Matchmaker) AddMissedCall(ctx context.Context, callee, sessionID, caller uuid.UUID) error {
	payload, err := json.Marshal(MissedCall{
		SessionID: sessionID.String(),
		CallerID:  caller.String(),
		CreatedAt: time.Now().UnixMilli(),
	})
	if err != nil {
		return err
	}
	pipe := m.rdb.Pipeline()
	pipe.HSet(ctx, missedKey(callee), sessionID.String(), payload)
	pipe.Expire(ctx, missedKey(callee), 7*24*time.Hour)
	_, err = pipe.Exec(ctx)
	return err
}

func (m *Matchmaker) ListMissedCalls(ctx context.Context, userID uuid.UUID) ([]MissedCall, error) {
	vals, err := m.rdb.HGetAll(ctx, missedKey(userID)).Result()
	if err != nil {
		return nil, err
	}
	out := make([]MissedCall, 0, len(vals))
	for _, raw := range vals {
		var item MissedCall
		if json.Unmarshal([]byte(raw), &item) == nil && item.SessionID != "" {
			out = append(out, item)
		}
	}
	return out, nil
}

func (m *Matchmaker) RemoveMissedCall(ctx context.Context, userID uuid.UUID, sessionID string) error {
	return m.rdb.HDel(ctx, missedKey(userID), sessionID).Err()
}

func (m *Matchmaker) OnlineCount(ctx context.Context) (int64, error) {
	keys, err := m.rdb.Keys(ctx, "presence:*").Result()
	if err != nil {
		return 0, err
	}
	return int64(len(keys)), nil
}

func (m *Matchmaker) TryLockPair(ctx context.Context, a, b uuid.UUID) bool {
	left, right := a.String(), b.String()
	if left > right {
		left, right = right, left
	}
	ok, err := m.rdb.SetNX(ctx, "matchlock:"+left+"_"+right, "1", 15*time.Second).Result()
	return err == nil && ok
}

func (m *Matchmaker) ClearLock(ctx context.Context, a, b uuid.UUID) error {
	left, right := a.String(), b.String()
	if left > right {
		left, right = right, left
	}
	return m.rdb.Del(ctx, "matchlock:"+left+"_"+right).Err()
}
