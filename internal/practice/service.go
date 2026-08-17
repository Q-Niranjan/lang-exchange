package practice

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"

	"lang-exchange/internal/httputil"
	"lang-exchange/internal/user"
)

type Notifier interface {
	Notify(userID uuid.UUID, payload any)
}

type FriendChecker interface {
	IsFriend(ctx context.Context, userID, friendID uuid.UUID) (bool, error)
}

type Service struct {
	repo     *Repository
	mm       *Matchmaker
	signals  *SignalHub
	users    *user.Repository
	notifier Notifier
	friends  FriendChecker
}

func NewService(repo *Repository, mm *Matchmaker, signals *SignalHub, users *user.Repository, notifier Notifier, friends FriendChecker) *Service {
	return &Service{repo: repo, mm: mm, signals: signals, users: users, notifier: notifier, friends: friends}
}

type MatchInput struct {
	NativeLanguage   string `json:"native_language" binding:"required"`
	LearningLanguage string `json:"learning_language" binding:"required"`
}

type MatchResult struct {
	Status       string        `json:"status"` // matched | queued | incoming
	Session      *Session      `json:"session,omitempty"`
	SessionID    *string       `json:"session_id,omitempty"`
	Partner      *Partner      `json:"partner,omitempty"`
	Stats        *Stats        `json:"stats,omitempty"`
	IncomingCall *IncomingCall `json:"incoming_call,omitempty"`
}

func (s *Service) Match(ctx context.Context, userID uuid.UUID, in MatchInput) (MatchResult, error) {
	in.NativeLanguage = strings.ToLower(strings.TrimSpace(in.NativeLanguage))
	in.LearningLanguage = strings.ToLower(strings.TrimSpace(in.LearningLanguage))
	if len(in.NativeLanguage) < 2 || len(in.LearningLanguage) < 2 {
		return MatchResult{}, httputil.BadRequest("invalid_language", "language codes are required")
	}
	if in.NativeLanguage == in.LearningLanguage {
		return MatchResult{}, httputil.BadRequest("invalid_language", "native and learning languages must differ")
	}

	if active, err := s.repo.ActiveForUser(ctx, userID); err == nil {
		return s.matched(ctx, userID, active)
	} else if !errors.Is(err, ErrNotFound) {
		return MatchResult{}, err
	}

	if _, sess, ok, err := s.livePending(ctx, userID); err != nil {
		return MatchResult{}, err
	} else if ok {
		return s.matched(ctx, userID, sess)
	}

	if err := s.mm.Enqueue(ctx, userID, in.NativeLanguage, in.LearningLanguage); err != nil {
		return MatchResult{}, err
	}

	deadline := time.Now().Add(8 * time.Second)
	for time.Now().Before(deadline) {
		partner, ok, err := s.mm.PopPartner(ctx, userID, in.NativeLanguage, in.LearningLanguage)
		if err != nil {
			return MatchResult{}, err
		}
		if ok {
			if existing, err := s.repo.ActiveForUser(ctx, userID); err == nil {
				return s.matched(ctx, userID, existing)
			}
			if existing, err := s.repo.ActiveForUser(ctx, partner); err == nil {
				_ = s.mm.SetPending(ctx, userID, existing.ID)
				return s.matched(ctx, userID, existing)
			}
			if !s.mm.TryLockPair(ctx, userID, partner) {
				time.Sleep(250 * time.Millisecond)
				if pending, ok, err := s.mm.GetPending(ctx, userID); err == nil && ok {
					if sess, err := s.repo.GetByID(ctx, pending); err == nil {
						return s.matched(ctx, userID, sess)
					}
				}
				continue
			}
			sess, err := s.repo.Create(ctx, userID, partner)
			if err != nil {
				return MatchResult{}, err
			}
			_ = s.mm.SetPending(ctx, userID, sess.ID)
			_ = s.mm.SetPending(ctx, partner, sess.ID)
			_ = s.mm.PublishMatch(ctx, userID, sess.ID)
			_ = s.mm.PublishMatch(ctx, partner, sess.ID)
			return s.matched(ctx, userID, sess)
		}
		select {
		case <-ctx.Done():
			return MatchResult{Status: "queued"}, nil
		case <-time.After(400 * time.Millisecond):
		}
	}
	return MatchResult{Status: "queued"}, nil
}

