package user

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"lang-exchange/internal/httputil"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) Me(c *gin.Context) {
	out, err := h.svc.Me(c.Request.Context(), httputil.UserID(c))
	if err != nil {
		httputil.RespondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) UpdateMe(c *gin.Context) {
	var in UpdateMeInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httputil.RespondError(c, httputil.BadRequest("invalid_body", err.Error()))
		return
	}
	out, err := h.svc.UpdateMe(c.Request.Context(), httputil.UserID(c), in)
	if err != nil {
		httputil.RespondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) Stats(c *gin.Context) {
	stats, err := h.svc.GetStats(c.Request.Context(), httputil.UserID(c))
	if err != nil {
		httputil.RespondError(c, err)
		return
	}
	c.JSON(http.StatusOK, stats)
}

func (h *Handler) Sessions(c *gin.Context) {
	limit := 50
	if l := c.Query("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 && v <= 200 {
			limit = v
		}
	}
	items, err := h.svc.GetSessions(c.Request.Context(), httputil.UserID(c), limit)
	if err != nil {
		httputil.RespondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"sessions": items})
}
