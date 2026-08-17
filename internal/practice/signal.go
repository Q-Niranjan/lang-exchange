package practice

import (
	"context"
	"encoding/json"
	"sync"

	"github.com/google/uuid"
	"nhooyr.io/websocket"
)

type SignalHub struct {
	mu    sync.Mutex
	rooms map[uuid.UUID]map[uuid.UUID]*websocket.Conn
}

func NewSignalHub() *SignalHub {
	return &SignalHub{rooms: make(map[uuid.UUID]map[uuid.UUID]*websocket.Conn)}
}

func (h *SignalHub) Join(sessionID, userID uuid.UUID, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.rooms[sessionID] == nil {
		h.rooms[sessionID] = make(map[uuid.UUID]*websocket.Conn)
	}
	h.rooms[sessionID][userID] = conn
}

func (h *SignalHub) Leave(sessionID, userID uuid.UUID, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	room, ok := h.rooms[sessionID]
	if !ok {
		return
	}
	if room[userID] == conn {
		delete(room, userID)
	}
	if len(room) == 0 {
		delete(h.rooms, sessionID)
	}
}

func (h *SignalHub) Relay(sessionID, from uuid.UUID, payload any) {
	body, err := json.Marshal(payload)
	if err != nil {
		return
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	for uid, conn := range h.rooms[sessionID] {
		if uid == from {
			continue
		}
		_ = conn.Write(context.Background(), websocket.MessageText, body)
	}
}

func (h *SignalHub) PeerCount(sessionID uuid.UUID) int {
	h.mu.Lock()
	defer h.mu.Unlock()
	return len(h.rooms[sessionID])
}

func (h *SignalHub) CloseRoom(sessionID uuid.UUID) {
	h.mu.Lock()
	defer h.mu.Unlock()
	hangup, _ := json.Marshal(map[string]string{"type": "hangup"})
	for _, conn := range h.rooms[sessionID] {
		_ = conn.Write(context.Background(), websocket.MessageText, hangup)
		_ = conn.Close(websocket.StatusNormalClosure, "session ended")
	}
	delete(h.rooms, sessionID)
}
