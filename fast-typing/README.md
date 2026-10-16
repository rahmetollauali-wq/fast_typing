# Fast Typing

Веб-тренажёр скорости и точности печати.

## Структура

```
fast-typing/
├── docker-compose.yml   # три контейнера: frontend, backend, db
├── .env.example         # шаблон переменных окружения
├── frontend/            # React + Vite, порт 5173
├── backend/             # Node.js + Express, порт 3000
└── db/init/             # SQL-схема, выполняется при первом запуске БД
```

## Запуск

```bash
cp .env.example .env        # на Windows: copy .env.example .env
docker compose up --build
```

| Что | Адрес |
| --- | --- |
| Приложение | http://localhost:5173 |
| API (проверка) | http://localhost:3000/api/health |
| PostgreSQL | localhost:5432 |

## Полезные команды

| Команда | Что делает |
| --- | --- |
| `docker compose up -d` | Запустить в фоне |
| `docker compose down` | Остановить (данные сохраняются) |
| `docker compose down -v` | Остановить и удалить БД (схема создастся заново) |
| `docker compose logs -f backend` | Логи backend |
| `docker compose exec db psql -U fasttyping -d fasttyping` | Консоль базы данных |
| `docker compose up --build` | Пересобрать после изменения package.json |
