package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"lang-exchange/internal/auth"
	"lang-exchange/internal/httputil"
)

func Auth(jwt *auth.JWT, tokens *auth.TokenStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" {
			// websocket clients may pass token as query param
			header = "Bearer " + c.Query("token")
		}
		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") || parts[1] == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized", "message": "missing bearer token"})
			return
		}
		claims, err := jwt.ParseAccess(parts[1])
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized", "message": "invalid token"})
			return
		}
		if tokens != nil {
			blocked, err := tokens.IsBlacklisted(c.Request.Context(), claims.ID)
			if err != nil {
				c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "internal_error"})
				return
			}
			if blocked {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized", "message": "token revoked"})
				return
			}
		}
		c.Set(httputil.UserIDKey, claims.UserID)
		c.Set("jti", claims.ID)
		if claims.ExpiresAt != nil {
			c.Set("exp", claims.ExpiresAt.Time)
		}
		c.Next()
	}
}

func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}
