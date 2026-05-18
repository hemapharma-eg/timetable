import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  console.log('Navigating to local dev server...');
  // Assuming the dev server runs on port 5173 which is default for Vite
  try {
    await page.goto('http://localhost:5173/admin/analytics', { waitUntil: 'networkidle2' });
    console.log('Navigation complete.');
  } catch (e) {
    console.log('Failed to load page:', e.message);
  }
  
  await browser.close();
})();
