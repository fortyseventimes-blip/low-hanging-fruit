import "dotenv/config";
import Fastify from "fastify";
import { userRoutes } from "./routes/users.js";

const app = Fastify({ logger: true });

app.get("/health", async () => ({ status: "ok" }));
await app.register(userRoutes);

const port = Number(process.env.PORT ?? 3000);

app.listen({ port }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
