const chromium = require('@sparticuz/chromium');
const { chromium: playwrightChromium } = require('playwright-core');

chromium.setHeadlessMode(true);
chromium.setGraphicsMode(false);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const DEFAULT_FILE_NAME = 'propuesta-solarya.pdf';

const PDF_OPTIONS_BASE = {
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
  displayHeaderFooter: false,
  scale: 1
};

async function waitForFonts(page) {
  try {
    await page.evaluate(() => {
      if (typeof document === 'undefined') return Promise.resolve();
      return document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    });
  } catch {
    /* noop */
  }
}

async function waitForImages(page) {
  try {
    await page.evaluate(async () => {
      const imgs = Array.from(document.images || []);
      await Promise.all(
        imgs.map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => {
            const done = () => resolve();
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
          });
        })
      );
    });
  } catch {
    /* noop */
  }
}

exports.handler = async event => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      body: JSON.stringify({ error: 'Invalid JSON body', details: error.message })
    };
  }

  const { html, fileName, landscape = false } = payload;

  if (!html || typeof html !== 'string' || html.trim().length === 0) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      body: JSON.stringify({ error: 'Missing HTML content' })
    };
  }

  let browser;
  try {
    const executablePath = await chromium.executablePath();
    if (!executablePath) throw new Error('Chromium executablePath is empty');

    browser = await playwrightChromium.launch({
      args: [...chromium.args, '--hide-scrollbars', '--disable-dev-shm-usage'],
      executablePath,
      headless: chromium.headless ?? true,
      chromiumSandbox: false
    });

    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1
    });

    page.setDefaultTimeout(60000);

    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 60000 });

    try {
      await page.waitForLoadState('networkidle', { timeout: 30000 });
    } catch {
      /* noop */
    }

    await waitForFonts(page);
    await waitForImages(page);

    await page.emulateMedia({ media: 'print' });

    await page.addStyleTag({
      content: `
        html { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        * , *::before, *::after { animation: none !important; transition: none !important; }
      `
    });

    const pdfBuffer = await page.pdf({
      ...PDF_OPTIONS_BASE,
      landscape: Boolean(landscape)
    });

    await page.close();

    const safeName = `${fileName || DEFAULT_FILE_NAME}`.replace(/"/g, '').trim() || DEFAULT_FILE_NAME;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}"`,
        'Cache-Control': 'no-store',
        ...CORS_HEADERS
      },
      body: pdfBuffer.toString('base64'),
      isBase64Encoded: true
    };
  } catch (error) {
    console.error('PDF generation failed', {
      message: error?.message,
      stack: error?.stack
    });
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      body: JSON.stringify({ error: 'Failed to generate PDF', details: error.message })
    };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
};
