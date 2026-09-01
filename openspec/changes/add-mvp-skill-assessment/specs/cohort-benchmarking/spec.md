## ADDED Requirements

### Requirement: Пользователь сравнивается только с валидной когортой
Система SHALL находить `Cohort` по совпадению `industry` + `experience_band`
(± 2 года) пользователя; если такой когорты нет — SHALL показывать
ближайшую по индустрии когорту с явной пометкой, что срез приблизительный.

#### Scenario: Точное совпадение когорты найдено
- **WHEN** есть `Cohort` с тем же `industry` и `experience_band`,
  покрывающим опыт пользователя
- **THEN** сравнение строится по этой когорте без предупреждений

#### Scenario: Точного совпадения нет
- **WHEN** нет когорты с подходящим `experience_band`
- **THEN** используется ближайшая когорта по индустрии и интерфейс
  показывает пометку "приблизительное сравнение"

### Requirement: Разрыв с когортой считается только по подтверждённым навыкам
Система SHALL исключать из расчёта `CohortSkillBenchmark`-разрыва любой
`UserSkillAssessment`, где `inferred_rating` не подтверждён и `self_rating`
отсутствует.

#### Scenario: Есть self_rating
- **WHEN** `UserSkillAssessment.self_rating` не пусто
- **THEN** разрыв с когортой считается как
  `self_rating - CohortSkillBenchmark.mean`

#### Scenario: Есть только неподтверждённый inferred_rating
- **WHEN** `self_rating` пусто и `inferred_rating` не подтверждён
- **THEN** этот навык помечается как "требует подтверждения" и не входит
  в расчёт для `RoadmapRecommendation`
