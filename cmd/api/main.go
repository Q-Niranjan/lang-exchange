package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"lang-exchange/config"
	"lang-exchange/internal/auth"
	"lang-exchange/internal/chat"
	"lang-exchange/internal/friend"
	"lang-exchange/internal/httpserver"
	"lang-exchange/internal/notify"
	"lang-exchange/internal/payment"
	"lang-exchange/internal/platform/mongodb"
	pg "lang-exchange/internal/platform/postgres"
	redisx "lang-exchange/internal/platform/redis"
	"lang-exchange/internal/practice"
	"lang-exchange/internal/rating"
	"lang-exchange/internal/user"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	ctx := context.Background()

	if err := pg.Migrate(cfg.Postgres.DSN(), envOr("MIGRATIONS_PATH", "migrations")); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	pool, err := pg.Connect(ctx, cfg.Postgres)
	if err != nil {
		log.Fatalf("postgres: %v", err)
	}
	defer pool.Close()

	rdb, err := redisx.Connect(ctx, cfg.Redis)
	if err != nil {
		log.Fatalf("redis: %v", err)
	}
	defer rdb.Close()

	chatStore, cleanupChat, err := newChatStore(ctx, cfg)
	if err != nil {
		log.Fatalf("chat store: %v", err)
	}
	defer cleanupChat()

	userRepo := user.NewRepository(pool)
	userSvc := user.NewService(userRepo)
	userH := user.NewHandler(userSvc)

	otp := auth.NewOTPStore(rdb, cfg.OTP.TTL, cfg.OTP.Length, cfg.OTP.Master)
	tokens := auth.NewTokenStore(rdb)
	jwt := auth.NewJWT(cfg.JWT.AccessSecret, cfg.JWT.RefreshSecret, cfg.JWT.AccessTTL, cfg.JWT.RefreshTTL)
	authSvc := auth.NewService(userRepo, otp, tokens, jwt, auth.NewSMSSender(cfg.OTP))
	authH := auth.NewHandler(authSvc)

	practiceRepo := practice.NewRepository(pool)
	mm := practice.NewMatchmaker(rdb)
	signals := practice.NewSignalHub()
	hub := chat.NewHub()
	friendRepo := friend.NewRepository(pool)
	practiceSvc := practice.NewService(practiceRepo, mm, signals, userRepo, hub, friendRepo)
	practiceH := practice.NewHandler(practiceSvc, signals)

	ratingRepo := rating.NewRepository(pool)
	ratingSvc := rating.NewService(ratingRepo, practiceRepo)
	ratingH := rating.NewHandler(ratingSvc)

	if err := chatStore.EnsureIndexes(ctx); err != nil {
		log.Fatalf("chat indexes: %v", err)
	}
	chatSvc := chat.NewService(chatStore, practiceRepo, userRepo, mm, hub)
	chatH := chat.NewHandler(chatSvc, mm)
	friendH := friend.NewHandler(friendRepo, practiceRepo, userRepo, mm)
	notifyH := notify.NewHandler(chatSvc, practiceSvc, mm, userRepo)

	gw := payment.NewGateway(cfg.Payment)
	payRepo := payment.NewRepository(pool)
	paySvc := payment.NewService(cfg.Payment, cfg.App.BaseURL, payRepo, userRepo, gw)
	payH := payment.NewHandler(paySvc, cfg.App.Env)

	router := httpserver.NewRouter(httpserver.Deps{
		Auth:     authH,
		JWT:      jwt,
		Tokens:   tokens,
		Users:    userH,
		UserRepo: userRepo,
		Practice: practiceH,
		Rating:   ratingH,
		Chat:     chatH,
		Friends:  friendH,
		Notify:   notifyH,
		Payment:  payH,
		Redis:    rdb,
	})

	srv := &http.Server{
		Addr:              ":" + cfg.App.Port,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("api listening on :%s (chat=mongo gateway=cashfree env=%s)",
			cfg.App.Port, cfg.App.Env)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutdownCtx)
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func newChatStore(ctx context.Context, cfg *config.Config) (chat.Store, func(), error) {
	mongoClient, mongoDB, err := mongodb.Connect(ctx, cfg.Mongo)
	if err != nil {
		return nil, nil, err
	}
	return chat.NewRepository(mongoDB), func() {
		_ = mongoClient.Disconnect(context.Background())
	}, nil
}
