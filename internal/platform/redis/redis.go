package redisx

import (
	"context"
	"crypto/tls"
	"fmt"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"

	"lang-exchange/config"
)

func Connect(ctx context.Context, cfg config.RedisConfig) (*redis.Client, error) {
	opt, err := redis.ParseURL(cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("redis url: %w", err)
	}
	opt.ReadTimeout = 3 * time.Second
	opt.WriteTimeout = 3 * time.Second
	if strings.HasPrefix(cfg.URL, "rediss://") && opt.TLSConfig == nil {
		opt.TLSConfig = &tls.Config{MinVersion: tls.VersionTLS12}
	}
	client := redis.NewClient(opt)
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("redis ping: %w", err)
	}
	return client, nil
}