func (s *Service) Status(ctx context.Context, userID uuid.UUID) (MatchResult, error) {
	_ = s.mm.SetPresence(ctx, userID)
	if incoming, ok := s.incomingFor(ctx, userID); ok {
		out := MatchResult{Status: "incoming", IncomingCall: incoming}
		if stats, err := s.repo.Stats(ctx, userID); err == nil {
			out.Stats = &stats
		}
		return out, nil
	}
	if _, sess, ok, err := s.livePending(ctx, userID); err != nil {
		return MatchResult{}, err
	} else if ok {
		return s.matched(ctx, userID, sess)
	}
	if active, err := s.repo.ActiveForUser(ctx, userID); err == nil {
		if ringing, ok := s.ringingCall(ctx, userID, active); ok {
			out := MatchResult{Status: "incoming", IncomingCall: ringing}
			if stats, err := s.repo.Stats(ctx, userID); err == nil {
				out.Stats = &stats
			}
			return out, nil
		}
		return s.matched(ctx, userID, active)
	}
	out := MatchResult{Status: "queued"}
	if stats, err := s.repo.Stats(ctx, userID); err == nil {
		if count, err := s.mm.OnlineCount(ctx); err == nil {
			stats.OnlinePartners = count
		}
		out.Stats = &stats
	}
	return out, nil
}

func (s *Service) Cancel(ctx context.Context, userID uuid.UUID) error {
	return s.mm.DequeueAll(ctx, userID)
}

func (s *Service) Get(ctx context.Context, userID, sessionID uuid.UUID) (Session, error) {
	sess, err := s.repo.GetByID(ctx, sessionID)
	if errors.Is(err, ErrNotFound) {
		return Session{}, httputil.NotFound("session not found")
	}
	if err != nil {
		return Session{}, err
	}
	if !sess.Involves(userID) {
		return Session{}, httputil.Forbidden("forbidden", "not a participant")
	}
	return sess, nil
}

func (s *Service) End(ctx context.Context, userID, sessionID uuid.UUID) (Session, error) {
	sess, err := s.Get(ctx, userID, sessionID)
	if err != nil {
		return Session{}, err
	}
	if sess.Status != "active" {
		s.recordMissedCalls(ctx, userID, sess)
		_ = s.mm.ClearPending(ctx, sess.UserAID)
		_ = s.mm.ClearPending(ctx, sess.UserBID)
		_ = s.mm.ClearIncomingCall(ctx, sess.UserAID)
		_ = s.mm.ClearIncomingCall(ctx, sess.UserBID)
		return sess, nil
	}
	ended, err := s.repo.End(ctx, sessionID)
	if errors.Is(err, ErrNotFound) {
		return sess, nil
	}
	if err != nil {
		return Session{}, err
	}
	s.recordMissedCalls(ctx, userID, ended)
	_ = s.mm.ClearPending(ctx, ended.UserAID)
	_ = s.mm.ClearPending(ctx, ended.UserBID)
	_ = s.mm.ClearIncomingCall(ctx, ended.UserAID)
	_ = s.mm.ClearIncomingCall(ctx, ended.UserBID)
	_ = s.mm.ClearLock(ctx, ended.UserAID, ended.UserBID)
	if s.signals != nil {
		s.signals.CloseRoom(ended.ID)
	}
	if s.notifier != nil {
		payload := map[string]any{"event": "call_ended", "session_id": ended.ID.String()}
		s.notifier.Notify(ended.UserAID, payload)
		s.notifier.Notify(ended.UserBID, payload)
	}
	// Update talk-time and streak for both participants.
	if s.users != nil && ended.EndedAt != nil {
		secs := int64(ended.EndedAt.Sub(ended.StartedAt).Seconds())
		_ = s.users.AddTalkSecondsAndStreak(ctx, ended.UserAID, secs)
		_ = s.users.AddTalkSecondsAndStreak(ctx, ended.UserBID, secs)
	}
	return ended, nil
}

type DirectCallInput struct {
	PartnerID string `json:"partner_id" binding:"required"`
}

func (s *Service) DirectCall(ctx context.Context, caller uuid.UUID, in DirectCallInput) (MatchResult, error) {
	callee, err := uuid.Parse(strings.TrimSpace(in.PartnerID))
	if err != nil {
		return MatchResult{}, httputil.BadRequest("invalid_id", "invalid partner id")
	}
	if callee == caller {
		return MatchResult{}, httputil.BadRequest("invalid_partner", "cannot call yourself")
	}

	if s.friends == nil {
		return MatchResult{}, httputil.Forbidden("not_friends", "add this partner to your friend list first, then call again")
	}
	ok, err := s.friends.IsFriend(ctx, caller, callee)
	if err != nil {
		return MatchResult{}, err
	}
	if !ok {
		return MatchResult{}, httputil.Forbidden("not_friends", "add this partner to your friend list first, then call again")
	}

	if active, err := s.repo.ActiveForUser(ctx, caller); err == nil {
		return s.matched(ctx, caller, active)
	} else if !errors.Is(err, ErrNotFound) {
		return MatchResult{}, err
	}
	if _, err := s.repo.ActiveForUser(ctx, callee); err == nil {
		return MatchResult{}, httputil.Conflict("partner_busy", "that partner is already in a call")
	} else if !errors.Is(err, ErrNotFound) {
		return MatchResult{}, err
	}

	_ = s.mm.DequeueAll(ctx, caller)
	sess, err := s.repo.Create(ctx, caller, callee)
	if err != nil {
		return MatchResult{}, err
	}
	_ = s.mm.SetPending(ctx, caller, sess.ID)
	_ = s.mm.SetIncomingCall(ctx, callee, sess.ID, caller)

	partner := s.lookupPartner(ctx, callee)
	if s.notifier != nil {
		s.notifier.Notify(callee, map[string]any{
			"event":      "incoming_call",
			"session_id": sess.ID.String(),
			"partner":    s.lookupPartner(ctx, caller),
		})
	}
	out := MatchResult{Status: "matched", Session: &sess, SessionID: strPtr(sess.ID.String()), Partner: partner}
	return out, nil
}

