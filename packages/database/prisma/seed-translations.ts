import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { seedEnglishContent } from "./english-content.js";
config({
  path: fileURLToPath(new URL("../../../.env", import.meta.url)),
  quiet: true,
});
const { getPrismaClient } = await import("../src/client.js");
const prisma = getPrismaClient();
try {
  await seedEnglishContent(prisma);
  console.log("Missing English development translations filled.");
} finally {
  await prisma.$disconnect();
}
