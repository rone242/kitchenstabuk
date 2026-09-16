// Run with local dev servers: node --env-file=.env scripts/verify-images.cjs
// Uses a fresh headless Chrome profile, local test ports, and no browser packages.
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { mkdtempSync, writeFileSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { resolve, join } = require("node:path");
const { pathToFileURL } = require("node:url");
const { randomUUID } = require("node:crypto");
const root = resolve(__dirname, "..");
const children = [];
const profile = mkdtempSync(join(tmpdir(), "kst-language-"));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function start(command, args, cwd, env = {}) {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: "ignore",
  });
  children.push(child);
  return child;
}
async function ready(url) {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return r;
    } catch {}
    await sleep(500);
  }
  throw Error(`Server did not start: ${url}`);
}
let prisma, testUserId;
let ws,
  sequence = 0;
const pending = new Map();
function send(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) throw Error(result.exceptionDetails.text);
  return result.result.value;
}
async function until(expression) {
  for (let i = 0; i < 80; i++) {
    try {
      if (await evaluate(expression)) return;
    } catch {}
    await sleep(150);
  }
  throw Error(
    `Browser condition failed: ${expression}\n${await evaluate("document.body.innerText")}`,
  );
}
async function go(url, marker) {
  await send("Page.navigate", { url });
  await until(
    `location.href === ${JSON.stringify(url)} && document.readyState === 'complete' && document.body.innerText.includes(${JSON.stringify(marker)})`,
  );
  await sleep(300);
}
async function toggle(language) {
  await evaluate(
    `document.querySelector('.language-toggle button[lang="${language}"]').click()`,
  );
  await until(
    `document.documentElement.lang === '${language === "ar" ? "ar-SA" : "en"}'`,
  );
}
(async () => {
  const token = randomUUID();
  let categoryId, serviceId, projectId;
  const mediaIds = [];
  try {
    const { createPrismaClient } = await import(
      pathToFileURL(join(root, "packages/database/dist/index.js")).href
    );
    prisma = createPrismaClient(process.env.DATABASE_URL);
    const { hash } = require(join(root, "apps/api/node_modules/bcryptjs"));
    testUserId = randomUUID();
    const password = randomUUID() + "!Test";
    const email = `images-${testUserId}@example.com`;
    const role = await prisma.role.findUniqueOrThrow({
      where: { name: "SUPER_ADMIN" },
    });
    await prisma.user.create({
      data: {
        id: testUserId,
        name: "Image Browser Test",
        email,
        emailNormalized: email,
        passwordHash: await hash(password, 4),
        roles: { create: { roleId: role.id } },
      },
    });
    const png = join(profile, "upload.png");
    writeFileSync(
      png,
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=",
        "base64",
      ),
    );
    start(
      process.env.CHROME_BIN || "/usr/bin/google-chrome",
      [
        "--headless=new",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--remote-debugging-port=9335",
        `--user-data-dir=${profile}`,
        "about:blank",
      ],
      root,
    );
    const targets = await (await ready("http://localhost:9335/json")).json();
    ws = new WebSocket(
      targets.find((t) => t.type === "page").webSocketDebuggerUrl,
    );
    await new Promise((resolve) =>
      ws.addEventListener("open", resolve, { once: true }),
    );
    ws.addEventListener("message", (event) => {
      const value = JSON.parse(event.data);
      const call = pending.get(value.id);
      if (call) {
        pending.delete(value.id);
        value.error
          ? call.reject(Error(value.error.message))
          : call.resolve(value.result);
      }
    });
    await send("Page.enable");
    await send("Runtime.enable");
    await go("http://localhost:3001/login", "مرحباً بعودتك");
    await toggle("en");
    await evaluate(
      `(() => {document.querySelector('[name=identifier]').value=${JSON.stringify(email)};document.querySelector('[name=password]').value=${JSON.stringify(password)};document.querySelector('form').requestSubmit();})()`,
    );
    await until("location.pathname === '/dashboard'");
    async function upload(name) {
      const { root: doc } = await send("DOM.getDocument");
      const { nodeId } = await send("DOM.querySelector", {
        nodeId: doc.nodeId,
        selector: `.image-picker:has(select[name="${name}"]) input[type=file]`,
      });
      assert.ok(nodeId, `Missing uploader for ${name}`);
      await send("DOM.setFileInputFiles", { nodeId, files: [png] });
      await until(
        `document.querySelector('select[name="${name}"]').value !== '' && !document.querySelector('select[name="${name}"]').disabled`,
      );
      const id = await evaluate(
        `document.querySelector('select[name="${name}"]').value`,
      );
      mediaIds.push(id);
      await evaluate(
        `document.querySelector('.image-picker:has(select[name="${name}"])').scrollIntoView()`,
      );
      await until(
        `document.querySelector('.image-picker:has(select[name="${name}"]) img')?.naturalWidth > 0`,
      );
      return id;
    }
    await go("http://localhost:3001/categories/new", "Upload an image");
    const categoryImage = await upload("imageId");
    await evaluate(
      `(() => {document.querySelector('[name=nameAr]').value='تصنيف صور الاختبار';document.querySelector('[name=slug]').value='images-${token}';document.querySelector('form').requestSubmit();})()`,
    );
    await until("location.pathname === '/categories'");
    const category = await prisma.category.findUniqueOrThrow({
      where: { slug: `images-${token}` },
    });
    categoryId = category.id;
    assert.equal(category.imageId, categoryImage);
    await go("http://localhost:3001/services/new", "Upload an image");
    await until(
      `!!document.querySelector('select[name=categoryId] option[value="${categoryId}"]')`,
    );
    const cover = await upload("coverImageId");
    const gallery = await upload("galleryIds");
    await evaluate(
      `(() => {document.querySelector('[name=categoryId]').value=${JSON.stringify(categoryId)};document.querySelector('[name=nameAr]').value='خدمة صور الاختبار';document.querySelector('[name=slug]').value='images-${token}';document.querySelector('[name=summary]').value='A sufficiently detailed test summary.';document.querySelector('form [name=description]').value='A sufficiently detailed description for the image upload test.';document.querySelector('form').requestSubmit();})()`,
    );
    await until(
      "location.pathname.startsWith('/services/') && location.pathname !== '/services/new'",
    );
    const service = await prisma.service.findUniqueOrThrow({
      where: { slug: `images-${token}` },
      include: { gallery: true },
    });
    serviceId = service.id;
    assert.equal(service.coverImageId, cover);
    assert.equal(service.gallery[0].mediaId, gallery);
    await go("http://localhost:3001/portfolio", "New project");
    await evaluate(
      "[...document.querySelectorAll('button')].find(b=>b.innerText.includes('New project')).click()",
    );
    await until("!!document.querySelector('select[name=beforeImageId]')");
    const before = await upload("beforeImageId");
    const after = await upload("imageId");
    await evaluate(
      `(() => {document.querySelector('[name=titleAr]').value='Image project ${token}';document.querySelector('[name=serviceId]').value=${JSON.stringify(serviceId)};document.querySelector('[name=isPublished]').checked=true;document.querySelector('form').requestSubmit();})()`,
    );
    await until("!document.querySelector('form')");
    const project = await prisma.portfolioItem.findFirstOrThrow({
      where: { serviceId },
    });
    projectId = project.id;
    assert.equal(project.beforeImageId, before);
    assert.equal(project.imageId, after);
    const projectResponse = await fetch(
      `http://localhost:4000/api/catalogue/projects/${projectId}`,
    );
    assert.equal(projectResponse.status, 200);
    const details = await projectResponse.json();
    assert.ok(details.beforeImage.publicUrl);
    assert.ok(details.image.publicUrl);
    await go(
      `http://localhost:3001/categories/${categoryId}`,
      "Remove selection",
    );
    await evaluate(
      "document.querySelector('.image-picker-preview button').click()",
    );
    await until("document.querySelector('select[name=imageId]').value === ''");
    await evaluate("document.querySelector('form').requestSubmit()");
    await until("location.pathname === '/categories'");
    assert.equal(
      (await prisma.category.findUniqueOrThrow({ where: { id: categoryId } }))
        .imageId,
      null,
    );
    console.log(
      "Browser checks passed: category image upload/removal, service cover/gallery uploads, project before/after uploads, previews, saved relationships, public image URLs.",
    );
  } finally {
    if (prisma) {
      if (projectId)
        await prisma.portfolioItem.deleteMany({ where: { id: projectId } });
      if (serviceId)
        await prisma.service.deleteMany({ where: { id: serviceId } });
      if (categoryId)
        await prisma.category.deleteMany({ where: { id: categoryId } });
      // Remove only uploads created by this temporary test administrator.
      const media = testUserId
        ? await prisma.mediaAsset.findMany({
            where: { uploadedById: testUserId },
          })
        : [];
      for (const item of media) {
        if (ws) {
          const status = await evaluate(
            `(async()=>{const csrf=document.cookie.split('; ').find(x=>x.startsWith('kst_csrf='))?.split('=')[1];const r=await fetch('http://localhost:4000/api/admin/media/${item.id}',{method:'DELETE',credentials:'include',headers:{'X-CSRF-Token':csrf}});return r.status;})()`,
          );
          assert.equal(status, 200, "Test media cleanup failed");
        }
      }
      if (testUserId) {
        await prisma.auditLog.deleteMany({ where: { actorId: testUserId } });
        await prisma.user.deleteMany({ where: { id: testUserId } });
      }
      await prisma.$disconnect();
    }
    if (ws) ws.close();
    for (const child of children.reverse()) child.kill("SIGTERM");
    await sleep(500);
    rmSync(profile, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
