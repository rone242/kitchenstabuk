// Run with local dev servers: node --env-file=.env scripts/verify-reviews.cjs
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
  throw Error(`Browser condition failed: ${expression}`);
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
  const reviewEmail = `browser-review-${randomUUID()}@example.com`;
  try {
    const { createPrismaClient } = await import(
      pathToFileURL(join(root, "packages/database/dist/index.js")).href
    );
    prisma = createPrismaClient(process.env.DATABASE_URL);
    start(
      process.env.CHROME_BIN || "/usr/bin/google-chrome",
      [
        "--headless=new",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--remote-debugging-port=9334",
        `--user-data-dir=${profile}`,
        "about:blank",
      ],
      root,
    );
    const targets = await (await ready("http://localhost:9334/json")).json();
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
    await go("http://localhost:3000/en", "Share your experience");
    await evaluate(
      `(() => { const form = document.querySelector('#write-review form'); form.customerName.value='Browser Review Test'; form.email.value=${JSON.stringify(reviewEmail)}; form.body.value='A browser-tested review awaiting moderation.'; form.requestSubmit(); })()`,
    );
    await until(
      "document.querySelector('#write-review').innerText.includes('Thank you!')",
    );
    const review = await prisma.customerReview.findFirstOrThrow({
      where: { email: reviewEmail },
    });
    assert.equal(review.status, "PENDING");
    const { hash } = require(join(root, "apps/api/node_modules/bcryptjs"));
    testUserId = randomUUID();
    const password = randomUUID() + "!Test";
    const email = `review-admin-${testUserId}@example.com`;
    const role = await prisma.role.findUniqueOrThrow({
      where: { name: "SUPER_ADMIN" },
    });
    await prisma.user.create({
      data: {
        id: testUserId,
        name: "Review Browser Test",
        email,
        emailNormalized: email,
        passwordHash: await hash(password, 4),
        roles: { create: { roleId: role.id } },
      },
    });
    await go("http://localhost:3001/login", "Welcome back");
    await evaluate(
      `(() => { document.querySelector('[name=identifier]').value=${JSON.stringify(email)}; document.querySelector('[name=password]').value=${JSON.stringify(password)}; document.querySelector('form').requestSubmit(); })()`,
    );
    await until("location.pathname === '/dashboard'");
    await go("http://localhost:3001/reviews", "Browser Review Test");
    await evaluate(
      "[...document.querySelectorAll('.review-admin-card')].find(x=>x.innerText.includes('Browser Review Test')).querySelector('button').click()",
    );
    await until("!document.body.innerText.includes('Browser Review Test')");
    assert.equal(
      (
        await prisma.customerReview.findUniqueOrThrow({
          where: { id: review.id },
        })
      ).status,
      "APPROVED",
    );
    await go("http://localhost:3000/en", "Browser Review Test");
    assert.equal(
      await evaluate(
        `document.body.innerText.includes(${JSON.stringify(reviewEmail)})`,
      ),
      false,
    );
    await go("http://localhost:3001/reviews", "Pending approval");
    await evaluate(
      "(() => { const select=document.querySelector('main select') || document.querySelector('select'); select.value='APPROVED'; select.dispatchEvent(new Event('change',{bubbles:true})); })()",
    );
    await until("document.body.innerText.includes('Browser Review Test')");
    await evaluate(
      "[...document.querySelectorAll('.review-admin-card')].find(x=>x.innerText.includes('Browser Review Test')).querySelector('button').click()",
    );
    await until("!document.body.innerText.includes('Browser Review Test')");
    assert.equal(
      (
        await prisma.customerReview.findUniqueOrThrow({
          where: { id: review.id },
        })
      ).status,
      "REJECTED",
    );
    await go("http://localhost:3000/ar", "شاركنا تجربتك");
    assert.equal(await evaluate("document.documentElement.dir"), "rtl");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    assert.ok(
      await evaluate(
        "document.documentElement.scrollWidth <= window.innerWidth",
      ),
    );
    console.log(
      "Browser checks passed: public submission, pending state, admin approval and rejection, public visibility, private email, Arabic form, mobile width.",
    );
  } finally {
    if (ws) ws.close();
    if (prisma) {
      await prisma.customerReview.deleteMany({ where: { email: reviewEmail } });
      if (testUserId) {
        await prisma.auditLog.deleteMany({ where: { actorId: testUserId } });
        await prisma.user.deleteMany({ where: { id: testUserId } });
      }
      await prisma.$disconnect();
    }
    for (const child of children.reverse()) child.kill("SIGTERM");
    await sleep(500);
    rmSync(profile, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
