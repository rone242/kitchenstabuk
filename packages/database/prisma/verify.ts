import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { config as loadEnvironment } from "dotenv";

loadEnvironment({
  path: fileURLToPath(new URL("../../../.env", import.meta.url)),
  quiet: true,
});

async function main(): Promise<void> {
  const { getPrismaClient } = await import("../src/client.js");
  const prisma = getPrismaClient();
  const [
    categories,
    services,
    cities,
    districts,
    serviceFields,
    requests,
    answers,
    statusHistory,
    sections,
    superAdmins,
  ] = await prisma.$transaction([
    prisma.category.count(),
    prisma.service.count(),
    prisma.city.count(),
    prisma.district.count(),
    prisma.serviceField.count(),
    prisma.serviceRequest.count(),
    prisma.serviceRequestAnswer.count(),
    prisma.requestStatusHistory.count(),
    prisma.homepageSection.count(),
    prisma.user.count({
      where: { roles: { some: { role: { name: "SUPER_ADMIN" } } } },
    }),
  ]);

  assert.equal(categories, 8, "expected exactly 8 development categories");
  assert.equal(services, 12, "expected exactly 12 development services");
  assert.equal(cities, 8, "expected exactly 8 development cities");
  assert.equal(districts, 24, "expected exactly 24 development districts");
  assert.equal(serviceFields, 7, "expected exactly 7 dynamic service fields");
  assert.equal(requests, 3, "expected exactly 3 sample requests");
  assert.equal(answers, 5, "expected exactly 5 sample dynamic answers");
  assert.equal(statusHistory, 3, "expected one history row per sample request");
  assert.equal(sections, 10, "expected exactly 10 homepage sections");
  assert.equal(superAdmins, 1, "expected exactly one seeded super-admin");

  const appliedMigrations = await prisma.$queryRaw<
    Array<{ migration_name: string }>
  >`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`;
  assert.deepEqual(
    appliedMigrations.map(({ migration_name }) => migration_name).sort(),
    ["20260910195022_initial_schema", "20260910195500_data_integrity_checks"],
    "expected both Phase 2 migrations to be applied",
  );

  const integrityConstraints = await prisma.$queryRaw<Array<{ name: string }>>`
    SELECT conname AS name
    FROM pg_constraint
    WHERE conname IN (
      'Service_price_values_check',
      'CustomerReview_rating_check',
      'ServiceLocation_district_city_fkey',
      'ServiceRequest_district_city_fkey'
    )
  `;
  assert.equal(
    integrityConstraints.length,
    4,
    "expected the Phase 2 business integrity constraints",
  );

  console.info(
    `Verified seed: ${categories} categories, ${services} services, ${cities} cities, ${requests} requests`,
  );
  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error("Database verification failed", error);
  process.exitCode = 1;
});
