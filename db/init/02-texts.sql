-- Наполнение базы текстами: RU и EN, три уровня сложности.
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
 NULL),

-- ==================== КЛАССИЧЕСКИЙ РЕЖИМ (и «Без ошибок») ====================
('en', 'easy', 'classic', 'the sun was warm and the sky was blue so we took a long walk by the river and talked about our plans for the week', NULL),
('en', 'easy', 'classic', 'my cat likes to sleep on the bed all day and then run around the house at night when everyone else wants to rest', NULL),
('en', 'easy', 'classic', 'we made a big pot of soup and shared it with our friends who came over to help us paint the old fence in the garden', NULL),
('en', 'medium', 'classic', 'Typing fast is a skill that grows with regular practice. Focus on accuracy first, and the speed will follow naturally over time.', NULL),
('en', 'medium', 'classic', 'The library was quiet in the morning, so she found a table by the window and spent two hours reading about the history of the city.', NULL),
('en', 'medium', 'classic', 'Good habits are built in small steps. A few minutes of daily effort often matter more than one long session every other week.', NULL),
('en', 'hard', 'classic', 'In 1969, roughly 600 million people watched the first Moon landing; it remains one of the most widely shared moments in human history.', NULL),
('en', 'hard', 'classic', 'The committee reviewed 47 proposals, rejected 31 of them, and asked the remaining teams to submit revised budgets by March 15.', NULL),
('en', 'hard', 'classic', 'Sophisticated algorithms can analyze enormous datasets, but their conclusions are only as reliable as the assumptions behind them.', NULL),
('ru', 'easy', 'classic', 'утром мы пошли в парк и долго гуляли у реки а потом сели на лавку и смотрели как птицы летают над водой', NULL),
('ru', 'easy', 'classic', 'мой брат любит читать книги про море и мечтает когда нибудь стать капитаном большого белого корабля', NULL),
('ru', 'easy', 'classic', 'зимой в нашем городе много снега и дети каждый день лепят снеговиков и катаются с горы на санках', NULL),
('ru', 'medium', 'classic', 'Быстрая печать - это навык, который развивается регулярной практикой. Сначала следите за точностью, а скорость придет сама.', NULL),
('ru', 'medium', 'classic', 'В библиотеке было тихо, поэтому она выбрала стол у окна и два часа читала об истории старого города.', NULL),
('ru', 'medium', 'classic', 'Хорошие привычки складываются из маленьких шагов. Несколько минут каждый день значат больше, чем одно долгое занятие раз в месяц.', NULL),
('ru', 'hard', 'classic', 'В 1961 году Юрий Гагарин облетел Землю за 108 минут; этот полет стал одним из важнейших событий в истории человечества.', NULL),
('ru', 'hard', 'classic', 'Комиссия рассмотрела 47 заявок, отклонила 31 из них и попросила остальные команды прислать исправленные сметы до 15 марта.', NULL),
('ru', 'hard', 'classic', 'Современные алгоритмы обрабатывают огромные массивы данных, но их выводы надежны ровно настолько, насколько верны исходные предположения.', NULL),

-- ==================== ЦИТАТЫ ====================
('en', 'easy',   'quotes', 'Well done is better than well said.', 'Benjamin Franklin'),
('en', 'easy',   'quotes', 'The secret of getting ahead is getting started.', 'Mark Twain'),
('en', 'medium', 'quotes', 'It does not matter how slowly you go as long as you do not stop.', 'Confucius'),
('en', 'medium', 'quotes', 'An investment in knowledge pays the best interest.', 'Benjamin Franklin'),
('en', 'hard',   'quotes', 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', 'Will Durant'),
('en', 'hard',   'quotes', 'Do not wait to strike till the iron is hot, but make it hot by striking.', 'William Butler Yeats'),
('ru', 'easy',   'quotes', 'Ученье свет, а неученье тьма.', 'Пословица'),
('ru', 'easy',   'quotes', 'Москва не сразу строилась.', 'Пословица'),
('ru', 'medium', 'quotes', 'Мы в ответе за тех, кого приручили.', 'Антуан де Сент-Экзюпери'),
('ru', 'medium', 'quotes', 'Счастлив тот, кто счастлив у себя дома.', 'Лев Толстой'),
('ru', 'hard',   'quotes', 'Все счастливые семьи похожи друг на друга, каждая несчастливая семья несчастлива по-своему.', 'Лев Толстой'),
('ru', 'hard',   'quotes', 'В человеке должно быть все прекрасно: и лицо, и одежда, и душа, и мысли.', 'Антон Чехов')
) AS v(lang, diff, mode, body, author)
JOIN languages    l ON l.code = v.lang
JOIN difficulties d ON d.code = v.diff
JOIN modes        m ON m.code = v.mode;
