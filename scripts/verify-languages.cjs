// Run after `pnpm build`: node --env-file=.env scripts/verify-languages.cjs
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
  try {
    start(
      process.execPath,
      ["--env-file=../../.env", "dist/main.js"],
      join(root, "apps/api"),
      {
        NODE_ENV: "development",
        API_PORT: "4300",
        CORS_ORIGINS: "http://localhost:3300,http://localhost:3301",
      },
    );
    start(
      process.execPath,
      ["node_modules/next/dist/bin/next", "start", "--port", "3300"],
      join(root, "apps/web"),
      { API_INTERNAL_URL: "http://localhost:4300/api" },
    );
    start(
      process.execPath,
      ["node_modules/next/dist/bin/next", "start", "--port", "3301"],
      join(root, "apps/admin"),
    );
    await Promise.all([
      ready("http://localhost:4300/api/health"),
      ready("http://localhost:3300/ar"),
      ready("http://localhost:3301/login"),
    ]);
    const response = await fetch(
      "http://localhost:3300/services/water-leak-detection",
      { redirect: "manual" },
    );
    assert.equal(response.status, 307);
    assert.ok(
      response.headers
        .get("location")
        .includes("/ar/services/water-leak-detection"),
    );
    const missing = await fetch(
      "http://localhost:3300/en/services/missing-translation-test",
    );
    assert.equal(missing.status, 404);
    const missingHtml = await missing.text();
    assert.ok(
      missingHtml.includes("Page not found"),
      `English 404 copy missing: ${missingHtml.replace(/\s+/g, " ").slice(0, 500)}`,
    );
    const html = await (await fetch("http://localhost:3300/en")).text();
    assert.ok(
      /hrefLang="ar-SA"/i.test(html),
      "Arabic alternate metadata missing",
    );
    assert.ok(
      /rel="canonical"[^>]*href="[^"]*\/en"/i.test(html),
      "English canonical metadata missing",
    );
    start(
      process.env.CHROME_BIN || "/usr/bin/google-chrome",
      [
        "--headless=new",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--remote-debugging-port=9333",
        `--user-data-dir=${profile}`,
        "about:blank",
      ],
      root,
    );
    const targets = await (await ready("http://localhost:9333/json")).json();
    ws = new WebSocket(
      targets.find((t) => t.type === "page").webSocketDebuggerUrl,
    );
    await new Promise((resolve) =>
      ws.addEventListener("open", resolve, { once: true }),
    );
    ws.addEventListener("message", (event) => {
      const value = JSON.parse(event.data);
      if (value.id) {
        const call = pending.get(value.id);
        if (call) {
          pending.delete(value.id);
          value.error
            ? call.reject(Error(value.error.message))
            : call.resolve(value.result);
        }
      }
      // Test the compiled admin bundle against the isolated API without changing its production config.
      if (value.method === "Fetch.requestPaused") {
        const { requestId, request } = value.params;
        const url = new URL(request.url);
        if (url.port === "4000" && url.pathname.startsWith("/api"))
          url.port = "4300";
        send("Fetch.continueRequest", { requestId, url: url.toString() }).catch(
          () => {},
        );
      }
    });
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Fetch.enable", {
      patterns: [{ urlPattern: "*://localhost:4000/api/*" }],
    });
    await go("http://localhost:3300/ar", "كشف تسربات المياه");
    assert.equal(await evaluate("document.documentElement.dir"), "rtl");
    await toggle("en");
    await until(
      "location.pathname === '/en' && document.body.innerText.includes('Water Leak Detection')",
    );
    assert.equal(await evaluate("document.documentElement.dir"), "ltr");
    assert.equal(
      await evaluate(
        "document.querySelector('.language-toggle button[lang=en]').getAttribute('aria-pressed')",
      ),
      "true",
    );
    assert.ok(
      await evaluate(
        "document.querySelector('.service-card p').innerText.includes('water leak')",
      ),
    );
    await evaluate(
      "document.querySelector('input[name=search]').value='Leak'; document.querySelector('select[name=cityId]').selectedIndex=1",
    );
    const cityId = await evaluate(
      "document.querySelector('select[name=cityId]').value",
    );
    await toggle("ar");
    await until(
      "location.pathname === '/ar' && new URL(location.href).searchParams.get('search') === 'Leak'",
    );
    assert.equal(
      await evaluate("new URL(location.href).searchParams.get('cityId')"),
      cityId,
    );
    await go(
      "http://localhost:3300/en/services/water-leak-detection",
      "Find the source of a water leak",
    );
    await toggle("ar");
    await until(
      "location.pathname === '/ar/services/water-leak-detection' && document.body.innerText.includes('كشف تسربات المياه')",
    );
    await go("http://localhost:3301/login", "مرحباً بعودتك");
    await toggle("en");
    await until("document.body.innerText.includes('Welcome back')");
    await evaluate("document.querySelector('[name=identifier]').reportValidity()");
    assert.equal(await evaluate("document.querySelector('[name=identifier]').validationMessage"), 'Please complete this field.');
    await toggle('ar');
    await evaluate("document.querySelector('[name=identifier]').reportValidity()");
    assert.equal(await evaluate("document.querySelector('[name=identifier]').validationMessage"), 'يرجى تعبئة هذا الحقل.');
    await toggle('en');
    await evaluate(
      "document.querySelector('[name=identifier]').value='unfinished@example.sa'",
    );
    await toggle("ar");
    assert.equal(
      await evaluate("document.querySelector('[name=identifier]').value"),
      "unfinished@example.sa",
    );
    await toggle("en");
    await send("Page.reload");
    await until(
      "document.body.innerText.includes('Welcome back') && document.documentElement.dir === 'ltr'",
    );
    const { createPrismaClient } = await import(
      pathToFileURL(join(root, "packages/database/dist/index.js")).href
    );
    prisma = createPrismaClient(process.env.DATABASE_URL);
    const { hash } = require(join(root, "apps/api/node_modules/bcryptjs"));
    testUserId = randomUUID();
    const testEmail = `language-${testUserId}@example.sa`;
    const testPassword = randomUUID() + "!Test";
    const role = await prisma.role.findUniqueOrThrow({
      where: { name: "SUPER_ADMIN" },
    });
    await prisma.user.create({
      data: {
        id: testUserId,
        name: "Language browser test",
        email: testEmail,
        emailNormalized: testEmail,
        passwordHash: await hash(testPassword, 4),
        roles: { create: { roleId: role.id } },
      },
    });
    await evaluate(
      `document.querySelector('[name=identifier]').value=${JSON.stringify(testEmail)};document.querySelector('[name=password]').value=${JSON.stringify(testPassword)};document.querySelector('form').requestSubmit()`,
    );
    await until(
      "location.pathname === '/dashboard' && document.body.innerText.includes('Dashboard')",
    );
    await go("http://localhost:3301/services/new", "Arabic service name");
    await evaluate(
      "document.querySelector('[name=nameAr]').value='مسودة محفوظة';document.querySelector('[name=summary]').value='نص تجريبي غير محفوظ'",
    );
    await toggle("ar");
    await toggle("en");
    assert.equal(
      await evaluate("document.querySelector('[name=nameAr]').value"),
      "مسودة محفوظة",
    );
    await evaluate(
      "[...document.querySelectorAll('[role=tab]')].find(b=>b.textContent==='English content').click()",
    );
    await evaluate(
      "document.querySelector('[name=nameEn]').value='Unsaved English draft'",
    );
    await toggle("ar");
    await toggle("en");
    assert.equal(
      await evaluate("document.querySelector('[name=nameEn]').value"),
      "Unsaved English draft",
    );
    assert.equal(
      await evaluate("document.querySelector('[name=summary]').value"),
      "نص تجريبي غير محفوظ",
    );
    for (const [path, marker] of [
      ["categories", "Categories"],
      ["services", "Services"],
      ["locations/cities", "Cities"],
      ["locations/regions", "Regions"],
      ["locations/districts", "Districts"],
      ["media", "Media library"],
      ["users", "Users"],
      ["roles", "Roles and permissions"],
      ["audit-logs", "Audit log"],
    ]) {
      await go(`http://localhost:3301/${path}`, marker);
      await until("!document.body.innerText.includes('Loading data')");
      assert.equal(await evaluate("document.documentElement.dir"), "ltr");
    }
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await go("http://localhost:3300/en", "Water Leak Detection");
    assert.ok(
      await evaluate(
        "document.documentElement.scrollWidth <= window.innerWidth",
      ),
      "Mobile horizontal overflow",
    );
    const screenshot = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(
      join(tmpdir(), "kitchenstabuk-english-mobile.png"),
      Buffer.from(screenshot.data, "base64"),
    );
    console.log(
      "Browser checks passed: translated content, RTL/LTR, links, filters, persistence, admin login, unsaved forms, admin routes, and mobile width.",
    );
  } finally {
    if (ws) ws.close();
    if (prisma) {
      try {
        if (testUserId) {
          await prisma.auditLog.deleteMany({ where: { actorId: testUserId } });
          await prisma.user.deleteMany({ where: { id: testUserId } });
        }
      } finally {
        await prisma.$disconnect();
      }
    }
    for (const child of children.reverse()) child.kill("SIGTERM");
    await sleep(500);
    rmSync(profile, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
