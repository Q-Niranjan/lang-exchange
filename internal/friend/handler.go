package friend

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"lang-exchange/internal/chat"
	"lang-exchange/internal/httputil"
	"lang-exchange/internal/practice"
	"lang-exchange/internal/user"
)

type Friend struct {
	ID               string     `json:"id"`
	Username         string     `json:"username"`
	NativeLanguage   *string    `json:"native_language,omitempty"`
	LearningLanguage *string    `json:"learning_language,omitempty"`
	Online           bool       `json:"online"`
	SessionCount     int64      `json:"session_count"`
	LastSessionAt    *time.Time `json:"last_session_at,omitempty"`
	LastSessionID    string     `json:"last_session_id,omitempty"`
	ConversationID   string     `json:"conversation_id"`
	CreatedAt        time.Time  `json:"created_at"`
}

type Handler struct {
	repo     *Repository
	sessions *practice.Repository
	users    *user.Repository
	mm       *practice.Matchmaker
}

func NewHandler(repo *Repository, sessions *practice.Repository, users *user.Repository, mm *practice.Matchmaker) *Handler {
	return &Handler{repo: repo, sessions: sessions, users: users, mm: mm}
}

func (h *Handler) List(c *gin.Context) {
	userID := httputil.UserID(c)
	page := 1
	limit := 20
	if p := c.Query("page"); p != "" {
		if v, err := strconv.Atoi(p); err == nil && v > 0 {
			page = v
		}
	}
	if l := c.Query("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 && v <= 50 {
			limit = v
		}
	}
	query := strings.TrimSpace(c.Query("q"))

	rows, total, err := h.repo.ListPaginated(c.Request.Context(), userID, page, limit, query)
	if err != nil {
		httputil.RespondError(c, err)
		return
	}
	totalPages := total / limit
	if total%limit != 0 {
		totalPages++
	}
	c.JSON(http.StatusOK, gin.H{
		"friends":      h.decorate(c, userID, rows),
		"total":        total,
		"page":         page,
		"limit":        limit,
		"total_pages":  totalPages,
	})
}

func (h *Handler) Status(c *gin.Context) {
	other, err := uuid.Parse(c.Param("userID"))
	if err != nil {
		httputil.RespondError(c, httputil.BadRequest("invalid_id", "invalid user id"))
		return
	}
	ok, err := h.repo.IsFriend(c.Request.Context(), httputil.UserID(c), other)
	if err != nil {
		httputil.RespondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"is_friend": ok})
}

func (h *Handler) Add(c *gin.Context) {
	userID := httputil.UserID(c)
	other, err := uuid.Parse(c.Param("userID"))
	if err != nil {
		httputil.RespondError(c, httputil.BadRequest("invalid_id", "invalid user id"))
		return
	}
	if other == userID {
		httputil.RespondError(c, httputil.BadRequest("invalid_partner", "cannot add yourself"))
		return
	}
	practiced, err := h.sessions.HasSessionWith(c.Request.Context(), userID, other)
	if err != nil {
		httputil.RespondError(c, err)
		return
	}
	if !practiced {
		httputil.RespondError(c, httputil.Forbidden("not_partners", "practice together first, then add them as a friend"))
		return
	}
	if err := h.repo.Add(c.Request.Context(), userID, other); err != nil {
		httputil.RespondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "added", "is_friend": true})
}

func (h *Handler) Remove(c *gin.Context) {
	other, err := uuid.Parse(c.Param("userID"))
	if err != nil {
		httputil.RespondError(c, httputil.BadRequest("invalid_id", "invalid user id"))
		return
	}
	if err := h.repo.Remove(c.Request.Context(), httputil.UserID(c), other); err != nil {
		httputil.RespondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "removed", "is_friend": false})
}

func (h *Handler) decorate(c *gin.Context, userID uuid.UUID, rows []Record) []Friend {
	ids := make([]uuid.UUID, 0, len(rows))
	for _, row := range rows {
		ids = append(ids, row.FriendID)
	}
	online := map[string]bool{}
	if h.mm != nil {
		online = h.mm.OnlineMap(c.Request.Context(), ids)
	}
	out := make([]Friend, 0, len(rows))
	for _, row := range rows {
		item := Friend{
			ID:               row.FriendID.String(),
			Username:         row.Username,
			NativeLanguage:   row.Native,
			LearningLanguage: row.Learning,
			Online:           online[row.FriendID.String()],
			SessionCount:     row.SessionCount,
			LastSessionAt:    row.LastSessionAt,
			ConversationID:   chat.ConversationID(userID, row.FriendID),
			CreatedAt:        row.CreatedAt,
		}
		if row.LastSessionID != nil {
			item.LastSessionID = row.LastSessionID.String()
		}
		out = append(out, item)
	}
	return out
}
