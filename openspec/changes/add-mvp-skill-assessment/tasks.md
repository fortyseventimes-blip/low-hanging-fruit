## 1. Данные и БД
- [x] 1.1 Postgres-схема по `design.md` (User, Skill, SkillConnection,
      RoleProfile, StructuralBarrier, UserSkillAssessment, Cohort,
      CohortSkillBenchmark, RoadmapRecommendation + зарезервированные
      таблицы MarketSignal/CheckIn/MonetizationEvent)
- [x] 1.2 ETL: загрузка `PAF_Skill_Map_database.xlsx` → таблица `Skill` +
      `SkillConnection` (71 запись, уже подготовлено)
- [x] 1.3 ETL: Stack Overflow Developer Survey 2025 results.csv →
      `Cohort` + `CohortSkillBenchmark` (Cohort реален по industry +
      experience_band; per-skill benchmark — синтетическая заглушка, см.
      design.md → "Ключевые решения дизайна данных")
- [x] 1.4 Сид минимум одной `RoleProfile` со `StructuralBarrier` для
      пилотной проверки (напр. Product Analyst, Германия) —
      `backend/src/etl/seed-pilot-role.ts`, `npm run seed:pilot-role`.
      StructuralBarrier-проценты — редакционная оценка, не измерение:
      Entgeltatlas (см. references.md) не отдаёт разбивку по
      квалификационным уровням через статический фетч (JS SPA без
      публичного API), см. комментарий в файле сида

## 2. Backend
- [x] 2.1 Эндпоинт онбординга: создание `User` — `POST /users`
      (`backend/src/routes/users.ts`), верифицирован вручную (happy
      path, отсутствующее обязательное поле, неверный `careerStage`,
      дефолт `consentedScopes`); нет ещё БД для тестов — автоматического
      теста на маршрут пока нет
- [x] 2.2 Интеграция с Claude API: извлечение `UserSkillAssessment` из
      `resume_text` — `POST /users/:userId/skill-assessments/infer`
      (`backend/src/services/skill-extraction.ts`,
      `backend/src/routes/skill-assessments.ts`), Claude Sonnet 5 +
      structured output (`messages.parse` + Zod), indirect evidence
      capped at rating 3 (spec requirement, enforced in code not just
      prompt). Live-verified against the real Claude API with a sample
      resume — correct direct/indirect split, correctly omitted a skill
      the resume explicitly disclaimed. Doesn't overwrite an
      already-confirmed `self_report` assessment on re-run.
- [x] 2.3 Эндпоинт подтверждения/отклонения `inferred_rating` —
      `POST /users/:userId/skill-assessments/:skillId/confirm` (сдвигает
      в `self_report`, `self_rating = inferredRating`) и `.../reject`
      (удаляет запись — assessment-scoring и так исключает из расчёта
      разрыва любой неподтверждённый `resume_nlp`, хранить отклонённую
      запись незачем). Верифицировано вручную: confirm/reject happy
      path, confirm несуществующего → 404, reject уже подтверждённого
      (`self_report`) → 400, reject уже удалённого → 404
- [x] 2.4 Расчёт разрыва с когортой (`assessment-scoring` +
      `cohort-benchmarking` спеки) — `GET /users/:userId/cohort-gap`
      (`backend/src/services/cohort-scoring.ts`,
      `backend/src/routes/cohort-gap.ts`). Подбор когорты — industry
      точно + experience_band в допуске ±2 года, иначе ближайшая по
      industry с `approximate: true`. Разрыв считается только для
      подтверждённых (`self_rating`) навыков, неподтверждённые
      `inferred_rating` идут в `pendingConfirmation`, не в расчёт.
      Вынес `EXPERIENCE_BANDS`/`experienceBandFromYears` в общий
      `backend/src/lib/experience-bands.ts` (раньше жили только в ETL) —
      единый источник правды для границ полос между ETL и скорингом.
      Live-верифицировано на реальных когортах/бенчмарках из 1.3: точный
      расчёт разрыва, `pendingConfirmation` для неподтверждённого навыка,
      `cohort: null` для индустрии без когорт, 404 для несуществующего
      пользователя
