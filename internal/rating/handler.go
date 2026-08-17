package rating

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"lang-exchange/internal/httputil"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) Rate(c *gin.Context) {
	sessionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		httputil.RespondError(c, httputil.BadRequest("invalid_id", "invalid session id"))
		return
	}
	var in RateInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httputil.RespondError(c, httputil.BadRequest("invalid_body", err.Error()))
		return
	}
	out, err := h.svc.Rate(c.Request.Context(), httputil.UserID(c), sessionID, in)
	if err != nil {
		httputil.RespondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, out)
}

func (h *Handler) UserRating(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		httputil.RespondError(c, httputil.BadRequest("invalid_id", "invalid user id"))
		return
	}
	out, err := h.svc.Summary(c.Request.Context(), id)
	if err != nil {
		httputil.RespondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}
