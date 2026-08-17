package auth

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"lang-exchange/internal/httputil"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) Register(c *gin.Context) {
	var in RegisterInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httputil.RespondError(c, httputil.BadRequest("invalid_body", err.Error()))
		return
	}
	if err := h.svc.Register(c.Request.Context(), in); err != nil {
		httputil.RespondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"status": "otp_sent"})
}

func (h *Handler) VerifyOTP(c *gin.Context) {
	var in VerifyOTPInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httputil.RespondError(c, httputil.BadRequest("invalid_body", err.Error()))
		return
	}
	tokens, err := h.svc.VerifyOTP(c.Request.Context(), in)
	if err != nil {
		httputil.RespondError(c, err)
		return
	}
	c.JSON(http.StatusOK, tokens)
}

func (h *Handler) Login(c *gin.Context) {
	var in LoginInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httputil.RespondError(c, httputil.BadRequest("invalid_body", err.Error()))
		return
	}
	tokens, err := h.svc.Login(c.Request.Context(), in)
	if err != nil {
		httputil.RespondError(c, err)
		return
	}
	c.JSON(http.StatusOK, tokens)
}

func (h *Handler) Refresh(c *gin.Context) {
	var in RefreshInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httputil.RespondError(c, httputil.BadRequest("invalid_body", err.Error()))
		return
	}
	tokens, err := h.svc.Refresh(c.Request.Context(), in)
	if err != nil {
		httputil.RespondError(c, err)
		return
	}
	c.JSON(http.StatusOK, tokens)
}

func (h *Handler) Logout(c *gin.Context) {
	jti, _ := c.Get("jti")
	exp, _ := c.Get("exp")
	var remaining time.Duration
	if t, ok := exp.(time.Time); ok {
		remaining = time.Until(t)
	}
	jtiStr, _ := jti.(string)
	if err := h.svc.Logout(c.Request.Context(), jtiStr, remaining, ""); err != nil {
		httputil.RespondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "logged_out"})
}
