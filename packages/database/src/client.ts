import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";

const globalDatabase = globalThis as unknown as {
  prisma?: PrismaClient;
};

export function createPrismaClient(connectionString: string): PrismaClient {
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to create the Prisma client");
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

export function getPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to create the Prisma client");
  }

  const client = globalDatabase.prisma ?? createPrismaClient(connectionString);

  if (process.env.NODE_ENV !== "production") {
    globalDatabase.prisma = client;
  }

  return client;
}
