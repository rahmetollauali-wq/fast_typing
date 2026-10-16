-- Схема БД Fast Typing (8 таблиц из ER-диаграммы).
-- Выполняется автоматически ОДИН раз — при первом создании тома db-data.

CREATE TABLE users (
    id             SERIAL PRIMARY KEY,
    login          VARCHAR(20)  NOT NULL UNIQUE,
    password_hash  VARCHAR(100) NOT NULL,
    role           VARCHAR(10)  NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_blocked     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
    id          SERIAL PRIMARY KEY,
    user_id     INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(100) NOT NULL,
    expires_at  TIMESTAMPTZ  NOT NULL
);

CREATE TABLE modes (
    id              SERIAL PRIMARY KEY,
    code            VARCHAR(20) NOT NULL UNIQUE,
    name            VARCHAR(50) NOT NULL,
    in_leaderboard  BOOLEAN     NOT NULL DEFAULT TRUE
);

CREATE TABLE languages (
    id    SERIAL PRIMARY KEY,
    code  VARCHAR(5)  NOT NULL UNIQUE,
    name  VARCHAR(30) NOT NULL
);

CREATE TABLE difficulties (
    id    SERIAL PRIMARY KEY,
    code  VARCHAR(10) NOT NULL UNIQUE,
    name  VARCHAR(30) NOT NULL
);

CREATE TABLE texts (
    id             SERIAL PRIMARY KEY,
    language_id    INT     NOT NULL REFERENCES languages(id),
    difficulty_id  INT     NOT NULL REFERENCES difficulties(id),
    mode_id        INT     NOT NULL REFERENCES modes(id),
    body           TEXT    NOT NULL,
    author         VARCHAR(100),
    is_active      BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE attempts (
    id             SERIAL PRIMARY KEY,
    user_id        INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mode_id        INT          NOT NULL REFERENCES modes(id),
    language_id    INT          NOT NULL REFERENCES languages(id),
    difficulty_id  INT          NOT NULL REFERENCES difficulties(id),
    text_id        INT          REFERENCES texts(id),
    custom_text    TEXT,
    wpm            NUMERIC(6,2) NOT NULL CHECK (wpm >= 0),
    accuracy       NUMERIC(5,2) NOT NULL CHECK (accuracy BETWEEN 0 AND 100),
    errors         INT          NOT NULL DEFAULT 0,
    duration_ms    INT          NOT NULL,
    quality_score  NUMERIC(6,2) NOT NULL CHECK (quality_score >= 0),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    -- ровно одно из полей: текст из базы или свой текст
    CHECK ((text_id IS NULL) <> (custom_text IS NULL))
);

CREATE TABLE personal_records (
    user_id        INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mode_id        INT          NOT NULL REFERENCES modes(id),
    language_id    INT          NOT NULL REFERENCES languages(id),
    difficulty_id  INT          NOT NULL REFERENCES difficulties(id),
    attempt_id     INT          NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
    quality_score  NUMERIC(6,2) NOT NULL,
    PRIMARY KEY (user_id, mode_id, language_id, difficulty_id)
);

CREATE INDEX idx_attempts_user_date ON attempts (user_id, created_at DESC);
CREATE INDEX idx_records_leaderboard ON personal_records (mode_id, language_id, difficulty_id, quality_score DESC);

-- ---------- Справочники ----------
INSERT INTO modes (code, name, in_leaderboard) VALUES
    ('classic', 'Классический', TRUE),
    ('time',    'На время',     TRUE),
    ('words',   'Слова',        TRUE),
    ('quotes',  'Цитаты',       TRUE),
    ('noerror', 'Без ошибок',   TRUE),
    ('custom',  'Свой текст',   FALSE);

INSERT INTO languages (code, name) VALUES
    ('ru', 'Русский'),
    ('en', 'English');

INSERT INTO difficulties (code, name) VALUES
    ('easy',   'Лёгкий'),
    ('medium', 'Средний'),
    ('hard',   'Сложный');

-- ---------- Пара текстов для проверки ----------
INSERT INTO texts (language_id, difficulty_id, mode_id, body) VALUES
    (1, 2, 1, 'Быстрая печать — это навык, который развивается регулярной практикой.'),
    (2, 2, 1, 'Typing fast is a skill that grows with regular practice.');
