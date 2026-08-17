package user

import (
	"net/http"

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
