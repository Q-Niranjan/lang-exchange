package middleware

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"lang-exchange/internal/httputil"
	"lang-exchange/internal/user"
)

func RequirePremium(users *user.Repository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := httputil.UserID(c)
		u, err := users.GetByID(c.Request.Context(), userID)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "premium_required"})
			return
		}
		if !u.PremiumActive(time.Now()) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error":   "premium_required",
				"message": "upgrade to premium to use messaging",
			})
			return
		}
		c.Next()
	}
}
