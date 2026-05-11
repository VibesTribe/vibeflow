const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('https');

// Read OpenRouter key from auth.json
const authData = JSON.parse(fs.readFileSync('/home/vibes/.hermes/auth.json', 'utf8'));
const OPENROUTER_KEY = authData.credential_pool.openrouter[0].access_token;
const VISION_MODEL = 'nvidia/nemotron-nano-12b-v2-vl:free';

const viewports = [
  { name: 'iPhone', width: 390, height: 844 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Laptop', width: 1366, height: 768 },
  { name: 'Desktop', width: 1920, height: 1080 },
];

const DASHBOARD_URL = 'file://' + path.resolve('/home/vibes/vibeflow/dist/index.html');
const SCREENSHOT_DIR = '/tmp/visual-test';

async function captureAll() {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const results = [];

  for (const vp of viewports) {
    console.log(`\n--- Capturing ${vp.name} (${vp.width}x${vp.height}) ---`);
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    
    try {
      await page.goto(DASHBOARD_URL, { waitUntil: 'load', timeout: 10000 });
      await page.waitForTimeout(2000);
    } catch (e) {
      console.log(`  Failed to load: ${e.message}`);
      await page.close();
      continue;
    }

    const shotPath = `${SCREENSHOT_DIR}/${vp.name.toLowerCase()}.png`;
    await page.screenshot({ path: shotPath });
    console.log(`  Saved: ${shotPath}`);

    // Also extract computed layout info
    const layout = await page.evaluate(() => {
      const root = document.querySelector('.mission-root');
      const main = document.querySelector('.mission-main');
      const header = document.querySelector('.mission-header');
      const tasksRow = document.querySelector('.mission-header__tasks-row');
      const pills = document.querySelectorAll('.mission-header__stat-pill');
      
      const pillData = Array.from(pills).map((p, i) => ({
        index: i,
        width: p.offsetWidth,
        height: p.offsetHeight,
        left: p.offsetLeft,
        text: p.textContent.trim().substring(0, 25),
        class: p.className
      }));

      return {
        viewport: window.innerWidth,
        root: root ? { 
          paddingLeft: getComputedStyle(root).paddingLeft, 
          paddingRight: getComputedStyle(root).paddingRight,
          width: root.offsetWidth 
        } : null,
        main: main ? { 
          paddingLeft: getComputedStyle(main).paddingLeft, 
          paddingRight: getComputedStyle(main).paddingRight,
          offsetLeft: main.offsetLeft,
          width: main.offsetWidth 
        } : null,
        pills: pillData,
        tasksRow: tasksRow ? {
          display: getComputedStyle(tasksRow).display,
          flexWrap: getComputedStyle(tasksRow).flexWrap,
          gap: getComputedStyle(tasksRow).gap,
          width: tasksRow.offsetWidth
        } : null
      };
    });

    results.push({ viewport: vp, layout, shotPath });
    await page.close();
  }

  await browser.close();
  return results;
}

function analyzeWithVision(imagePath, viewportName) {
  return new Promise((resolve) => {
    const imgB64 = fs.readFileSync(imagePath).toString('base64');
    
    const payload = JSON.stringify({
      model: VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: `You are a UI/UX testing agent. Analyze this ${viewportName} dashboard screenshot. Check: 1) Are stat pills (Complete/Active/Pending/Review) equal size in an even row? 2) Is ROI button full width below? 3) Is main content centered? 4) Any overlapping/truncated/misaligned elements? 5) Rate 1-5. List issues as PASS or FAIL.` },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${imgB64}` } }
        ]
      }]
    });

    const req = http.request('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENROUTER_KEY}`, 'Content-Type': 'application/json' }
    }, (res) => {
      let body = '';
      res.on('data', (d) => body += d);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve(data.choices?.[0]?.message?.content || 'No response');
        } catch (e) {
          resolve(`Vision error: ${body.substring(0, 200)}`);
        }
      });
    });
    req.on('error', (e) => resolve(`Request error: ${e.message}`));
    req.write(payload);
    req.end();
  });
}

async function runLayoutChecks(results) {
  console.log('\n\n========================================');
  console.log('  LAYOUT METRICS');
  console.log('========================================');
  
  for (const r of results) {
    const vp = r.viewport;
    const l = r.layout;
    console.log(`\n[${vp.name} ${vp.width}px]`);
    
    if (l.root) {
      const rootDiff = Math.abs(parseFloat(l.root.paddingLeft) - parseFloat(l.root.paddingRight));
      console.log(`  Root padding: L=${l.root.paddingLeft} R=${l.root.paddingRight} ${rootDiff > 1 ? 'FAIL asymmetric' : 'PASS symmetric'}`);
    }
    if (l.main) {
      const mainDiff = Math.abs(parseFloat(l.main.paddingLeft) - parseFloat(l.main.paddingRight));
      console.log(`  Main padding: L=${l.main.paddingLeft} R=${l.main.paddingRight} ${mainDiff > 1 ? 'FAIL asymmetric' : 'PASS symmetric'}`);
      console.log(`  Main offset: ${l.main.offsetLeft}px, width: ${l.main.width}px`);
    }
    if (l.pills.length > 0) {
      const widths = l.pills.filter(p => !p.class.includes('tokens')).map(p => p.width);
      const minW = Math.min(...widths);
      const maxW = Math.max(...widths);
      const even = (maxW - minW) <= 2;
      console.log(`  Stat pills: ${widths.join('/')}px ${even ? 'PASS even' : 'FAIL uneven (' + (maxW - minW) + 'px diff)'}`);
      
      const tokenPill = l.pills.find(p => p.class.includes('tokens'));
      if (tokenPill) {
        const fullwidth = tokenPill.width >= (l.tasksRow?.width || 0) * 0.9;
        console.log(`  ROI button: ${tokenPill.width}px (row: ${l.tasksRow?.width}px) ${fullwidth ? 'PASS full width' : 'FAIL not full width'}`);
      }
    }
  }
}

async function main() {
  console.log('Visual UI/UX Tester for Vibeflow Dashboard');
  console.log('===========================================\n');

  const results = await captureAll();
  await runLayoutChecks(results);

  console.log('\n\n========================================');
  console.log('  VISION ANALYSIS');
  console.log('========================================');
  
  for (const r of results) {
    console.log(`\n[${r.viewport.name} ${r.viewport.width}px]`);
    const analysis = await analyzeWithVision(r.shotPath, r.viewport.name);
    console.log(analysis);
  }

  console.log('\n\nDone. Screenshots in ' + SCREENSHOT_DIR);
}

main().catch(e => { console.error(e); process.exit(1); });
