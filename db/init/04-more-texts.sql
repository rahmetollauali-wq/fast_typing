-- Еще один набор осмысленных текстов и цитат.
-- Выполняется автоматически при первом создании тома после 02 и 03.
-- На уже существующей базе:
--   docker compose exec -T db psql -U fasttyping -d fasttyping \
--     -f /docker-entrypoint-initdb.d/04-more-texts.sql
-- Повторный запуск безопасен: одинаковые тексты не добавляются.
--
-- В текстах нет букв «ё», длинных тире и «ёлочек»: их неудобно набирать.

INSERT INTO texts (language_id, difficulty_id, mode_id, body, author)
SELECT l.id, d.id, m.id, v.body, v.author
FROM (VALUES
-- ==================== EN / EASY ====================
('en', 'easy', 'classic',
 'The library has a reading room with big windows. On rainy days, children sit there with picture books while their parents choose novels.',
 NULL),
('en', 'easy', 'classic',
 'We keep a small box of seeds in the kitchen. Every spring we plant a few herbs on the balcony and use them when we cook.',
 NULL),
('en', 'easy', 'classic',
 'The bus stops in front of the hospital. A driver helps passengers with bags, and an old man always thanks him before he leaves.',
 NULL),
('en', 'easy', 'classic',
 'My sister learns new words by writing them on small cards. She reviews five cards each morning and ten more before bed.',
 NULL),
('en', 'easy', 'classic',
 'The park has a pond with ducks and a path around it. People walk there after work, and in summer they sit on the grass.',
 NULL),
('en', 'easy', 'quotes',
 'Honesty is the best policy.',
 'English proverb'),
('en', 'easy', 'quotes',
 'Where there is a will, there is a way.',
 'English proverb'),
('en', 'easy', 'quotes',
 'A friend in need is a friend indeed.',
 'English proverb'),

-- ==================== EN / MEDIUM ====================
('en', 'medium', 'classic',
 'A good map does more than show distance. It tells you where the roads are steep, where water is available, and which towns have a place to rest.',
 NULL),
('en', 'medium', 'classic',
 'The workshop teaches students how to repair bicycles. They learn to fix a chain, adjust the brakes, and check the tires before every ride.',
 NULL),
('en', 'medium', 'classic',
 'When the power went out, the neighbors shared candles and flashlights. By the end of the evening, everyone on the street knew each other a little better.',
 NULL),
('en', 'medium', 'classic',
 'A balanced diet is not about strict rules. It is about variety, regular meals, and enough water, along with the occasional treat that makes life pleasant.',
 NULL),
('en', 'medium', 'classic',
 'The company moved its office closer to the station. Employees now spend less time commuting, and many of them walk or cycle to work.',
 NULL),
('en', 'medium', 'quotes',
 'The pen is mightier than the sword.',
 'Edward Bulwer-Lytton'),
('en', 'medium', 'quotes',
 'No act of kindness, no matter how small, is ever wasted.',
 'Aesop'),
('en', 'medium', 'quotes',
 'The best way to predict the future is to invent it.',
 'Alan Kay'),

-- ==================== EN / HARD ====================
('en', 'hard', 'classic',
 'The archive contains more than 12,000 letters, photographs, and notebooks. Historians have digitized a third of the collection, but the fragile papers still require careful handling and stable humidity.',
 NULL),
('en', 'hard', 'classic',
 'Urban planners face a familiar conflict: wider roads reduce congestion for a few years, but they can also encourage more cars, which eventually fills the new capacity and restores the old delays.',
 NULL),
('en', 'hard', 'classic',
 'The telescope was designed to operate in extreme cold. Its mirrors are heated only enough to prevent frost, while the instruments are shielded from sunlight by a series of reflective panels.',
 NULL),
('en', 'hard', 'classic',
 'A reliable supply chain depends on redundancy. When one supplier fails, a second source can keep production moving, even if the replacement parts cost more in the short term.',
 NULL),
('en', 'hard', 'classic',
 'The novel follows three generations of a family, moving between a coastal village and a growing industrial city, and asks how much of the past a person can carry without losing the future.',
 NULL),
('en', 'hard', 'quotes',
 'The fault, dear Brutus, is not in our stars, but in ourselves, that we are underlings.',
 'William Shakespeare'),
('en', 'hard', 'quotes',
 'All the world''s a stage, and all the men and women merely players.',
 'William Shakespeare'),
('en', 'hard', 'quotes',
 'The whole is greater than the sum of its parts.',
 'Aristotle'),

-- ==================== RU / EASY ====================
('ru', 'easy', 'classic',
 'В библиотеке есть светлый читальный зал. В дождливые дни дети сидят там с книжками с картинками, а родители выбирают романы.',
 NULL),
('ru', 'easy', 'classic',
 'На кухне у нас стоит небольшая коробка с семенами. Каждую весну мы сажаем зелень на балконе и используем ее, когда готовим.',
 NULL),
('ru', 'easy', 'classic',
 'Автобус останавливается у больницы. Водитель помогает пассажирам с сумками, а один пожилой мужчина всегда благодарит его перед выходом.',
 NULL),
('ru', 'easy', 'classic',
 'Сестра учит новые слова с помощью маленьких карточек. Она повторяет пять карточек утром и еще десять перед сном.',
 NULL),
('ru', 'easy', 'classic',
 'В парке есть пруд с утками и дорожка вокруг него. Люди гуляют там после работы, а летом сидят на траве.',
 NULL),
('ru', 'easy', 'quotes',
 'Без труда не выловишь и рыбку из пруда.',
 'Пословица'),
('ru', 'easy', 'quotes',
 'Тише едешь, дальше будешь.',
 'Пословица'),
('ru', 'easy', 'quotes',
 'Не имей сто рублей, а имей сто друзей.',
 'Пословица'),

-- ==================== RU / MEDIUM ====================
('ru', 'medium', 'classic',
 'Хорошая карта показывает не только расстояние. По ней видно, где дорога идет в гору, где можно набрать воды и в каком городе стоит остановиться на отдых.',
 NULL),
('ru', 'medium', 'classic',
 'В мастерской учат ремонтировать велосипеды. Ученики меняют цепь, регулируют тормоза и проверяют шины перед каждой поездкой.',
 NULL),
('ru', 'medium', 'classic',
 'Когда погас свет, соседи поделились свечами и фонариками. К концу вечера все на улице знали друг друга немного лучше.',
 NULL),
('ru', 'medium', 'classic',
 'Сбалансированное питание - это не строгие правила. Это разнообразие, регулярные приемы пищи и достаточное количество воды, а иногда и небольшое угощение, которое делает жизнь приятнее.',
 NULL),
('ru', 'medium', 'classic',
 'Компания переехала в офис ближе к вокзалу. Сотрудники теперь тратят меньше времени на дорогу, и многие ходят на работу пешком или ездят на велосипеде.',
 NULL),
('ru', 'medium', 'quotes',
 'Слово не воробей, вылетит - не поймаешь.',
 'Пословица'),
('ru', 'medium', 'quotes',
 'Век живи - век учись.',
 'Пословица'),
('ru', 'medium', 'quotes',
 'Знание - сила.',
 'Фрэнсис Бэкон'),

-- ==================== RU / HARD ====================
('ru', 'hard', 'classic',
 'В архиве хранится более 12 000 писем, фотографий и записных книжек. Историки оцифровали треть коллекции, но хрупкие бумаги по-прежнему требуют бережного обращения и стабильной влажности.',
 NULL),
('ru', 'hard', 'classic',
 'Градостроители сталкиваются с известным противоречием: широкие дороги на несколько лет уменьшают пробки, но могут привлечь больше машин, и в итоге новый поток снова заполняет освободившееся место.',
 NULL),
('ru', 'hard', 'classic',
 'Телескоп рассчитан на работу в сильный холод. Его зеркала нагреваются ровно настолько, чтобы не покрываться инеем, а приборы защищены от солнца рядом отражающих панелей.',
 NULL),
('ru', 'hard', 'classic',
 'Надежная цепочка поставок строится на дублировании. Если один поставщик подводит, второй источник помогает не останавливать производство, даже если заменяющие детали стоят дороже в короткий срок.',
 NULL),
('ru', 'hard', 'classic',
 'Роман рассказывает о трех поколениях одной семьи, перенося читателя из приморской деревни в растущий промышленный город, и спрашивает, сколько прошлого человек может нести, не теряя будущего.',
 NULL),
('ru', 'hard', 'quotes',
 'Умом Россию не понять, аршином общим не измерить.',
 'Федор Тютчев'),
('ru', 'hard', 'quotes',
 'Слово - дело великое.',
 'Лев Толстой'),
('ru', 'hard', 'quotes',
 'Правда и красота всегда составляли главное в человеческой жизни.',
 'Антон Чехов')
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
