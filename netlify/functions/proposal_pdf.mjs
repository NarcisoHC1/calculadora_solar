import chromium from '@sparticuz/chromium';
import { chromium as playwrightChromium } from 'playwright-core';

chromium.setHeadlessMode = true;
chromium.setGraphicsMode = false;

const DEFAULT_MARGIN = {
  top: '20mm',
  right: '16mm',
  bottom: '20mm',
  left: '16mm'
};

export const handler = async event => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid JSON body', details: error.message })
    };
  }

  const { html, fileName = 'propuesta-solarya.pdf', margin, landscape = false } = payload;

  if (!html || typeof html !== 'string' || html.trim().length === 0) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing HTML content' })
    };
  }

  let browser;

  try {
    const executablePath = await chromium.executablePath();

    browser = await playwrightChromium.launch({
      args: chromium.args,
      executablePath,
      headless: chromium.headless,
      chromiumSandbox: false
    });

    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

    await page.setContent(html, { waitUntil: 'networkidle' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      landscape,
      margin: margin || DEFAULT_MARGIN
    });

    const sanitizedFileName = `${fileName}`.replace(/"/g, '').trim() || 'propuesta-solarya.pdf';

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${sanitizedFileName}"`,
        'Cache-Control': 'no-store'
      },
      body: pdfBuffer.toString('base64'),
      isBase64Encoded: true
    };
  } catch (error) {
    console.error('PDF generation failed', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to generate PDF', details: error.message })
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
