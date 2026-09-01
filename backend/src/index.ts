import "dotenv/config";
import Fastify from "fastify";

const app = Fastify({ logger: true });

app.get("/health", async () => ({ status: "ok" }));

const port = Number(process.env.PORT ?? 3000);

app.listen({ port }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
