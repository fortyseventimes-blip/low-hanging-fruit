# Design: MVP-ассессмент навыков

## Архитектура (высокоуровнево)

```
[React SPA] ──HTTP──▶ [Node API] ──▶ [PostgreSQL]
                            │
                            ├─▶ [Кэш-слой / freshness window] ──▶ [MCP-источники]
                            │      (вне скоупа MVP, контракт зафиксирован)
                            │
                            └─▶ [Claude API] — интерпретация резюме/текста
                                   при онбординге, генерация rationale
                                   для roadmap-рекомендаций
```

На MVP агентный слой (правая нижняя ветка с MCP) не вызывается вживую —
`CohortSkillBenchmark` и `MarketSignal` заполняются один раз ETL-скриптом
из Stack Overflow Survey 2025. Контракт таблиц и API уже рассчитан на
последующую замену "разового расчёта" на "живой вызов с кэшем", чтобы не
переписывать схему во второй итерации.

## Сущности (Entities)

### User
Профиль человека, прошедшего онбординг.
| Поле | Тип | Описание |
|---|---|---|
| id | uuid | PK |
| name | string | |
| geo | string | страна, для формальных требований рынка |
| industry | string | |
| role_current | string | текущая роль |
| experience_years | int | |
| resume_text | text | сырой текст резюме/о себе |
| career_stage | enum | `plateaued_senior` \| `long_term_search` \| `active_it` |
| consented_scopes | string[] | какие данные разрешено использовать (email, LinkedIn и т.д.) |
| created_at | timestamp | |

### Profession
Единица, за которой закреплена своя таксономия навыков — так продукт
остаётся применим к любой профессии, не только к PM (см. исходное
продуктовое решение: "сканер, а не вакансия").
| Поле | Тип | Описание |
|---|---|---|
| id | uuid | PK |
| name | string | напр. "Product Management", "Маркетинг", "Продажи" |
| ring_count | int | число уровней зрелости для ЭТОЙ профессии (по умолчанию 3, но не зашито жёстко — источники вроде референса созвездий показывают структуры с другой глубиной) |
| source_taxonomy | string | атрибуция источника, напр. "PAF Skill Map (CC BY-SA 4.0), адаптировано" |

### SkillDomain
Заменяет прежний хардкод `Skill.sector` как fixed enum на 6 значений PM.
Один домен = один "сектор" на плоской карте / одно "созвездие" на
звёздной карте.
| Поле | Тип | Описание |
|---|---|---|
| id | uuid | PK |
| profession_id | uuid → Profession | |
| name | string | напр. "Discovery & Researches" для PM, "Реклама и трафик" для маркетинга |
| color | string | hex, используется и в узле, и в подписи созвездия |
| order_index | int | позиция по кругу — угол вычисляется как `360° / N_доменов_этой_профессии * order_index`, не зашитые 60° |

### Skill (обновлено)
| Поле | Тип | Описание |
|---|---|---|
| id | uuid | PK |
| domain_id | uuid → SkillDomain | было `sector: enum` — теперь ссылка на данные, не код |
| ring_index | int (1..Profession.ring_count) | было `ring: enum(junior/middle/senior)` — теперь порядковый номер, чтобы профессия с другим числом уровней не требовала менять схему |
| name, key_question, models, ai_speed_stars, ai_quality_stars, ai_quality_declining, ai_category, source | — | без изменений, см. предыдущую версию |

### SkillConnection
Ребро графа — какой навык предшествует какому.
| Поле | Тип |
|---|---|
| from_skill_id | uuid → Skill |
| to_skill_id | uuid → Skill |

### RoleProfile
Целевая роль на рынке (не привязана к одному навыку — сканер применим к
разным ролям, не только "продакт").
| Поле | Тип | Описание |
|---|---|---|
| id | uuid | PK |
| title | string | |
| industry | string | |
| geo | string | |
| required_skills | (skill_id, target_ring)[] | |

### StructuralBarrier
Не-скилловый барьер входа в роль (см. product decision: не фильтр, а
статистический фактор).
| Поле | Тип | Описание |
|---|---|---|
| id | uuid | PK |
| role_profile_id | uuid → RoleProfile | |
| barrier_type | enum | `education` \| `certification` \| `social_capital` (нетворк/публичные выступления) |
| prevalence_pct | float | доля людей в роли, обладающих барьером (по статистике, напр. Agentur für Arbeit) |
| exception_pct | float | доля людей БЕЗ барьера, всё равно занимающих роль — обязательное поле, показывается как обнадёживающий сигнал |
| is_hard_filter | bool | почти всегда `false` — фиксирует продуктовое решение не пугать пользователя |

