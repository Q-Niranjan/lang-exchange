package httputil

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const UserIDKey = "user_id"

func UserID(c *gin.Context) uuid.UUID {
	id, _ := c.Get(UserIDKey)
	uid, _ := id.(uuid.UUID)
	return uid
}
