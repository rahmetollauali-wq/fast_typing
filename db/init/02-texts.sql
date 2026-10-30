-- Словари для режимов «Слова» и «На время»: RU и EN, три уровня сложности.
-- Осмысленные тексты и цитаты лежат в 03-more-texts.sql и 04-more-texts.sql.
-- В текстах нет букв «ё», длинных тире и «ёлочек»: их неудобно набирать.

INSERT INTO texts (language_id, difficulty_id, mode_id, body, author)
SELECT l.id, d.id, m.id, v.body, v.author
FROM (VALUES
-- ==================== СЛОВАРИ (режимы «Слова» и «На время») ====================
('en', 'easy', 'words',
 'the be to of and in that have it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us man old big long small great own life hand part place case week point home water room fact night eye end try ask need feel leave put mean keep let begin seem help talk turn start show hear play run move live hold bring',
 NULL),
('en', 'medium', 'words',
 'about above across action answer around became before began behind believe between brother building business certain change children company country course decide different during early either enough example family father follow friend garden general ground happen history however human important include interest island itself later learn letter little machine market matter member minute moment morning mother music nature never notice number office often order paper perhaps picture plant present problem produce question rather reason remember report result river school second several should simple something sound special spring station stand state still story student study surface system teacher thought through together toward travel under until usually village voice watch weather window without world young',
 NULL),
('en', 'hard', 'words',
 'absolutely acknowledge adventure algorithm ambiguous analysis appreciate approximately architecture atmosphere available beautiful boundary brilliant calendar category challenge character circumstance colleague committee communicate comparison complicated conscience consequence considerable curiosity definitely democracy dependent description development dictionary discipline efficiency electricity embarrass encyclopedia environment equipment especially exaggerate excellent experience explanation extraordinary fascinating foreign government guarantee hierarchy hypothesis immediately independent intelligence interrupt knowledge laboratory language library literature maintenance mathematics millennium necessary neighbour occasionally opportunity parliament particular perseverance phenomenon philosophy possession privilege psychology questionnaire recommend relationship responsibility rhythm schedule separate significant sophisticated strategy successful technology temperature thorough unnecessary vocabulary',
 NULL),
('ru', 'easy', 'words',
 'и в не на я он с что а по это она к но мы как из у то за вы так же от бы о для да ты все его вот дом мир день год раз сам там тут кто где лес сад сон чай мама папа рука нога окно стол стул кот пес река море небо луна свет звук путь друг дело слово вода хлеб снег дождь город поле гора сила новый старый белый синий тихо быстро рано поздно много мало ночь утро вечер книга школа лето зима весна осень время место люди жизнь голова глаз дверь брат сестра мост парк сыр суп мяч игра',
 NULL),
('ru', 'medium', 'words',
 'работа вопрос история машина дорога человек девочка комната учитель ученик страна правда сторона минута кровать картина музыка письмо деревня природа погода солнце облако ветер берег камень дерево цветок ягода молоко сахар магазин рынок завтра сегодня вчера всегда иногда никогда сначала потом почему потому думать говорить делать знать видеть писать читать слушать играть гулять бежать стоять сидеть лежать помнить любить хотеть искать находить начинать открыть закрыть красивый большой маленький хороший плохой важный главный трудный простой молодой высокий широкий длинный короткий интересный',
 NULL),
('ru', 'hard', 'words',
 'достопримечательность ответственность интеллектуальный преимущественно взаимодействие высокопоставленный электричество оборудование конфиденциальный самостоятельность благодарность возможность обстоятельство предприниматель государственный исследование представитель производительность распространение удовлетворение характеристика усовершенствование непосредственный последовательность профессиональный технологический демократический информационный администрация экономический философия психология литература математика архитектура лаборатория библиотека энциклопедия дисциплина конференция компьютерный программирование алгоритм переменная функциональный безопасность сотрудничество впечатление воображение достижение исключительный',
 NULL)
) AS v(lang, diff, mode, body, author)
JOIN languages    l ON l.code = v.lang
JOIN difficulties d ON d.code = v.diff
JOIN modes        m ON m.code = v.mode;
