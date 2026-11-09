PHP ?= php
ARTISAN = $(PHP) artisan

.PHONY: install up down test seed migrate fresh key bash

install:
	composer install
	@test -f .env || cp .env.example .env
	$(ARTISAN) key:generate
	$(ARTISAN) migrate --seed

up:
	docker compose up -d --build

down:
	docker compose down

test:
	$(ARTISAN) test

seed:
	$(ARTISAN) db:seed

migrate:
	$(ARTISAN) migrate

fresh:
	$(ARTISAN) migrate:fresh --seed

key:
	$(ARTISAN) key:generate

bash:
	docker compose exec app bash
