## 1. Данные и БД
- [x] 1.1 Postgres-схема по `design.md` (User, Skill, SkillConnection,
      RoleProfile, StructuralBarrier, UserSkillAssessment, Cohort,
      CohortSkillBenchmark, RoadmapRecommendation + зарезервированные
      таблицы MarketSignal/CheckIn/MonetizationEvent)
- [x] 1.2 ETL: загрузка `PAF_Skill_Map_database.xlsx` → таблица `Skill` +
      `SkillConnection` (71 запись, уже подготовлено)
- [ ] 1.3 ETL: Stack Overflow Developer Survey 2025 results.csv →
      `Cohort` + `CohortSkillBenchmark`
- [ ] 1.4 Сид минимум одной `RoleProfile` со `StructuralBarrier` для
      пилотной проверки (напр. Product Analyst, Германия)

## 2. Backend
- [ ] 2.1 Эндпоинт онбординга: создание `User`
- [ ] 2.2 Интеграция с Claude API: извлечение `UserSkillAssessment` из
      `resume_text`
- [ ] 2.3 Эндпоинт подтверждения/отклонения `inferred_rating`
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