- [x] 2.5 Генерация `RoadmapRecommendation` (1–3 навыка) через Claude API
      — `POST /users/:userId/roadmap`
      (`backend/src/services/roadmap-recommendation.ts`,
      `backend/src/routes/roadmap.ts`). Кандидаты — навыки с `gap < 0`
      (отставание от когорты), никогда `ai_category = replacement`;
      ранжирование — устойчивость к ИИ (`not_applicable` >
      сеньорское кольцо с `ai_quality_stars >= 3` > остальное), внутри
      уровня — по величине отставания. Rationale — Claude Opus 5
      (README: "Opus для тяжёлого когортного анализа", в отличие от
      Sonnet в 2.2). Live-верифицировано: `not_applicable`-навык с
      меньшим отставанием обошёл `delegation`-навык с большим; навык с
      САМЫМ большим отставанием из всех (`replacement`) корректно
      исключён из рекомендаций.

Раздел 2 (Backend) завершён.

## 3. Frontend
- [x] 3.1 Онбординг-форма (≤ 7 минут, см. дизайн-бриф: Onboarding Stepper)
      — `frontend/src/components/OnboardingFlow.tsx` +
      `OnboardingStepper.tsx`, 4 линейных шага (about you / where are
      you / career stage / resume+consent), без промежуточного
      сохранения на сервере — один `POST /users` на финальном шаге.
      Consent smapped на `consentedScopes: ["resume_analysis"]`
      (email/LinkedIn OAuth ещё не реализованы, фиктивные scope'ы не
      добавлял). Live-верифицировано в браузере (Playwright): Continue/
      Done задизейблены до заполнения обязательных полей каждого шага,
      Back сохраняет ранее введённые данные, форма доходит до экрана
      успеха. По пути нашёл и исправил реальный баг — на бэкенде не
      было CORS, браузерный preflight на `POST /users` падал в 404
      (`@fastify/cors`, добавлено в `backend/src/index.ts`)
- [x] 3.2 Компонент SkillNode (см. дизайн-бриф) —
      `frontend/src/components/SkillNode.tsx` + `AIImpactBadge.tsx`
      (обязательный под-элемент §1, отдельного пункта в tasks.md не
      было). Круглый узел-иконка, 4 состояния из брифа (не оценено /
      ниже когорты / выше когорты +1 SD / требует подтверждения),
      состояние выводится чистой функцией `deriveSkillNodeState`
      (`frontend/src/lib/skill-node.ts`, 7 тестов, включая граничное
      значение +1 SD). Клик по AIImpactBadge — однострочное пояснение,
      не модалка. Добавил `vitest` во frontend (тестов не было).
      Визуально верифицировано в браузере (Playwright, временный
      preview в App.tsx, возвращён обратно перед коммитом) — все 4
      состояния и 4 цвета ai_category различимы, попап пояснения
      работает
