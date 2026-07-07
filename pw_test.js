const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('http://localhost:8080');
  await page.waitForLoadState('networkidle');
  
  await page.screenshot({ path: 'C:/Users/Bence/Documents/foe-city-planner/sc1.png' });
  
  // Load the quantum sample city via localStorage
  const fs = require('fs');
  const sample = JSON.parse(fs.readFileSync('C:/Users/Bence/Documents/foe-city-planner/quantumn_sample.json', 'utf8'));
  await page.evaluate((data) => {
    localStorage.setItem('foe_city_planner_save', JSON.stringify(data));
  }, sample);
  
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'C:/Users/Bence/Documents/foe-city-planner/sc2.png' });
  
  // Check if QI toggle is now visible
  const vis = await page.isVisible('#qiSimToggleBtn');
  console.log('QI toggle visible:', vis);
  
  // Get all visible buttons text
  const btnTexts = await page.$$eval('button:visible', btns => btns.map(b => b.textContent.trim()).filter(t => t));
  console.log('Visible buttons:', btnTexts.slice(0, 20));
  
  await browser.close();
})();
