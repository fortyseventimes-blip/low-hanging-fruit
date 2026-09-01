import "dotenv/config";
import path from "node:path";
import ExcelJS from "exceljs";
import { prisma } from "../lib/prisma.js";
import {
  PROFESSION_NAME,
  SKILL_DOMAIN_ORDER,
  aiCategoryFromLabel,
  dedupeUndirectedPairs,
  isAiQualityDeclining,
  parseConnectionNames,
  ringIndexFromLabel,
} from "./paf-skills-transform.js";

interface RawSkillRow {
  rowNumber: number;
  name: string;
  sector: string;
  ringLabel: string;
  keyQuestion: string;
  models: string;
  aiSpeedStars: number;
  aiQualityStars: number;
  aiCategoryLabel: string | null;
  connectionsRaw: string | null;
}

async function readSkillRows(filePath: string): Promise<RawSkillRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error(`No worksheet found in ${filePath}`);
  }

  const rows: RawSkillRow[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // header

    const cell = (col: number) => row.getCell(col).text?.trim() ?? "";
    const name = cell(2);
    if (!name) return; // trailing blank row guard

    const aiSpeedStars = Number(cell(7));
    const aiQualityStars = Number(cell(8));
    if (Number.isNaN(aiSpeedStars) || Number.isNaN(aiQualityStars)) {
      throw new Error(`Row ${rowNumber} ("${name}"): non-numeric AI star rating`);
    }

    rows.push({
      rowNumber,
      name,
      sector: cell(3),
      ringLabel: cell(4),
      keyQuestion: cell(5),
      models: cell(6),
      aiSpeedStars,
      aiQualityStars,
      aiCategoryLabel: cell(9) || null,
      connectionsRaw: cell(10) || null,
    });
  });
  return rows;
}

async function main() {
  const filePath = path.resolve(import.meta.dirname, "../../../data/PAF_Skill_Map_database.xlsx");
  const rows = await readSkillRows(filePath);
  console.log(`Read ${rows.length} skill rows from ${filePath}`);

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.profession.findFirst({ where: { name: PROFESSION_NAME } });
      if (existing) {
        console.log(`Wiping existing "${PROFESSION_NAME}" data for a clean reload...`);
        await tx.skillConnection.deleteMany({
          where: { fromSkill: { domain: { professionId: existing.id } } },
        });
        await tx.skill.deleteMany({ where: { domain: { professionId: existing.id } } });
        await tx.skillDomain.deleteMany({ where: { professionId: existing.id } });
        await tx.profession.delete({ where: { id: existing.id } });
      }

      const profession = await tx.profession.create({
        data: {
          name: PROFESSION_NAME,
          ringCount: 3,
          sourceTaxonomy: "PAF Skill Map (Сергей Тихомиров, productframework.ru), CC BY-SA 4.0, адаптировано",
        },
      });

      const domainIdByName = new Map<string, string>();
      for (const [orderIndex, domain] of SKILL_DOMAIN_ORDER.entries()) {
        const created = await tx.skillDomain.create({
          data: {
            professionId: profession.id,
            name: domain.name,
            color: domain.color,
            orderIndex,
          },
        });
        domainIdByName.set(domain.name, created.id);
      }

      const skillIdByName = new Map<string, string>();
      for (const row of rows) {
        const domainId = domainIdByName.get(row.sector);
        if (!domainId) {
          throw new Error(`Row ${row.rowNumber} ("${row.name}"): unknown sector "${row.sector}"`);
        }
        if (skillIdByName.has(row.name)) {
          throw new Error(`Row ${row.rowNumber}: duplicate skill name "${row.name}"`);
        }

        const created = await tx.skill.create({
          data: {
            domainId,
            ringIndex: ringIndexFromLabel(row.ringLabel),
            name: row.name,
            keyQuestion: row.keyQuestion,
            models: row.models,
            aiSpeedStars: row.aiSpeedStars,
            aiQualityStars: row.aiQualityStars,
            aiQualityDeclining: isAiQualityDeclining(row.name),
            aiCategory: aiCategoryFromLabel(row.aiCategoryLabel),
          },
        });
        skillIdByName.set(row.name, created.id);
      }

      const idPairs: Array<[string, string]> = [];
      for (const row of rows) {
        for (const connectedName of parseConnectionNames(row.connectionsRaw)) {
          const toId = skillIdByName.get(connectedName);
          if (!toId) {
            throw new Error(
              `Row ${row.rowNumber} ("${row.name}"): connection to unknown skill "${connectedName}"`,
            );
          }
          idPairs.push([skillIdByName.get(row.name)!, toId]);
        }
      }
      const uniquePairs = dedupeUndirectedPairs(idPairs);

      for (const [fromSkillId, toSkillId] of uniquePairs) {
        await tx.skillConnection.create({ data: { fromSkillId, toSkillId } });
      }

      console.log(
        `Loaded ${rows.length} skills across ${SKILL_DOMAIN_ORDER.length} domains, ${uniquePairs.length} unique connections.`,
      );
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
