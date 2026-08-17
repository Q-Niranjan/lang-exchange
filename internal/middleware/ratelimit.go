package middleware

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"

	"lang-exchange/internal/httputil"
)

func RateLimit(rdb *redis.Client, limit int, window time.Duration) gin.HandlerFunc {
	if limit <= 0 {
		limit = 60
	}
	if window <= 0 {
		window = time.Minute
	}
	return func(c *gin.Context) {
		userID := httputil.UserID(c)
		route := c.FullPath()
		if route == "" {
			route = c.Request.URL.Path
		}
		key := fmt.Sprintf("ratelimit:%s:%s", userID.String(), route)
		n, err := rdb.Incr(c.Request.Context(), key).Result()
		if err != nil {
			c.Next()
			return
		}
		if n == 1 {
			_ = rdb.Expire(c.Request.Context(), key, window).Err()
		}
		if n > int64(limit) {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "rate_limited"})
			return
		}
		c.Next()
	}
}
