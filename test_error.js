import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  await page.goto('http://localhost:5173');
  await new Promise(r => setTimeout(r, 2000));

  // Log in
  await page.type('input[name="email"]', 'dribrahimpharmaceutics@gmail.com');
  await page.type('input[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 3000));

  console.log("Navigating to Databases...");
  const dbBtn = await page.$('button::-p-text(Databases)');
  if (dbBtn) {
    await dbBtn.click();
    await new Promise(r => setTimeout(r, 2000));
  } else {
    console.log("Could not find Databases button");
  }

  await browser.close();
  process.exit(0);
})();
