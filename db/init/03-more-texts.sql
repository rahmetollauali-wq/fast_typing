-- Дополнительные осмысленные тексты для тренировки.
-- Выполняется автоматически при первом создании тома вместе с 01 и 02.
-- На уже существующей базе:
--   docker compose exec -T db psql -U fasttyping -d fasttyping \
--     -f /docker-entrypoint-initdb.d/03-more-texts.sql
-- Повторный запуск безопасен: одинаковые тексты не добавляются.
--
-- В текстах нет букв «ё», длинных тире и «ёлочек»: их неудобно набирать.

INSERT INTO texts (language_id, difficulty_id, mode_id, body, author)
SELECT l.id, d.id, m.id, v.body, v.author
FROM (VALUES
-- ==================== EN / EASY ====================
('en', 'easy', 'classic',
 'Every morning the old baker opens the shop before sunrise. The smell of fresh bread fills the street, and neighbors stop to say hello.',
 NULL),
('en', 'easy', 'classic',
 'Our school has a small garden behind the building. In spring the students plant tomatoes and flowers, and in summer they take turns watering them.',
 NULL),
('en', 'easy', 'classic',
 'The train leaves at eight, so we pack our bags the night before. We bring a map, a bottle of water, and a book for the long ride.',
 NULL),
('en', 'easy', 'classic',
 'A good friend listens when you are worried and celebrates when you succeed. Friendship grows from small acts of kindness.',
 NULL),
('en', 'easy', 'classic',
 'The museum is free on Sundays. Families come to see the old maps, listen to a short talk, and draw their favorite objects.',
 NULL),
('en', 'easy', 'quotes',
 'A journey of a thousand miles begins with a single step.',
 'Lao Tzu'),
('en', 'easy', 'quotes',
 'Knowledge is power.',
 'Francis Bacon'),
('en', 'easy', 'quotes',
 'Practice makes perfect.',
 'English proverb'),

-- ==================== EN / MEDIUM ====================
('en', 'medium', 'classic',
 'Small habits often shape our lives more than big decisions. Reading ten pages a day or walking for twenty minutes may seem minor, but over a year these choices add up.',
 NULL),
('en', 'medium', 'classic',
 'The city opened a new bicycle lane along the river last spring. Since then, more people ride to work, and the air near the road has become noticeably cleaner.',
 NULL),
('en', 'medium', 'classic',
 'When a team faces a difficult problem, the first step is to agree on the facts. Only then can members compare ideas and choose a plan that everyone understands.',
 NULL),
('en', 'medium', 'classic',
 'Many museums now offer virtual tours for people who cannot travel. Visitors can zoom in on paintings, listen to experts, and explore rooms that are usually closed to the public.',
 NULL),
('en', 'medium', 'classic',
 'A well-written letter does not need long words. It needs a clear purpose, a friendly tone, and enough detail to show that the writer cares about the reader.',
 NULL),
('en', 'medium', 'quotes',
 'Imagination is more important than knowledge.',
 'Albert Einstein'),
('en', 'medium', 'quotes',
 'The only true wisdom is in knowing you know nothing.',
 'Socrates'),
('en', 'medium', 'quotes',
 'Actions speak louder than words.',
 'English proverb'),

-- ==================== EN / HARD ====================
('en', 'hard', 'classic',
 'In the early 1970s, engineers began linking university computers into a single network. The system was modest at first, but it established the rules that later allowed the Internet to grow across continents.',
 NULL),
('en', 'hard', 'classic',
 'The restoration team spent 18 months cleaning the ceiling, repairing 240 square meters of plaster, and documenting every brushstroke before the gallery reopened to the public.',
 NULL),
('en', 'hard', 'classic',
 'Economists disagree about the causes of inflation, yet most agree that expectations matter: when people expect prices to rise, they often change their spending and wage demands, which can make the increase self-reinforcing.',
 NULL),
('en', 'hard', 'classic',
 'A healthy forest is not simply a collection of trees. It depends on fungi, insects, birds, and decaying wood, all of which recycle nutrients and help the ecosystem recover after storms or drought.',
 NULL),
('en', 'hard', 'classic',
 'The committee reviewed 120 applications, rejected 38 for missing documents, and invited the remaining candidates to a two-day workshop where they presented their proposals and answered questions.',
 NULL),
('en', 'hard', 'quotes',
 'Give me a place to stand, and I will move the Earth.',
 'Archimedes'),
('en', 'hard', 'quotes',
 'Waste no more time arguing what a good man should be. Be one.',
 'Marcus Aurelius'),
('en', 'hard', 'quotes',
 'The unexamined life is not worth living.',
 'Socrates'),

-- ==================== RU / EASY ====================
('ru', 'easy', 'classic',
 'Каждое утро пекарь открывает свою маленькую лавку еще до рассвета. Запах свежего хлеба чувствуется на всей улице, и соседи заходят поздороваться.',
 NULL),
('ru', 'easy', 'classic',
 'За школой есть небольшой сад. Весной ученики сажают помидоры и цветы, а летом по очереди поливают грядки.',
 NULL),
('ru', 'easy', 'classic',
 'Поезд уходит в восемь, поэтому мы собираем вещи с вечера. Берем карту, бутылку воды и книгу для долгой дороги.',
 NULL),
('ru', 'easy', 'classic',
 'Хороший друг выслушает, когда тебе тревожно, и порадуется, когда у тебя все получается. Дружба растет из небольших добрых дел.',
 NULL),
('ru', 'easy', 'classic',
 'По воскресеньям музей открыт бесплатно. Семьи приходят посмотреть старые карты, послушать короткий рассказ и нарисовать любимые предметы.',
 NULL),
('ru', 'easy', 'quotes',
 'Терпение и труд все перетрут.',
 'Пословица'),
('ru', 'easy', 'quotes',
 'Семь раз отмерь, один раз отрежь.',
 'Пословица'),
('ru', 'easy', 'quotes',
 'Утро вечера мудренее.',
 'Пословица'),

-- ==================== RU / MEDIUM ====================
('ru', 'medium', 'classic',
 'Маленькие привычки часто влияют на нашу жизнь сильнее, чем большие решения. Десять страниц книги в день или двадцать минут ходьбы кажутся мелочью, но за год эти выборы складываются в заметный результат.',
 NULL),
('ru', 'medium', 'classic',
 'Прошлой весной в городе открыли новую велодорожку вдоль реки. С тех пор больше людей ездят на работу на велосипеде, а воздух у дороги стал заметно чище.',
 NULL),
('ru', 'medium', 'classic',
 'Когда команда сталкивается с трудной задачей, сначала нужно договориться о фактах. Только после этого участники могут сравнить идеи и выбрать план, понятный каждому.',
 NULL),
('ru', 'medium', 'classic',
 'Многие музеи теперь проводят виртуальные экскурсии для тех, кто не может приехать. Посетители могут рассмотреть картины, послушать специалистов и заглянуть в залы, обычно закрытые для публики.',
 NULL),
('ru', 'medium', 'classic',
 'Хорошее письмо не требует длинных слов. Ему нужны ясная цель, дружелюбный тон и достаточно подробностей, чтобы читатель почувствовал заботу автора.',
 NULL),
('ru', 'medium', 'quotes',
 'Краткость - сестра таланта.',
 'Антон Чехов'),
('ru', 'medium', 'quotes',
 'Жизнь коротка, искусство вечно.',
 'Гиппократ'),
('ru', 'medium', 'quotes',
 'Дорогу осилит идущий.',
 'Пословица'),

-- ==================== RU / HARD ====================
('ru', 'hard', 'classic',
 'В начале 1970-х годов инженеры начали соединять университетские компьютеры в единую сеть. Сначала система была скромной, но именно она заложила правила, которые позже позволили Интернету охватить весь мир.',
 NULL),
('ru', 'hard', 'classic',
 'Реставраторы потратили 18 месяцев на очистку потолка, ремонт 240 квадратных метров штукатурки и описание каждого мазка, прежде чем галерея снова открылась для посетителей.',
 NULL),
('ru', 'hard', 'classic',
 'Экономисты спорят о причинах инфляции, но большинство согласны, что ожидания важны: когда люди ждут роста цен, они меняют расходы и требования к зарплате, и рост может усиливаться сам.',
 NULL),
('ru', 'hard', 'classic',
 'Здоровый лес - это не просто набор деревьев. Он зависит от грибов, насекомых, птиц и отмершей древесины, которые перерабатывают питательные вещества и помогают экосистеме восстановиться после бурь или засухи.',
 NULL),
('ru', 'hard', 'classic',
 'Комиссия рассмотрела 120 заявок, отклонила 38 из-за недостающих документов и пригласила остальных участников на двухдневный семинар, где они представили свои проекты и ответили на вопросы.',
 NULL),
('ru', 'hard', 'quotes',
 'Чтобы дойти до цели, надо прежде всего идти.',
 'Оноре де Бальзак'),
('ru', 'hard', 'quotes',
 'Кто хочет - ищет способ, кто не хочет - ищет причину.',
 'Сократ'),
('ru', 'hard', 'quotes',
 'Нет величия там, где нет простоты, добра и правды.',
 'Лев Толстой')
) AS v(lang, diff, mode, body, author)
JOIN languages    l ON l.code = v.lang
JOIN difficulties d ON d.code = v.diff
JOIN modes        m ON m.code = v.mode
WHERE NOT EXISTS (
    SELECT 1 FROM texts t
    WHERE t.language_id = l.id
      AND t.difficulty_id = d.id
      AND t.mode_id = m.id
      AND t.body = v.body
);
