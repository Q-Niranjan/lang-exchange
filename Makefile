GO ?= $(wildcard .tools/go/bin/go)
ifeq ($(GO),)
GO := go
endif

.PHONY: run web tidy docker-up docker-down docker-all

run:
	$(GO) run ./cmd/api

web:
	cd web && npm run dev

tidy:
	$(GO) mod tidy

docker-up:
	docker compose up -d postgres mongo redis

docker-down:
	docker compose down

docker-all:
	docker compose up --build
