package chat

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"nhooyr.io/websocket"
	"nhooyr.io/websocket/wsjson"

	"lang-exchange/internal/httputil"
	"lang-exchange/internal/practice"
)

type Handler struct {
	svc *Service
	mm  *practice.Matchmaker
}

func NewHandler(svc *Service, mm *practice.Matchmaker) *Handler {
	return &Handler{svc: svc, mm: mm}
}

func (h *Handler) Inbox(c *gin.Context) {
	out, err := h.svc.Inbox(c.Request.Context(), httputil.UserID(c))
	if err != nil {
		httputil.RespondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) History(c *gin.Context) {
	out, err := h.svc.History(c.Request.Context(), httputil.UserID(c), c.Param("conversationID"))
	if err != nil {
		httputil.RespondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) OpenWith(c *gin.Context) {
	other, err := uuid.Parse(c.Param("userID"))
	if err != nil {
		httputil.RespondError(c, httputil.BadRequest("invalid_id", "invalid user id"))
		return
	}
	out, err := h.svc.OpenWith(c.Request.Context(), httputil.UserID(c), other)
	if err != nil {
		httputil.RespondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) OpenFromSession(c *gin.Context) {
	sessionID, err := uuid.Parse(c.Param("sessionID"))
	if err != nil {
		httputil.RespondError(c, httputil.BadRequest("invalid_id", "invalid session id"))
		return
	}
	out, err := h.svc.OpenFromSession(c.Request.Context(), httputil.UserID(c), sessionID)
	if err != nil {
		httputil.RespondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

type sendInput struct {
	Type    string `json:"type"`
	Content string `json:"content" binding:"required"`
}

func (h *Handler) Send(c *gin.Context) {
	var in sendInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httputil.RespondError(c, httputil.BadRequest("invalid_body", err.Error()))
		return
	}
	out, err := h.svc.Send(c.Request.Context(), httputil.UserID(c), c.Param("conversationID"), in.Type, in.Content)
	if err != nil {
		httputil.RespondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, out)
}

type wsIncoming struct {
	ConversationID string `json:"conversation_id"`
	Type           string `json:"type"`
	Content        string `json:"content"`
}

func (h *Handler) WebSocket(c *gin.Context) {
	userID := httputil.UserID(c)
	conn, err := websocket.Accept(c.Writer, c.Request, &websocket.AcceptOptions{
		InsecureSkipVerify: true,
	})
	if err != nil {
		return
	}
	defer conn.Close(websocket.StatusNormalClosure, "bye")

	h.svc.hub.Add(userID, conn)
	defer h.svc.hub.Remove(userID, conn)
	_ = h.mm.SetPresence(c.Request.Context(), userID)

	ctx := c.Request.Context()
	for {
		var in wsIncoming
		if err := wsjson.Read(ctx, conn, &in); err != nil {
			return
		}
		msg, err := h.svc.Send(ctx, userID, in.ConversationID, in.Type, in.Content)
		if err != nil {
			_ = wsjson.Write(ctx, conn, gin.H{"error": err.Error()})
			continue
		}
		_ = wsjson.Write(ctx, conn, msg)
		_ = h.mm.SetPresence(ctx, userID)
	}
}

func (h *Handler) PresenceBeat(c *gin.Context) {
	_ = h.mm.SetPresence(c.Request.Context(), httputil.UserID(c))
	c.JSON(http.StatusOK, gin.H{"status": "online", "ttl": int((60 * time.Second).Seconds())})
}