func (s *Service) AcceptCall(ctx context.Context, userID, sessionID uuid.UUID) (MatchResult, error) {
	sess, err := s.Get(ctx, userID, sessionID)
	if err != nil {
		return MatchResult{}, err
	}
	if sess.Status != "active" {
		return MatchResult{}, httputil.BadRequest("session_ended", "this call is no longer active")
	}
	_ = s.mm.DequeueAll(ctx, userID)
	_ = s.mm.SetPending(ctx, userID, sess.ID)
	_ = s.mm.ClearIncomingCall(ctx, userID)
	_ = s.mm.RemoveMissedCall(ctx, userID, sess.ID.String())
	return s.matched(ctx, userID, sess)
}

func (s *Service) recordMissedCalls(ctx context.Context, endedBy uuid.UUID, sess Session) {
	for _, uid := range []uuid.UUID{sess.UserAID, sess.UserBID} {
		if uid == endedBy {
			continue
		}
		sid, caller, ok, err := s.mm.GetIncomingCall(ctx, uid)
		if err != nil || !ok || sid != sess.ID {
			continue
		}
		_ = s.mm.AddMissedCall(ctx, uid, sess.ID, caller)
	}
}

func (s *Service) incomingFor(ctx context.Context, userID uuid.UUID) (*IncomingCall, bool) {
	sessionID, caller, ok, err := s.mm.GetIncomingCall(ctx, userID)
	if err != nil || !ok {
		return nil, false
	}
	sess, err := s.repo.GetByID(ctx, sessionID)
	if err != nil || sess.Status != "active" || !sess.Involves(userID) {
		_ = s.mm.ClearIncomingCall(ctx, userID)
		return nil, false
	}
	return &IncomingCall{
		SessionID: sess.ID.String(),
		Partner:   s.lookupPartner(ctx, caller),
	}, true
}

func (s *Service) ringingCall(ctx context.Context, userID uuid.UUID, sess Session) (*IncomingCall, bool) {
	if _, ok, err := s.mm.GetPending(ctx, userID); err != nil || ok {
		return nil, false
	}
	partnerID := sess.PartnerID(userID)
	pending, ok, err := s.mm.GetPending(ctx, partnerID)
	if err != nil || !ok || pending != sess.ID {
		return nil, false
	}
	return &IncomingCall{
		SessionID: sess.ID.String(),
		Partner:   s.lookupPartner(ctx, partnerID),
	}, true
}

func (s *Service) livePending(ctx context.Context, userID uuid.UUID) (uuid.UUID, Session, bool, error) {
	pending, ok, err := s.mm.GetPending(ctx, userID)
	if err != nil || !ok {
		return uuid.Nil, Session{}, false, err
	}
	sess, err := s.repo.GetByID(ctx, pending)
	if err != nil || sess.Status != "active" {
		_ = s.mm.ClearPending(ctx, userID)
		return uuid.Nil, Session{}, false, nil
	}
	return pending, sess, true, nil
}

func (s *Service) matched(ctx context.Context, userID uuid.UUID, sess Session) (MatchResult, error) {
	out := MatchResult{Status: "matched", Session: &sess, SessionID: strPtr(sess.ID.String())}
	if partner := s.lookupPartner(ctx, sess.PartnerID(userID)); partner != nil {
		out.Partner = partner
	}
	return out, nil
}

func (s *Service) lookupPartner(ctx context.Context, id uuid.UUID) *Partner {
	if s.users == nil {
		return &Partner{ID: id, Username: "Partner"}
	}
	u, err := s.users.GetByID(ctx, id)
	if err != nil {
		return &Partner{ID: id, Username: "Partner"}
	}
	p := &Partner{ID: u.ID, Username: u.Username}
	if prof, err := s.users.GetProfile(ctx, id); err == nil {
		p.NativeLanguage = prof.NativeLanguage
		p.LearningLanguage = prof.LearningLanguage
	}
	return p
}

func strPtr(s string) *string { return &s }
