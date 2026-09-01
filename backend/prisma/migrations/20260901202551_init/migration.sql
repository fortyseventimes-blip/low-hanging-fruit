-- CreateEnum
CREATE TYPE "CareerStage" AS ENUM ('plateaued_senior', 'long_term_search', 'active_it');

-- CreateEnum
CREATE TYPE "AiCategory" AS ENUM ('delegation', 'mediated_via_prep', 'not_applicable', 'replacement');

-- CreateEnum
CREATE TYPE "BarrierType" AS ENUM ('education', 'certification', 'social_capital');

-- CreateEnum
CREATE TYPE "EvidenceSource" AS ENUM ('self_report', 'resume_nlp', 'exercise');

-- CreateEnum
CREATE TYPE "SignalType" AS ENUM ('demand_trend', 'salary', 'job_postings_count');

-- CreateEnum
CREATE TYPE "MonetizationEventType" AS ENUM ('affiliate_click', 'consult_booking');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "geo" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "role_current" TEXT NOT NULL,
    "experience_years" INTEGER NOT NULL,
    "resume_text" TEXT NOT NULL,
    "career_stage" "CareerStage" NOT NULL,
    "consented_scopes" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professions" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "ring_count" INTEGER NOT NULL DEFAULT 3,
    "source_taxonomy" TEXT NOT NULL,

    CONSTRAINT "professions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_domains" (
    "id" UUID NOT NULL,
    "profession_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,

    CONSTRAINT "skill_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" UUID NOT NULL,
    "domain_id" UUID NOT NULL,
    "ring_index" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "key_question" TEXT NOT NULL,
    "models" TEXT NOT NULL,
    "ai_speed_stars" INTEGER NOT NULL,
    "ai_quality_stars" INTEGER NOT NULL,
    "ai_quality_declining" BOOLEAN NOT NULL DEFAULT false,
    "ai_category" "AiCategory",
    "source" TEXT,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_connections" (
    "from_skill_id" UUID NOT NULL,
    "to_skill_id" UUID NOT NULL,

    CONSTRAINT "skill_connections_pkey" PRIMARY KEY ("from_skill_id","to_skill_id")
);

-- CreateTable
CREATE TABLE "role_profiles" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "geo" TEXT NOT NULL,

    CONSTRAINT "role_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_required_skills" (
    "role_profile_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "target_ring" INTEGER NOT NULL,

    CONSTRAINT "role_required_skills_pkey" PRIMARY KEY ("role_profile_id","skill_id")
);

-- CreateTable
CREATE TABLE "structural_barriers" (
    "id" UUID NOT NULL,
    "role_profile_id" UUID NOT NULL,
    "barrier_type" "BarrierType" NOT NULL,
    "prevalence_pct" DOUBLE PRECISION NOT NULL,
    "exception_pct" DOUBLE PRECISION NOT NULL,
    "is_hard_filter" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "structural_barriers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_skill_assessments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "self_rating" INTEGER,
    "inferred_rating" INTEGER,
    "evidence_source" "EvidenceSource" NOT NULL,
    "assessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_skill_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cohorts" (
    "id" UUID NOT NULL,
    "industry" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "geo" TEXT NOT NULL,
    "experience_band" TEXT NOT NULL,
    "sample_source" TEXT NOT NULL,
    "sample_size" INTEGER NOT NULL,

    CONSTRAINT "cohorts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cohort_skill_benchmarks" (
    "cohort_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "mean" DOUBLE PRECISION NOT NULL,
    "stddev" DOUBLE PRECISION NOT NULL,
    "percentile_distribution" JSONB NOT NULL,
    "data_source" TEXT NOT NULL,
    "freshness_window" INTEGER,
    "last_refreshed_at" TIMESTAMP(3),

    CONSTRAINT "cohort_skill_benchmarks_pkey" PRIMARY KEY ("cohort_id","skill_id")
);

-- CreateTable
CREATE TABLE "market_signals" (
    "id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "signal_type" "SignalType" NOT NULL,
    "value" JSONB NOT NULL,
    "source_url" TEXT NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL,
    "freshness_window" INTEGER NOT NULL,
    "stale_flag" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "market_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap_recommendations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "priority_rank" INTEGER NOT NULL,
    "rationale_text" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roadmap_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_ins" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "cohort_snapshot_ref" UUID NOT NULL,
    "delta_summary" TEXT NOT NULL,

    CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monetization_events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "event_type" "MonetizationEventType" NOT NULL,
    "target" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monetization_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "skill_domains_profession_id_order_index_key" ON "skill_domains"("profession_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "user_skill_assessments_user_id_skill_id_key" ON "user_skill_assessments"("user_id", "skill_id");

-- AddForeignKey
ALTER TABLE "skill_domains" ADD CONSTRAINT "skill_domains_profession_id_fkey" FOREIGN KEY ("profession_id") REFERENCES "professions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "skill_domains"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_connections" ADD CONSTRAINT "skill_connections_from_skill_id_fkey" FOREIGN KEY ("from_skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_connections" ADD CONSTRAINT "skill_connections_to_skill_id_fkey" FOREIGN KEY ("to_skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_required_skills" ADD CONSTRAINT "role_required_skills_role_profile_id_fkey" FOREIGN KEY ("role_profile_id") REFERENCES "role_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_required_skills" ADD CONSTRAINT "role_required_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "structural_barriers" ADD CONSTRAINT "structural_barriers_role_profile_id_fkey" FOREIGN KEY ("role_profile_id") REFERENCES "role_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_skill_assessments" ADD CONSTRAINT "user_skill_assessments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_skill_assessments" ADD CONSTRAINT "user_skill_assessments_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cohort_skill_benchmarks" ADD CONSTRAINT "cohort_skill_benchmarks_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cohort_skill_benchmarks" ADD CONSTRAINT "cohort_skill_benchmarks_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_recommendations" ADD CONSTRAINT "roadmap_recommendations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_recommendations" ADD CONSTRAINT "roadmap_recommendations_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monetization_events" ADD CONSTRAINT "monetization_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