### UserSkillAssessment
Оценка конкретного навыка у конкретного пользователя.
| Поле | Тип | Описание |
|---|---|---|
| id | uuid | PK |
| user_id | uuid → User | |
| skill_id | uuid → Skill | |
| self_rating | int 1–5 \| null | |
| inferred_rating | int 1–5 \| null | извлечено из резюме/текста через Claude |
| evidence_source | enum | `self_report` \| `resume_nlp` \| `exercise` |
| assessed_at | timestamp | |

### Cohort
Срез для сравнения.
| Поле | Тип | Описание |
|---|---|---|
| id | uuid | PK |
| industry | string | |
| role | string | |
| geo | string | |
| experience_band | string | напр. "5-10 лет" |
| sample_source | string | "Stack Overflow Developer Survey 2025" на MVP |
| sample_size | int | |

### CohortSkillBenchmark
Агрегат по навыку внутри когорты.
| Поле | Тип | Описание |
|---|---|---|
| cohort_id | uuid → Cohort | |
| skill_id | uuid → Skill | |
| mean | float | |
| stddev | float | |
| percentile_distribution | jsonb | |
| data_source | string | |
| freshness_window | interval | на MVP не используется (статичный расчёт), поле зарезервировано |
| last_refreshed_at | timestamp | |

### MarketSignal *(контракт на будущее, вне скоупа MVP-реализации)*
| Поле | Тип | Описание |
|---|---|---|
| subject_id | uuid | skill_id или role_profile_id |
| signal_type | enum | `demand_trend` \| `salary` \| `job_postings_count` |
| value | jsonb | |
| source_url | string | |
| fetched_at | timestamp | |
| freshness_window | interval | тренды — 7 дней, зарплаты — 30 дней |
| stale_flag | bool | true если `fetched_at` > 6 месяцев назад |

### RoadmapRecommendation
| Поле | Тип | Описание |
|---|---|---|
| id | uuid | PK |
| user_id | uuid → User | |
| skill_id | uuid → Skill | |
| priority_rank | int | |
| rationale_text | string | генерируется Claude на основе разрыва с когортой + ai_category навыка |
| generated_at | timestamp | |

### CheckIn *(контракт на будущее, вне скоупа MVP-реализации)*
| Поле | Тип |
|---|---|
| user_id | uuid → User |
| scheduled_at | timestamp |
| cohort_snapshot_ref | uuid |
| delta_summary | text |

### MonetizationEvent *(контракт на будущее, вне скоупа MVP-реализации)*
| Поле | Тип |
|---|---|
| user_id | uuid → User |
| event_type | enum `affiliate_click` \| `consult_booking` |
| target | string |
| occurred_at | timestamp |

## Ключевые решения дизайна данных
- **Размещение колец и секторов универсально для любой профессии.**
  Angle и radius узла — чистые функции от данных профессии, без
  спецкейсов под PM:
  - `angle(domain) = 360° / Profession.domain_count * SkillDomain.order_index`
  - `radius(skill) = cluster_radius * Skill.ring_index / Profession.ring_count`
  Это значит: PM с 6 доменами и 3 кольцами и, например, маркетинг с 17
  доменами (см. референс созвездий) рендерятся ОДНИМ и тем же кодом —
  меняются только строки в `SkillDomain`/`Profession`, не логика
  рендера. Раньше (см. `design-brief-ui-elements.md` до правки) кольцо
  считалось "локально внутри каждого созвездия" интуитивно, без явной
  формулы, привязанной к числу колец конкретной профессии — это и было
  ошибкой, зафиксированной пользователем.
- `StructuralBarrier.is_hard_filter` намеренно почти всегда `false` и
  всегда идёт в паре с `exception_pct` — это прямое отражение продуктового
  решения не превращать формальные требования в приговор.
- `ai_quality_declining` — отдельное bool-поле, а не просто "0 звёзд",
  потому что семантически это другое: снижение, а не отсутствие качества
  (см. находку по карточке "Приоритизация беклога для передачи в
  разработку" в PAF Skill Map).
- `MarketSignal`, `CheckIn`, `MonetizationEvent` включены в схему сейчас,
  но не реализуются в MVP — чтобы вторая итерация не требовала миграции
  существующих таблиц, только добавления логики поверх них.
