// Verification script for the "Gửi Nỗi Nhớ" HUD/modal layout (375px mobile).
import puppeteer from 'puppeteer-core';

const BASE = 'http://localhost:3456';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

async function openPage(width, height, dpr) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: dpr });
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  return page;
}

// ── 1. Mobile 375×667: Top HUD density (should be 5 buttons now) ───────────
const mobile = await openPage(375, 667, 2);
await new Promise((r) => setTimeout(r, 800));

const hudMetrics = await mobile.evaluate(() => {
  // The HUD icon row is the flex container holding the control buttons.
  const mailBtn = [...document.querySelectorAll('button')].find(
    (b) => b.getAttribute('aria-label') === 'Hộp thư thời gian',
  );
  if (!mailBtn) return { found: false };
  const row = mailBtn.parentElement;
  const dayTitle = document.querySelector('header span');
  const headerRow = dayTitle?.parentElement;

  const rects = [...row.children].map((el) => ({
    label: el.getAttribute('aria-label') ?? el.getAttribute('title') ?? 'unk',
    top: el.getBoundingClientRect().top,
    right: el.getBoundingClientRect().right,
  }));
  const wraps = new Set(rects.map((r) => Math.round(r.top)));

  return {
    found: true,
    rowCount: row.children.length,
    rowWrapped: wraps.size > 1,
    buttons: rects,
    headerRowOverlaps: headerRow
      ? rects.some((r) => r.right > headerRow.getBoundingClientRect().right && r.top > headerRow.getBoundingClientRect().top - 4)
      : null,
    bodyScrollWidth: document.body.scrollWidth,
    viewportWidth: window.innerWidth,
    horizontalOverflow: document.body.scrollWidth > window.innerWidth,
  };
});
console.log('MOBILE HUD METRICS', JSON.stringify(hudMetrics, null, 2));
await mobile.screenshot({ path: 'scripts/verify-miss-1-mobile-hud.png' });

// ── 2. Time Capsule: heart in banner header + anchored auto-dismiss hint ───
await mobile.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(
    (x) => x.getAttribute('aria-label') === 'Hộp thư thời gian',
  );
  b?.click();
});
await new Promise((r) => setTimeout(r, 700));
const bannerMetrics = await mobile.evaluate(() => {
  const heart = [...document.querySelectorAll('button')]
    .find((b) => b.getAttribute('aria-label') === 'Gửi nỗi nhớ cho anh');
  if (!heart) return { found: false };
  const h = heart.getBoundingClientRect();
  const hint = document.querySelector('[role="tooltip"]');
  const hi = hint?.getBoundingClientRect();
  const modal = document.querySelector('[role="dialog"][aria-label="Hộp thư thời gian"]');
  const mi = modal?.getBoundingClientRect();
  return {
    found: true,
    heartInBanner: h.top > mi.top && h.bottom < mi.top + 160,
    heartRight: h.right <= window.innerWidth,
    hintPresent: !!hint,
    hintAnchoredUnderHeart: hi ? hi.top >= h.bottom - 6 : null,
    hintNotAtViewportTop: hi ? hi.top > mi.top + 20 : null,
    hintInModal: hi && mi ? hi.bottom < mi.bottom && hi.right < mi.right : null,
  };
});
console.log('BANNER HEART METRICS', JSON.stringify(bannerMetrics, null, 2));
await mobile.screenshot({ path: 'scripts/verify-miss-2-mobile-timecapsule.png' });

// ── 3. Hint auto-dismisses after 3s ───────────────────────────────────────
await new Promise((r) => setTimeout(r, 3300));
console.log('HINT AFTER 3.3s', await mobile.evaluate(() => ({
  hintGone: !document.querySelector('[role="tooltip"]'),
})));

// ── 4. Send Miss modal opens from banner heart ────────────────────────────
await mobile.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(
    (x) => x.getAttribute('aria-label') === 'Gửi nỗi nhớ cho anh' && x.closest('[role="dialog"]'),
  );
  b?.click();
});
await new Promise((r) => setTimeout(r, 700));
const sendMissMetrics = await mobile.evaluate(() => {
  const dialog = document.querySelector('[role="dialog"][aria-label="Gửi nỗi nhớ cho anh"]');
  if (!dialog) return { open: false };
  const d = dialog.getBoundingClientRect();
  return {
    open: true,
    dialogInViewport: d.top >= 0 && d.bottom <= window.innerHeight,
    hintBelowHeart: (() => {
      const heart = dialog.querySelector('button[aria-label="Nhấn giữ để gửi cái ôm"]');
      const hint = [...dialog.querySelectorAll('p')].find((p) => p.textContent.includes('Nhấn giữ để gửi cái ôm'));
      return heart && hint ? hint.getBoundingClientRect().top > heart.getBoundingClientRect().top : null;
    })(),
  };
});
console.log('SEND-MISS METRICS', JSON.stringify(sendMissMetrics, null, 2));
await mobile.screenshot({ path: 'scripts/verify-miss-3-mobile-sendmiss.png' });

// ── 5. Desktop sanity ──────────────────────────────────────────────────────
const desktop = await openPage(1440, 900, 1);
console.log('DESKTOP', await desktop.evaluate(() => ({
  horizontalOverflow: document.body.scrollWidth > window.innerWidth,
})));
await desktop.screenshot({ path: 'scripts/verify-miss-5-desktop.png' });

// ── 6. Narrow 320px (iPhone SE) — header should wrap, no overflow ─────────
const narrow = await openPage(320, 568, 2);
console.log('NARROW-320', await narrow.evaluate(() => ({
  vw: window.innerWidth,
  bodyScroll: document.body.scrollWidth,
  horizontalOverflow: document.body.scrollWidth > window.innerWidth,
})));
await narrow.screenshot({ path: 'scripts/verify-miss-6-mobile-320.png' });

await browser.close();
console.log('DONE');
