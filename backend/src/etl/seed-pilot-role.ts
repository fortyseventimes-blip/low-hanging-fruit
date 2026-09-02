import "dotenv/config";
import { prisma } from "../lib/prisma.js";
import { PROFESSION_NAME } from "./paf-skills-transform.js";

// Единственная пилотная RoleProfile для проверки гипотезы (задача 1.4,
// tasks.md), не производственные данные о вакансиях.
const ROLE_TITLE = "Product Analyst";
const ROLE_INDUSTRY = "Software Development";
const ROLE_GEO = "Germany";

// target_ring — требуемый уровень навыка ДЛЯ ЭТОЙ РОЛИ, не то же самое,
// что Skill.ring_index (собственная классификация навыка по PAF). Подбор
// вручную под профиль "Product Analyst": сильный акцент на Discovery и
// Growth/Experiments (измерение, гипотезы, эксперименты), лёгкое
// касание Value Design/Delivery/Sales — аналитик не отвечает за них
// полноценно, но должен понимать контекст.
const REQUIRED_SKILLS: ReadonlyArray<{ name: string; targetRing: number }> = [
  { name: "Мониторинг показателей продукта", targetRing: 2 },
  { name: "Сбор и обработка обратной связи от клиентов / пользователей", targetRing: 2 },
  { name: "Анализ причин изменений показателей продукта и бизнеса", targetRing: 3 },
  { name: "Качественный анализ поведения потребителей", targetRing: 2 },
  { name: "Формирование системы метрик", targetRing: 3 },
  { name: "Формулирование гипотез", targetRing: 2 },
  { name: "Оценка и сравнение идей", targetRing: 2 },
  { name: "Проведение экспериментов", targetRing: 3 },
  { name: "Организация процесса проведения экспериментов", targetRing: 2 },
  { name: "Выявление потребностей", targetRing: 1 },
  { name: "Анализ альтернативных решений", targetRing: 2 },
  { name: "Формирование беклога", targetRing: 1 },
  { name: "Анализ объема рынка", targetRing: 2 },
  { name: "Анализ конкурентов", targetRing: 2 },
];

// StructuralBarrier: попытка найти реальную разбивку по квалификационным
// уровням именно для этой роли в Entgeltatlas Bundesagentur für Arbeit
// (см. references.md) не удалась — это JS SPA без публичного API,
// недоступный статическому фетчу. Единственная реальная цифра, которую
// удалось подтвердить — общероссийская... точнее общегерманская base
// rate по ВСЕЙ занятости, не по роли: 21% занятых, подлежащих соц.
// страхованию, в Германии имеют высшее образование (Statistik der
// Bundesagentur für Arbeit, отчёт "Akademiker/-innen", 2025,
// https://statistik.arbeitsagentur.de/DE/Navigation/Statistiken/Themen-im-Fokus/Berufe/Akademikerinnen/Allgemeiner-Teil-Nav.html).
// Аналитические/продуктовые роли — белые воротнички с более высокой
// концентрацией дипломов, чем экономика в целом, поэтому 21% использовать
// напрямую нельзя. Ниже — редакционная оценка для пилота, ЯВНО не
// измеренная величина; помечено в комментарии и в структуре кода (не в
// БД — схема не хранит источник текстом на уровне записи), заменить на
// точную Entgeltatlas-разбивку по Berufskennziffer, когда появится
// доступ к их API или ручной выгрузке.
const STRUCTURAL_BARRIERS: ReadonlyArray<{
  barrierType: "education" | "certification" | "social_capital";
  prevalencePct: number;
  exceptionPct: number;
}> = [
  // Оценка, не измерение (см. комментарий выше) — образование
  { barrierType: "education", prevalencePct: 68, exceptionPct: 32 },
  // Оценка, не измерение — доступ к роли через нетворк/публичные
  // выступления вместо формального пути (реферальный найм, комьюнити)
  { barrierType: "social_capital", prevalencePct: 40, exceptionPct: 60 },
];

async function main() {
  const profession = await prisma.profession.findFirst({ where: { name: PROFESSION_NAME } });
  if (!profession) {
    throw new Error(`Profession "${PROFESSION_NAME}" not found — run "npm run etl:paf" first.`);
  }

  const skillIdByName = new Map<string, string>();
  const skills = await prisma.skill.findMany({
    where: { domain: { professionId: profession.id } },
    select: { id: true, name: true },
  });
  for (const skill of skills) skillIdByName.set(skill.name, skill.id);

  const missing = REQUIRED_SKILLS.filter((r) => !skillIdByName.has(r.name));
  if (missing.length > 0) {
    throw new Error(`Unknown skill name(s): ${missing.map((m) => m.name).join(", ")}`);
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.roleProfile.findFirst({
      where: { title: ROLE_TITLE, industry: ROLE_INDUSTRY, geo: ROLE_GEO },
    });
    if (existing) {
      console.log(`Wiping existing "${ROLE_TITLE}" (${ROLE_GEO}) role profile for a clean reload...`);
      await tx.structuralBarrier.deleteMany({ where: { roleProfileId: existing.id } });
      await tx.roleRequiredSkill.deleteMany({ where: { roleProfileId: existing.id } });
      await tx.roleProfile.delete({ where: { id: existing.id } });
    }

    const role = await tx.roleProfile.create({
      data: { title: ROLE_TITLE, industry: ROLE_INDUSTRY, geo: ROLE_GEO },
    });

    for (const { name, targetRing } of REQUIRED_SKILLS) {
      await tx.roleRequiredSkill.create({
        data: { roleProfileId: role.id, skillId: skillIdByName.get(name)!, targetRing },
      });
    }

    for (const barrier of STRUCTURAL_BARRIERS) {
      await tx.structuralBarrier.create({
        data: {
          roleProfileId: role.id,
          barrierType: barrier.barrierType,
          prevalencePct: barrier.prevalencePct,
          exceptionPct: barrier.exceptionPct,
          isHardFilter: false,
        },
      });
    }

    console.log(
      `Seeded RoleProfile "${ROLE_TITLE}" (${ROLE_GEO}) with ${REQUIRED_SKILLS.length} required skills and ${STRUCTURAL_BARRIERS.length} structural barriers.`,
    );
  });

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
