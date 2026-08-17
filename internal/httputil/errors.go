package httputil

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

type APIError struct {
	Status  int    `json:"-"`
	Code    string `json:"error"`
	Message string `json:"message,omitempty"`
}

func (e *APIError) Error() string {
	if e.Message != "" {
		return e.Message
	}
	return e.Code
}

func New(status int, code, message string) *APIError {
	return &APIError{Status: status, Code: code, Message: message}
}

func BadRequest(code, message string) *APIError {
	return New(http.StatusBadRequest, code, message)
}

func Unauthorized(message string) *APIError {
	return New(http.StatusUnauthorized, "unauthorized", message)
}

func Forbidden(code, message string) *APIError {
	return New(http.StatusForbidden, code, message)
}

func NotFound(message string) *APIError {
	return New(http.StatusNotFound, "not_found", message)
}

func Conflict(code, message string) *APIError {
	return New(http.StatusConflict, code, message)
}

func RespondError(c *gin.Context, err error) {
	var apiErr *APIError
	if errors.As(err, &apiErr) {
		c.JSON(apiErr.Status, apiErr)
		return
	}
	c.JSON(http.StatusInternalServerError, gin.H{"error": "internal_error", "message": err.Error()})
}