- [x] 3.3 Компонент SkillMap (радиальная раскладка секторы × кольца) —
      `frontend/src/components/SkillMap.tsx` + чистые геометрические
      функции `frontend/src/lib/skill-map-geometry.ts` (11 тестов),
      формулы `angle = 360°/domain_count * order_index` /
      `radius = R_max * ring_index/ring_count` из design.md, конвертация
      полярных координат в проценты через `d3.pointRadial` (уже была в
      зависимостях, до этого неиспользуемая). `domainCount`/`ringCount`
      приходят пропсами от `Profession`, ни одного захардкоженного числа
      градусов/колец в коде рендера — по требованию spec skill-map
      ("Попытка захардкодить угол сектора"). Атрибуция источника — из
      `Profession.sourceTaxonomy`, не захардкожена под PM. Визуально
      верифицировано в браузере (Playwright, временный preview в App.tsx,
      возвращён обратно перед коммитом) на моковых 6×3 (PM-дефолт):
      секторные подписи не наезжают на узлы (анкеринг текста "от центра
      наружу", а не по центру луча), нет обрезки по краю контейнера,
      попап AIImpactBadge внутри карты по-прежнему работает, консоль
      браузера чистая. ConnectionLine (визуализация `SkillConnection` +
      hover-подсветка) — отдельный пункт 3.4, здесь не реализован.
- [x] 3.4 Компонент ConnectionLine с hover-подсветкой —
      `frontend/src/components/ConnectionLine.tsx` (SVG `<line>`, 3
      визуальных состояния: default/active/passed из дизайн-брифа §3) +
      чистая логика в `frontend/src/lib/skill-connections.ts`
      (`buildSkillAdjacency`, `isSkillMuted`,
      `isConnectionActive`/`isConnectionMuted`, `connectionVisualState`,
      13 тестов). Наведение — на узел (`onMouseEnter`/`onMouseLeave` в
      `SkillMap`, не в самом `SkillNode`, чтобы тот оставался чистым
      презентационным компонентом); `SkillMap` хранит `hoveredSkillId` и
      прокидывает приглушение (`opacity-25`) на все несвязанные узлы и
      линии. Цвет активной/пройденной линии — домен ИСТОЧНИКА
      (`fromSkillId`), не домен наведённого узла, как в брифе. "Путь
      пройден" (оба конца `above_cohort`) даёт устойчивое свечение уже
      без наведения. Визуально верифицировано в браузере (Playwright,
      временный preview с `connections` в App.tsx, возвращён обратно):
      воспроизвёл ровно сценарий спеки — наведение на узел с 3 связями
      подсвечивает все 3 линии (каждая цветом своего домена-источника) и
      узлы, все остальные узлы и линии гаснут; consoles чистая.
- [x] 3.5 Компонент CohortMarker —
      `frontend/src/components/CohortMarker.tsx` + чистые функции
      `frontend/src/lib/cohort-marker.ts` (`percentileFromRating` —
      normal(mean, stddev) через erf-аппроксимацию CDF, `positionPct` —
      клампинг значения на шкалу, 10 тестов). Горизонтальная шкала-
      гистограмма (НЕ спидометр, по прямому запрету в брифе), затемнённая
      область среднее±1 SD, вертикальная отметка "ты здесь" — emerald,
      тот же цвет что и `above_cohort` в `SkillNode` (не геймификация,
      просто переиспользование уже устоявшегося "выше когорты" акцента).
      Процентиль при ровно +1 SD даёт 84% — сверено с тем же порогом,
      что использует `deriveSkillNodeState` для `above_cohort` (тест это
      явно фиксирует). `approximate` — необязательный проп под пометку
      "приблизительное сравнение" из cohort-benchmarking spec
      (ближайшая по индустрии когорта), рендерится приглушённым текстом
      рядом с процентилем, не отдельным баннером. Без лиг/таблиц
      лидеров — по явному запрету брифа. Визуально верифицировано в
      браузере (Playwright, временный preview в App.tsx, возвращён
      обратно перед коммитом): above/at/below-cohort варианты, approximate-
      пометка, и граничный случай (рейтинг на краю шкалы, полоса
      среднее±SD выходит за границу) — клампинг корректно останавливает
      полосу и метку у края контейнера, ничего не переполняется; консоль
      браузера чистая.
- [x] 3.6 Компонент StructuralBarrierCallout —
      `frontend/src/components/StructuralBarrierCallout.tsx` + чистая
      функция `frontend/src/lib/structural-barrier.ts`
      (`buildStructuralBarrierCopy`, 3 теста на структуру и формулировку
      двух обязательных предложений). Тон намеренно нейтральный —
      slate/sky фон, иконка "i" в кружке, НЕ красный/жёлтый (единственный
      компонент со специальным требованием "не выглядеть как ошибка", по
      брифу §5). `exception_pct` всегда в том же блоке (один `<p>`), не
      отдельной строкой ниже — факт про распространённость барьера и
      контрбаланс идут одним предложением за другим, второе чуть
      приглушённым цветом, но не мельче шрифтом и не в отдельном
      элементе. Формулировка credential/counterbalance зависит от
      `barrier_type` (`education`/`certification`/`social_capital`) —
      три разных сценария в тестах и в визуальной проверке. Не рендерит
      `is_hard_filter` отдельно — по design.md это поле фиксирует
      продуктовое решение (почти всегда `false`), не переключатель вида
      UI, спека не описывает отдельного визуального состояния для него.
      Визуально верифицировано в браузере (Playwright, временный preview
      в App.tsx, возвращён обратно перед коммитом) на всех трёх типов
      барьера — текст и тон корректны, консоль браузера чистая.
- [x] 3.7 Компонент RecommendationCard —
      `frontend/src/components/RecommendationCard.tsx`, без отдельного
      lib-модуля (в отличие от 3.3–3.6, тут нет нетривиальной чистой
      логики, достойной вынесения и тестов — компонент просто
      раскладывает уже готовые пропсы: `rationaleText` уже сгенерирован
      Claude на бэкенде, задача 2.5). Переиспользует `AIImpactBadge` как
      мини-версию (тот же компонент, без изменений — бриф просит именно
      "мини-версию AIImpactBadge", не отдельный визуал). CTA — обычная
      `<a>` на `resourceUrl` (`target="_blank" rel="noreferrer"`), без
      партнёрских query-параметров/трекинга — монетизация явно вне
      скоупа MVP (proposal.md). Замечание: `POST /users/:userId/roadmap`
      (2.5) пока не возвращает `aiCategory`/`aiQualityDeclining` навыка
      в ответе (только `skillName`) и в БД нет поля под `resourceUrl` —
      компонент принимает их как пропсы и готов к использованию, но
      экран, который его монтирует, должен будет либо расширить этот
      эндпоинт, либо джойнить `Skill` на фронте; это не входило в скоуп
      3.7 (только компонент). Визуально верифицировано в браузере
      (Playwright, временный preview в App.tsx, возвращён обратно перед
      коммитом) на 3 карточках с разными `ai_category` — текст, бейдж и
      рабочая CTA-ссылка (проверены `href`/`target`/`rel`) корректны,
      консоль браузера чистая.

Раздел 3 (Frontend) завершён.

## 3.8 (доп., вне исходной нумерации) Сборка экрана дашборда
Не было отдельным пунктом в исходном плане — компоненты 3.2–3.7 существовали
изолированно (каждый верифицирован превью-моками), но ничего не собирало их
в реальный экран после онбординга (`App.tsx` показывал заглушку). По запросу
собрал реальный пост-онбординг экран на живых данных.
- Новый эндпоинт `GET /users/:userId/dashboard`
  (`backend/src/routes/dashboard.ts`) — агрегирует профессию/домены/навыки/
  связи (глобальный каталог — сейчас в БД ровно одна `Profession`, так что
  отдавать его per-user здесь дешевле второго похода на бэкенд), оценки
  пользователя, бенчмарки ПОДОБРАННОЙ когорты (`selectCohort` из 2.4,
  переиспользован как есть) — с `mean` И `stddev` (в отличие от
  `cohort-gap`, который отдаёт только `mean`, `stddev` нужен `CohortMarker`),
  структурные барьеры, отфильтрованные по `industry`+`geo` пользователя
  (specs/onboarding), и уже сгенерированные `RoadmapRecommendation` (читает
  из БД, сам Claude не вызывает — регенерация остаётся за существующим
  `POST /roadmap`).
- `OnboardingFlow.handleSubmit` теперь вызывает
  `POST /skill-assessments/infer` сразу после создания пользователя — иначе
  дашборд открывался бы полностью неоценённым для каждого нового
  пользователя. Вызов gated на `form.consented` (тот самый чекбокс "I
  consent to this text being analyzed") и best-effort (`.catch(() => {})`)
  — сбой инференса не должен блокировать переход на дашборд.
- `frontend/src/components/Dashboard.tsx` — фетчит `/dashboard`, считает
  `SkillNodeState` через уже протестированный `deriveSkillNodeState` (3.2)
  на фронте (бэкенд отдаёт сырые `assessment`/`benchmark`, не готовое
  состояние), и раскладывает `SkillMap` + `StructuralBarrierCallout[]` +
  (`RecommendationCard` + `CohortMarker`) пары под заголовком "Your next
  steps". `resourceUrl` для CTA — построен на фронте как обычная ссылка на
  поиск по названию навыка (без партнёрских параметров) — БД не хранит
  `resourceUrl` на `RoadmapRecommendation`, это осознанный простейший
  вариант для MVP, не пропущенная интеграция.
- **Важная находка от реальных данных**: превью-моки для 3.3/3.4 всегда
  клали ровно 1 навык на пару (domain, ring), из-за чего формула
  `angle(domain) × radius(ring)` никогда не давала двум узлам одну и ту же
  точку. Реальный каталог — нет: до 7 навыков делят одну ячейку (напр.
  "Development & Delivery" / ring 2). По буквальной формуле из design.md
  это буквально одна и та же точка на карте — узлы садились друг на друга.
  Исправлено в `skill-map-geometry.ts` двумя рендер-only добавками (сама
  формула `angle = 360°/domain_count × order_index` /
  `radius = R_max × ring_index/ring_count` не тронута, число в спеке
  по-прежнему не хардкожено):
  - `skillAngleDegrees`/`RingGroupPosition` — веерно разводит навыков,
    делящих (domain, ring), по узкому сектору вокруг угла домена;
  - `skillRadiusJitter` — чередует лёгкое смещение внутрь/наружу для
    плотных ячеек (шахматкой), чтобы не выстраивались в одну линию;
  - `innerRadiusFraction` в `skillPosition` — сдвигает ВСЕ кольца наружу от
    центра одной аффинной заменой (кольцо 1 иначе получает меньше всего
    места на дугу для веера — оно ближе к центру).
  8 новых тестов на эту логику (49 всего во frontend).
- Контейнер карты расширен `max-w-2xl` → `max-w-4xl` — превью-размер был
  откалиброван на моковых 18 узлах, не на реальных 71.
- **Живая E2E-верификация** (Playwright, реальный backend на реальной БД —
  1 `Profession`, 71 `Skill`, 70 `Cohort`, 4970 `CohortSkillBenchmark`,
  пилотная `RoleProfile` "Product Analyst"/Germany из 1.4): прошёл
  настоящую онбординг-форму (не моки) → реальный `POST /users` → реальный
  дашборд с реальными 71 узлом, верно подобранной когортой (`approximate:
  false`) и обоими структурными барьерами роли. `ANTHROPIC_API_KEY` в
  `.env` оказался невалиден (401) — окружение, не регрессия: инференс/
  роадмап (уже живо верифицированы в 2.2/2.5) сегодня повторно не
  перепроверял через реальный Claude; вместо этого напрямую засеял
  представительные `UserSkillAssessment`/`RoadmapRecommendation` (тем же
  кодом `selectCohort`/`computeCohortGaps`/`selectRoadmapCandidates` из
  2.4/2.5, только `generateRationales` заменён фиксированной строкой) —
  подтвердил заполненный путь: закрашенные/оценённые узлы на карте,
  `RecommendationCard` + `CohortMarker` под "Your next steps" с верным
  процентилем (напр. self_rating=2 против mean=3.27/stddev=0.83 → "Above
  6% of the cohort", сходится вручную). Все временные скрипты и тестовые
  `User`-записи удалены после проверки — пилотная БД (4.1) осталась чистой
  (`users: 0`).
- **Известное ограничение (частично уменьшено доп. проходом)**: в самых
  плотных ячейках (7 навыков) подписи/AI-бейджи изначально визуально
  теснились, хотя сами узлы-кружки уже не накладывались друг на друга
  буквально (это и было критичным багом). Доп. проход по `skill-map-
  geometry.ts` заметно уменьшил тесноту: `skillRadiusJitter` теперь
  раскладывает плотную ячейку по 3 полосам вместо 2 (`countInRing > 4` →
  3 полосы, чередование `[-1, 0, 1] × jitterUnit` вместо простого
  зигзага), плюс контейнер карты расширен `max-w-4xl` → `max-w-6xl`
  (в `SkillMap.tsx` и `Dashboard.tsx`). 2 новых теста на 3-полосное
  разведение (50 всего во frontend). Не устранено полностью — это
  фундаментальное следствие плотности реальных данных (до 7 навыков на
  ячейку), не осталось расчётной ошибки; дальнейшее сжатие (напр. zoom/
  pan на ещё большем холсте, скрытие подписей до наведения) — отдельная,
  более крупная задача дизайна, не входила в объём этого прохода.
  Truncate+tooltip на именах — по-прежнему осознанное решение из 3.2
  ("при плотности 71+ узлов подписывать все постоянно избыточно"), нигде
  не менялось. Визуально перепроверено в браузере (тот же живой E2E-путь
  через реальный онбординг) — заметно чище, чем до правки; заодно
  подтвердил, что смущавшая на скриншоте светящаяся линия связи была
  артефактом курсора Playwright (застрял на позиции клика по "Done"), не
  багом — исчезла после явного `mouse.move` в сторону.

## 3.9 (доп.) Confirm/reject UI для `pending_confirmation`
При подготовке к пилоту (4.1) обнаружился реальный блокер: бэкенд из 2.3
(`POST .../confirm`, `POST .../reject`) никогда не был подключён ни к
одному экрану — `SkillNode` только рисовал состояние "?", кликнуть по
нему было нельзя. Метрика 4.2 ("% пользователей, подтвердивших хотя бы
один неожиданный inferred_rating") без этого физически не измерима через
приложение.
- `frontend/src/api/client.ts` — добавлены `confirmSkillAssessment` /
  `rejectSkillAssessment`.
- `frontend/src/components/PendingConfirmationCard.tsx` — новый
  компонент: имя навыка, key_question, инференс-рейтинг, кнопки "Yes,
  that's right" / "Not accurate". Сознательно НЕ кликабельный узел на
  карте — список для ревью навыков явно лучше подходит для "просмотри и
  подтверди N штук", чем поиск пунктирных кружков среди 71 узла.
- `Dashboard.tsx` — секция "Confirm what we inferred from your resume"
  над "Worth knowing" (список навыков, где `assessment.selfRating ===
  null && assessment.inferredRating !== null`, то же условие что и
  `pending_confirmation` в `deriveSkillNodeState`); после действия —
  полный рефетч `/dashboard` (не оптимистичный патч состояния), проще и
  надёжнее для MVP-объёма. `busySkillIds`/`pendingActionError` —
  на-элемент индикатор загрузки и общая ошибка секции.
- Живо верифицировано (Playwright + реальный backend/БД): создал
  пользователя через реальный онбординг, напрямую засеял 2
  `pending_confirmation` навыка (тот же обход Claude-вызова, что и в
  3.8), нажал "Yes, that's right" на одном и "Not accurate" на другом.
  Проверил ОБА конца — и UI (карточки пропали из списка, узел на карте
  сменился с пунктирного "?" на закрашенный/сплошной для подтверждённого
  и обратно на серый/заблокированный для отклонённого), и БД напрямую
  (`UserSkillAssessment`): подтверждённый навык →
  `selfRating=4, evidenceSource=self_report` (соответствует 2.3);
  отклонённый навык → строка удалена целиком (соответствует 2.3). Тестовый
  `User` и все временные скрипты удалены после проверки.

## 4. Проверка гипотезы
- [ ] 4.1 Пилот на 10–15 пользователях целевого сегмента
- [ ] 4.2 Метрика: % пользователей, подтвердивших хотя бы один
      "неожиданный" `inferred_rating" как точный
