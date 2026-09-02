import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { cohortGapRoutes } from "./routes/cohort-gap.js";
import { roadmapRoutes } from "./routes/roadmap.js";
import { skillAssessmentRoutes } from "./routes/skill-assessments.js";
import { userRoutes } from "./routes/users.js";

const app = Fastify({ logger: true });

// Dev-only: frontend (Vite, localhost:5173) and backend (localhost:3000)
// are different origins. No production hosting/CORS policy decided yet
// (README stack lists Vercel/GitHub Pages, not yet configured) — revisit
// once a real deployment origin exists.
await app.register(cors, { origin: process.env.CORS_ORIGIN ?? "http://localhost:5173" });

app.get("/health", async () => ({ status: "ok" }));
await app.register(userRoutes);
await app.register(skillAssessmentRoutes);
await app.register(cohortGapRoutes);
await app.register(roadmapRoutes);

const port = Number(process.env.PORT ?? 3000);

app.listen({ port }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
