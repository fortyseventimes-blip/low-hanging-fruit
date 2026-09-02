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
- [ ] 2.4 Расчёт разрыва с когортой (`assessment-scoring` +
      `cohort-benchmarking` спеки)
- [ ] 2.5 Генерация `RoadmapRecommendation` (1–3 навыка) через Claude API

## 3. Frontend
- [ ] 3.1 Онбординг-форма (≤ 7 минут, см. дизайн-бриф: Onboarding Stepper)
- [ ] 3.2 Компонент SkillNode (см. дизайн-бриф)
- [ ] 3.3 Компонент SkillMap (радиальная раскладка секторы × кольца)
- [ ] 3.4 Компонент ConnectionLine с hover-подсветкой
- [ ] 3.5 Компонент CohortMarker
- [ ] 3.6 Компонент StructuralBarrierCallout
- [ ] 3.7 Компонент RecommendationCard

## 4. Проверка гипотезы
- [ ] 4.1 Пилот на 10–15 пользователях целевого сегмента
- [ ] 4.2 Метрика: % пользователей, подтвердивших хотя бы один
      "неожиданный" `inferred_rating" как точный
