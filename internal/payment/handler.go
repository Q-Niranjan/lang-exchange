package payment

import (
	"io"
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

func (h *Handler) Plans(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"plans": h.svc.Plans()})
}

func (h *Handler) Config(c *gin.Context) {
	c.JSON(http.StatusOK, h.svc.PublicConfig())
}

func (h *Handler) CreateOrder(c *gin.Context) {
	var in CreateOrderRequest
	if err := c.ShouldBindJSON(&in); err != nil {
		httputil.RespondError(c, httputil.BadRequest("invalid_body", err.Error()))
		return
	}
	out, err := h.svc.CreateOrder(c.Request.Context(), httputil.UserID(c), in)
	if err != nil {
		httputil.RespondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, out)
}

func (h *Handler) Verify(c *gin.Context) {
	var in VerifyRequest
	if err := c.ShouldBindJSON(&in); err != nil {
		httputil.RespondError(c, httputil.BadRequest("invalid_body", err.Error()))
		return
	}
	out, err := h.svc.Verify(c.Request.Context(), httputil.UserID(c), in)
	if err != nil {
		httputil.RespondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) Webhook(c *gin.Context) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		httputil.RespondError(c, httputil.BadRequest("invalid_body", err.Error()))
		return
	}
	if err := h.svc.HandleWebhook(c.Request.Context(), c.Request.Header, body); err != nil {
		httputil.RespondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (h *Handler) DummyActivate(c *gin.Context) {
	if err := h.svc.DummyActivate(c.Request.Context(), httputil.UserID(c)); err != nil {
		httputil.RespondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"status":     "success",
		"is_premium": true,
		"message":    "Premium unlocked successfully (Demo mode)!",
	})
}
