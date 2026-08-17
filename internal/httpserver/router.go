package httpserver

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"

	"lang-exchange/internal/auth"
	"lang-exchange/internal/chat"
	"lang-exchange/internal/friend"
	"lang-exchange/internal/middleware"
	"lang-exchange/internal/notify"
	"lang-exchange/internal/payment"
	"lang-exchange/internal/practice"
	"lang-exchange/internal/rating"
	"lang-exchange/internal/user"
)

type Deps struct {
	Auth     *auth.Handler
	JWT      *auth.JWT
	Tokens   *auth.TokenStore
	Users    *user.Handler
	UserRepo *user.Repository
	Practice *practice.Handler
	Rating   *rating.Handler
	Chat     *chat.Handler
	Friends  *friend.Handler
	Notify   *notify.Handler
	Payment  *payment.Handler
	Redis    *redis.Client
}

func NewRouter(d Deps) *gin.Engine {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery(), middleware.CORS())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	v1 := r.Group("/api/v1")
	{
		// Public auth routes
		v1.POST("/auth/register", d.Auth.Register)
		v1.POST("/auth/verify-otp", d.Auth.VerifyOTP)
		v1.POST("/auth/login", d.Auth.Login)
		v1.POST("/auth/refresh", d.Auth.Refresh)
		v1.POST("/webhooks/payments", d.Payment.Webhook)

		authed := v1.Group("", middleware.Auth(d.JWT, d.Tokens), middleware.RateLimit(d.Redis, 60, time.Minute))
		{
			authed.POST("/auth/logout", d.Auth.Logout)

			// Profile & ratings – accessible without active premium
			authed.GET("/users/me", d.Users.Me)
			authed.PATCH("/users/me", d.Users.UpdateMe)
			authed.GET("/users/me/stats", d.Users.Stats)
			authed.GET("/users/me/sessions", d.Users.Sessions)
			authed.GET("/users/leaderboard", d.Users.Leaderboard)
			authed.GET("/users/:id/rating", d.Rating.UserRating)

			// Payments – accessible without active premium so users can upgrade
			authed.GET("/payments/plans", d.Payment.Plans)
			authed.GET("/payments/config", d.Payment.Config)
			authed.POST("/payments/orders", d.Payment.CreateOrder)
			authed.POST("/payments/verify", d.Payment.Verify)
			authed.GET("/payments/history", d.Payment.History)
			authed.POST("/payments/dummy-activate", d.Payment.DummyActivate)

			// Presence – needed so billing page can heartbeat
			authed.POST("/presence/heartbeat", d.Chat.PresenceBeat)

			// Everything below requires an active trial or subscription
			premium := authed.Group("", middleware.RequirePremium(d.UserRepo))
			{
				// Practice (now fully premium)
				premium.POST("/practice/match", d.Practice.Match)
				premium.GET("/practice/match/status", d.Practice.MatchStatus)
				premium.POST("/practice/match/cancel", d.Practice.CancelMatch)
				premium.GET("/practice/:id", d.Practice.Get)
				premium.POST("/practice/:id/end", d.Practice.End)
				premium.POST("/practice/:id/accept", d.Practice.AcceptCall)
				premium.POST("/practice/:id/rate", d.Rating.Rate)
				premium.GET("/ws/practice", d.Practice.WebSocket)

				// Friends
				premium.GET("/friends", d.Friends.List)
				premium.GET("/friends/:userID", d.Friends.Status)
				premium.POST("/friends/:userID", d.Friends.Add)
				premium.DELETE("/friends/:userID", d.Friends.Remove)

				// Notifications
				premium.GET("/notifications", d.Notify.List)
				premium.POST("/notifications/dismiss", d.Notify.Dismiss)

				// Direct / call-again
				premium.POST("/practice/direct", d.Practice.DirectCall)

				// Chat
				premium.GET("/chat", d.Chat.Inbox)
				premium.GET("/chat/:conversationID", d.Chat.History)
				premium.POST("/chat/:conversationID/messages", d.Chat.Send)
				premium.POST("/chat/from-session/:sessionID", d.Chat.OpenFromSession)
				premium.POST("/chat/with/:userID", d.Chat.OpenWith)
				premium.GET("/ws/chat", d.Chat.WebSocket)
			}
		}
	}
	return r
}
