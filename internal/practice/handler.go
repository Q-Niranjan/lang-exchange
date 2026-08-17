package practice

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"nhooyr.io/websocket"

	"lang-exchange/internal/httputil"
)

type Handler struct {
	svc     *Service
	signals *SignalHub
}

func NewHandler(svc *Service, signals *SignalHub) *Handler {
	return &Handler{svc: svc, signals: signals}
}

func (h *Handler) Match(c *gin.Context) {
	var in MatchInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httputil.RespondError(c, httputil.BadRequest("invalid_body", err.Error()))
		return
	}
	out, err := h.svc.Match(c.Request.Context(), httputil.UserID(c), in)
	if err != nil {
		httputil.RespondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) MatchStatus(c *gin.Context) {
	out, err := h.svc.Status(c.Request.Context(), httputil.UserID(c))
	if err != nil {
		httputil.RespondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) CancelMatch(c *gin.Context) {
	if err := h.svc.Cancel(c.Request.Context(), httputil.UserID(c)); err != nil {
		httputil.RespondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		httputil.RespondError(c, httputil.BadRequest("invalid_id", "invalid session id"))
		return
	}
	sess, err := h.svc.Get(c.Request.Context(), httputil.UserID(c), id)
	if err != nil {
		httputil.RespondError(c, err)
		return
	}
	out, err := h.svc.matched(c.Request.Context(), httputil.UserID(c), sess)
	if err != nil {
		httputil.RespondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) DirectCall(c *gin.Context) {
	var in DirectCallInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httputil.RespondError(c, httputil.BadRequest("invalid_body", err.Error()))
		return
	}
	out, err := h.svc.DirectCall(c.Request.Context(), httputil.UserID(c), in)
	if err != nil {
		httputil.RespondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) AcceptCall(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		httputil.RespondError(c, httputil.BadRequest("invalid_id", "invalid session id"))
		return
	}
	out, err := h.svc.AcceptCall(c.Request.Context(), httputil.UserID(c), id)
	if err != nil {
		httputil.RespondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) End(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		httputil.RespondError(c, httputil.BadRequest("invalid_id", "invalid session id"))
		return
	}
	out, err := h.svc.End(c.Request.Context(), httputil.UserID(c), id)
	if err != nil {
		httputil.RespondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) WebSocket(c *gin.Context) {
	sessionID, err := uuid.Parse(c.Query("session_id"))
	if err != nil {
		httputil.RespondError(c, httputil.BadRequest("invalid_id", "invalid session id"))
		return
	}
	userID := httputil.UserID(c)
	sess, err := h.svc.Get(c.Request.Context(), userID, sessionID)
	if err != nil {
		httputil.RespondError(c, err)
		return
	}
	if sess.Status != "active" {
		httputil.RespondError(c, httputil.BadRequest("session_ended", "session is not active"))
		return
	}

	conn, err := websocket.Accept(c.Writer, c.Request, &websocket.AcceptOptions{
		InsecureSkipVerify: true,
	})
	if err != nil {
		return
	}
	defer conn.Close(websocket.StatusNormalClosure, "bye")

	h.signals.Join(sessionID, userID, conn)
	defer h.signals.Leave(sessionID, userID, conn)
	ready, _ := json.Marshal(map[string]any{
		"type":  "peers",
		"count": h.signals.PeerCount(sessionID),
	})
	_ = conn.Write(c.Request.Context(), websocket.MessageText, ready)
	h.signals.Relay(sessionID, userID, map[string]any{
		"type": "peer-joined",
		"from": userID.String(),
	})

	ctx := c.Request.Context()
	for {
		_, data, err := conn.Read(ctx)
		if err != nil {
			return
		}
		var msg map[string]any
		if err := json.Unmarshal(data, &msg); err != nil {
			continue
		}
		msg["from"] = userID.String()
		h.signals.Relay(sessionID, userID, msg)
	}
}
