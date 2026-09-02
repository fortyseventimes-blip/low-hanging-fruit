import "dotenv/config";
import Fastify from "fastify";
import { cohortGapRoutes } from "./routes/cohort-gap.js";
import { roadmapRoutes } from "./routes/roadmap.js";
import { skillAssessmentRoutes } from "./routes/skill-assessments.js";
import { userRoutes } from "./routes/users.js";

const app = Fastify({ logger: true });

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
