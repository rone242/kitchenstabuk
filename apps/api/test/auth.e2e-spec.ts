import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { hash } from 'bcryptjs';
import { createPrismaClient, type PrismaClient } from 'database';
import request from 'supertest';
import { configureApplication } from './../src/setup/application.js';

const databaseUrl = process.env.E2E_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

describeWithDatabase('Administrative authentication (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const userId = randomUUID();
  const email = `phase3-${userId}@example.sa`;
  const password = 'TemporaryAdmin!2026';

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = databaseUrl;
    process.env.JWT_ACCESS_SECRET =
      'e2e-access-secret-that-is-at-least-32-characters';
    process.env.JWT_REFRESH_SECRET =
      'e2e-refresh-secret-that-is-at-least-32-characters';
    process.env.AUTH_COOKIE_SECURE = 'false';

    prisma = createPrismaClient(databaseUrl!);
    const role = await prisma.role.findUniqueOrThrow({
      where: { name: 'SUPER_ADMIN' },
    });
    await prisma.user.create({
      data: {
        id: userId,
        name: 'Phase 3 test administrator',
        email,
        emailNormalized: email,
        passwordHash: await hash(password, 4),
        roles: { create: { roleId: role.id } },
      },
    });

    const { AppModule } = await import('./../src/app.module.js');
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApplication(app, app.get(ConfigService));
    await app.init();
  });

  it('rotates refresh tokens, rejects replay, and revokes logout sessions', async () => {
    const agent = request.agent(app.getHttpServer());
    const login = await agent
      .post('/api/auth/login')
      .send({ identifier: email.toUpperCase(), password })
      .expect(201);
    expect(login.body.user.roles).toContain('SUPER_ADMIN');
    await agent.get('/api/auth/me').expect(200);
    await agent.get('/api/admin/roles').expect(200);

    const oldCookies = login.headers['set-cookie'] as unknown as string[];
    const oldRefresh = cookiePair(oldCookies, 'kst_refresh');
    const oldCsrf = cookieValue(oldCookies, 'kst_csrf');
    const rotation = await agent
      .post('/api/auth/refresh')
      .set('X-CSRF-Token', oldCsrf)
      .expect(201);
    expect(
      cookieValue(
        rotation.headers['set-cookie'] as unknown as string[],
        'kst_refresh',
      ),
    ).not.toBe(oldRefresh.split('=')[1]);

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', [oldRefresh, `kst_csrf=${oldCsrf}`])
      .set('X-CSRF-Token', oldCsrf)
      .expect(401);

    const secondLogin = await agent
      .post('/api/auth/login')
      .send({ identifier: email, password })
      .expect(201);
    const csrf = cookieValue(
      secondLogin.headers['set-cookie'] as unknown as string[],
      'kst_csrf',
    );
    await agent.post('/api/auth/logout').set('X-CSRF-Token', csrf).expect(204);
    await agent.get('/api/auth/me').expect(401);
  });

  it('manages catalogue records and exposes only active services publicly', async () => {
    const agent = request.agent(app.getHttpServer());
    const login = await agent
      .post('/api/auth/login')
      .send({ identifier: email, password })
      .expect(201);
    const csrf = cookieValue(
      login.headers['set-cookie'] as unknown as string[],
      'kst_csrf',
    );
    let categoryId: string | undefined;
    let serviceId: string | undefined;
    try {
      const category = await agent
        .post('/api/admin/categories')
        .set('X-CSRF-Token', csrf)
        .send({
          nameAr: 'تصنيف الاختبار',
          nameEn: 'Test Category',
          slug: `test-${userId}`,
        })
        .expect(201);
      categoryId = category.body.id;
      const service = await agent
        .post('/api/admin/services')
        .set('X-CSRF-Token', csrf)
        .send({
          categoryId,
          nameAr: 'خدمة الاختبار',
          nameEn: 'Bilingual Test Service',
          summaryEn: 'An English service summary.',
          descriptionEn: 'English details for the bilingual service.',
          benefitsEn: ['English benefit'],
          processStepsEn: ['English step'],
          slug: `test-${userId}`,
          summary: 'وصف مختصر لخدمة الاختبار',
          description: 'وصف تفصيلي لخدمة الاختبار للتأكد من عمل إدارة الخدمات',
          priceType: 'RANGE',
          startingPrice: 100,
          maximumPrice: 200,
        })
        .expect(201);
      serviceId = service.body.id;
      await request(app.getHttpServer())
        .get(`/api/catalogue/services/test-${userId}`)
        .expect(200);
      const english = await request(app.getHttpServer())
        .get(`/api/catalogue/services/test-${userId}?locale=en`)
        .expect(200);
      expect(english.body).toMatchObject({
        name: 'Bilingual Test Service',
        summary: 'An English service summary.',
        description: 'English details for the bilingual service.',
        benefits: ['English benefit'],
        processSteps: ['English step'],
        category: { name: 'Test Category' },
      });
      const arabic = await request(app.getHttpServer())
        .get(`/api/catalogue/services/test-${userId}?locale=ar`)
        .expect(200);
      expect(arabic.body.name).toBe('خدمة الاختبار');
      expect(arabic.body.summary).toBe('وصف مختصر لخدمة الاختبار');
      const search = await request(app.getHttpServer())
        .get('/api/catalogue/services')
        .query({ locale: 'en', search: 'Bilingual Test', categoryId })
        .expect(200);
      expect(search.body.data.map((item: { id: string }) => item.id)).toContain(
        serviceId,
      );
      await request(app.getHttpServer())
        .get('/api/catalogue/services?locale=fr')
        .expect(400);
      await agent
        .patch(`/api/admin/services/${serviceId}`)
        .set('X-CSRF-Token', csrf)
        .send({ summaryEn: '' })
        .expect(200);
      const fallback = await request(app.getHttpServer())
        .get(`/api/catalogue/services/test-${userId}?locale=en`)
        .expect(200);
      expect(fallback.body.summary).toBe(arabic.body.summary);
      await agent
        .patch(`/api/admin/services/${serviceId}`)
        .set('X-CSRF-Token', csrf)
        .send({ maximumPrice: 50 })
        .expect(409);
      const field = await agent
        .post(`/api/admin/services/${serviceId}/fields`)
        .set('X-CSRF-Token', csrf)
        .send({ key: 'size', type: 'TEXT', labelAr: 'الحجم' })
        .expect(201);
      await agent
        .patch(`/api/admin/services/${serviceId}/fields/${field.body.id}`)
        .set('X-CSRF-Token', csrf)
        .send({ type: 'SELECT' })
        .expect(409);
      await request(app.getHttpServer()).get('/api/admin/services').expect(401);
      const cities = await prisma.city.findMany({
        where: { isActive: true },
        take: 1,
      });
      if (cities[0]) {
        await agent
          .put(`/api/admin/locations/services/${serviceId}`)
          .set('X-CSRF-Token', csrf)
          .send({ locations: [{ cityId: cities[0].id }] })
          .expect(200);
        const discovery = await request(app.getHttpServer())
          .get('/api/catalogue/services')
          .query({ cityId: cities[0].id, categoryId })
          .expect(200);
        expect(
          discovery.body.data.map((item: { id: string }) => item.id),
        ).toContain(serviceId);
      }
      await agent
        .patch(`/api/admin/services/${serviceId}`)
        .set('X-CSRF-Token', csrf)
        .send({ isActive: false })
        .expect(200);
      await request(app.getHttpServer())
        .get(`/api/catalogue/services/test-${userId}`)
        .expect(404);
    } finally {
      if (serviceId)
        await prisma.service.deleteMany({ where: { id: serviceId } });
      if (categoryId)
        await prisma.category.deleteMany({ where: { id: categoryId } });
    }
  });

  it('accepts private pending reviews and requires admin approval for publication', async () => {
    const server = app.getHttpServer();
    const reviewEmail = `review-${userId}@example.com`;
    const input = {
      customerName: 'Review test',
      email: reviewEmail,
      rating: 5,
      body: 'A helpful service and clear communication.',
    };
    const agent = request.agent(server);
    const login = await agent
      .post('/api/auth/login')
      .send({ identifier: email, password })
      .expect(201);
    const csrf = cookieValue(
      login.headers['set-cookie'] as unknown as string[],
      'kst_csrf',
    );
    try {
      await request(server)
        .post('/api/catalogue/reviews')
        .send({ ...input, email: 'invalid', rating: 6 })
        .expect(400);
      await request(server)
        .post('/api/catalogue/reviews')
        .send({ ...input, status: 'APPROVED' })
        .expect(400);
      const submitted = await request(server)
        .post('/api/catalogue/reviews')
        .send(input)
        .expect(201);
      expect(submitted.body).toEqual({ status: 'PENDING' });
      const row = await prisma.customerReview.findFirstOrThrow({
        where: { email: reviewEmail },
      });
      expect(row.isActive).toBe(false);
      const pending = await request(server)
        .get('/api/catalogue/homepage')
        .expect(200);
      expect(
        pending.body.reviews.some(
          (review: { id: string }) => review.id === row.id,
        ),
      ).toBe(false);
      await request(server).get('/api/admin/reviews').expect(401);
      await request(server)
        .patch(`/api/admin/reviews/${row.id}`)
        .send({ status: 'APPROVED' })
        .expect(401);
      await request(server).delete(`/api/admin/reviews/${row.id}`).expect(401);
      await agent
        .patch(`/api/admin/reviews/${row.id}`)
        .send({ status: 'APPROVED' })
        .expect(401);
      const listing = await agent
        .get('/api/admin/reviews?status=PENDING')
        .expect(200);
      expect(
        listing.body.data.some(
          (review: { email: string }) => review.email === reviewEmail,
        ),
      ).toBe(true);
      await agent
        .patch(`/api/admin/reviews/${row.id}`)
        .set('X-CSRF-Token', csrf)
        .send({ status: 'APPROVED' })
        .expect(200);
      const approved = await request(server)
        .get('/api/catalogue/homepage')
        .expect(200);
      const published = approved.body.reviews.find(
        (review: { id: string }) => review.id === row.id,
      );
      expect(published).toBeDefined();
      expect(published).not.toHaveProperty('email');
      expect(JSON.stringify(approved.body)).not.toContain(reviewEmail);
      await agent
        .patch(`/api/admin/reviews/${row.id}`)
        .set('X-CSRF-Token', csrf)
        .send({ status: 'REJECTED' })
        .expect(200);
      const rejected = await request(server)
        .get('/api/catalogue/homepage')
        .expect(200);
      expect(
        rejected.body.reviews.some(
          (review: { id: string }) => review.id === row.id,
        ),
      ).toBe(false);
      await agent
        .delete(`/api/admin/reviews/${row.id}`)
        .set('X-CSRF-Token', csrf)
        .expect(204);
      expect(
        await prisma.customerReview.findUnique({ where: { id: row.id } }),
      ).toBeNull();
    } finally {
      await prisma.customerReview.deleteMany({ where: { email: reviewEmail } });
    }
  });

  afterAll(async () => {
    if (app) await app.close();
    if (prisma) {
      await prisma.auditLog.deleteMany({ where: { actorId: userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
      await prisma.$disconnect();
    }
  });
});

function cookiePair(cookies: string[], name: string): string {
  const cookie = cookies.find((value) => value.startsWith(`${name}=`));
  if (!cookie) throw new Error(`Missing ${name} cookie`);
  return cookie.split(';')[0]!;
}

function cookieValue(cookies: string[], name: string): string {
  return cookiePair(cookies, name).slice(name.length + 1);
}
