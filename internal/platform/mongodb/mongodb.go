package mongodb

import (
	"context"
	"fmt"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"

	"lang-exchange/config"
)

func Connect(ctx context.Context, cfg config.MongoConfig) (*mongo.Client, *mongo.Database, error) {
	clientOpts := options.Client().
		ApplyURI(cfg.URL).
		SetConnectTimeout(15 * time.Second).
		SetServerSelectionTimeout(15 * time.Second)

	if strings.Contains(cfg.URL, "mongodb.net") || strings.HasPrefix(cfg.URL, "mongodb+srv://") {
		clientOpts.SetServerAPIOptions(options.ServerAPI(options.ServerAPIVersion1))
	}

	client, err := mongo.Connect(ctx, clientOpts)
	if err != nil {
		return nil, nil, fmt.Errorf("mongo connect: %w", err)
	}
	if err := client.Ping(ctx, readpref.Primary()); err != nil {
		_ = client.Disconnect(ctx)
		return nil, nil, fmt.Errorf("mongo ping: %w", err)
	}
	return client, client.Database(cfg.DB), nil
}
