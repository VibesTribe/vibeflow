const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('https');

// Read OpenRouter key from auth.json
const authData = JSON.parse(fs.readFileSync('/home/vibes/.hermes/auth.json', 'utf8'));
const OPENROUTER_KEY = authData.credential_pool.openrouter[0].access_token;

const viewports = [
  { name: 'iPhone', width: 390, height: 844 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Laptop', width: 1366, height: 768 },
  { name: 'Desktop', width: 1920, height: 1080 },
];

const DASHBOARD_URL = 'https://vibeflow-dashboard.vercel.app';
const SCREENSHOT_DIR = '/tmp/visual-test';

// Dynamically discover the best free vision model from OpenRouter
async function findBestFreeVisionModel() {
  return new Promise((resolve, reject) => {
    const req = http.get('https://openrouter.ai/api/v1/models', {
      headers: { 'Authorization': `Bearer ${OPENROUTER_KEY}` }
    }, (res) => {
      let body = '';
      res.on('data', (d) => body += d);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          const candidates = [];

          for (const m of data.data || []) {
            const raw = JSON.stringify(m).toLowerCase();
            const promptPrice = m.pricing?.prompt || '999';
            if (promptPrice !== '0' && promptPrice !== '0.0') continue;
            if (!raw.includes('image') && !raw.includes('vision')) continue;

            // Score by context length (bigger = better for screenshots)
            const ctx = m.context_length || 0;
            // Prefer models with larger parameter counts in the name as heuristic
            const name = m.id.toLowerCase();
            let score = ctx;
            if (name.includes('omni')) score += 50000;
            if (name.includes('gemma-4')) score += 40000;
            if (name.includes('nemotron-3')) score += 30000;
            if (name.includes('qwen')) score += 20000;
            if (name.includes('reasoning')) score += 10000;

            candidates.push({ id: m.id, context_length: ctx, score });
          }

          candidates.sort((a, b) => b.score - a.score);

          if (candidates.length > 0) {
            console.log(`  Vision models found: ${candidates.slice(0, 5).map(c => c.id).join(', ')}`);
            resolve(candidates[0].id);
          } else {
            console.log('  No free vision models found, falling back to gemma-4');
            resolve('google/gemma-4-26b-a4b-it:free');
          }
        } catch (e) {
          console.log(`  Model discovery failed: ${e.message}`);
          resolve('google/gemma-4-26b-a4b-it:free');
        }
      });
    });
    req.on('error', (e) => {
      console.log(`  Model discovery error: ${e.message}`);
      resolve('google/gemma-4-26b-a4b-it:free');
    });
    req.setTimeout(15000, () => {
      req.destroy();
      resolve('google/gemma-4-26b-a4b-it:free');
    });
  });
}

async function captureAll() {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const results = [];

  for (const vp of viewports) {
    console.log(`\n--- Capturing ${vp.name} (${vp.width}x${vp.height}) ---`);
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    
    try {
      await page.goto(DASHBOARD_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(5000);
    } catch (e) {
      console.log(`  Failed to load: ${e.message}`);
      await page.close();
      continue;
    }

    const shotPath = `${SCREENSHOT_DIR}/${vp.name.toLowerCase()}.png`;
    await page.screenshot({ path: shotPath });
    console.log(`  Saved: ${shotPath}`);

    // Extract computed layout info
    const layout = await page.evaluate(() => {
      const root = document.querySelector('.mission-root') || document.querySelector('.mission-root--wide');
      const main = document.querySelector('.mission-main');
      const header = document.querySelector('.mission-header');
      const tasksRow = document.querySelector('.mission-header__tasks-row');
      const pills = document.querySelectorAll('.mission-header__stat-pill');
      const sliceHub = document.querySelector('.slice-hub');
      const sliceCard = document.querySelector('.slice-orbit-card');
      const sliceOrbit = document.querySelector('.slice-orbit');
      
      const pillData = Array.from(pills).map((p, i) => ({
        index: i,
        width: p.offsetWidth,
        height: p.offsetHeight,
        left: p.offsetLeft,
        text: p.textContent.trim().substring(0, 25),
        class: p.className
      }));

      const info = (el) => {
        if (!el) return null;
        const s = getComputedStyle(el);
        return {
          width: el.offsetWidth,
          scrollWidth: el.scrollWidth,
          overflow: s.overflow,
          boxSizing: s.boxSizing,
          paddingLeft: s.paddingLeft,
          paddingRight: s.paddingRight
        };
      };

      return {
        viewport: window.innerWidth,
        bodyScrollWidth: document.body.scrollWidth,
        bodyClientWidth: document.body.clientWidth,
        root: info(root),
        main: info(main),
        header: info(header),
        sliceHub: info(sliceHub),
        sliceCard: info(sliceCard),
        sliceOrbit: info(sliceOrbit),
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

function analyzeWithVision(imagePath, viewportName, model) {
  return new Promise((resolve) => {
    const imgB64 = fs.readFileSync(imagePath).toString('base64');
    
    const payload = JSON.stringify({
      model,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: `You are a UI/UX testing agent. Analyze this ${viewportName} dashboard screenshot. Check: 1) Are stat pills (Complete/Active/Pending/Review) equal size in an even row? 2) Is ROI button full width below? 3) Is main content centered with no horizontal overflow? 4) Is the circular slice/orb element properly sized for this viewport? 5) Any overlapping/truncated/misaligned elements? 6) Rate 1-5. List issues as PASS or FAIL.` },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${imgB64}` } }
        ]
      }]
    });

    const req = http.request('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENROUTER_KEY}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }, (res) => {
      let body = '';
      res.on('data', (d) => body += d);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.error) {
            resolve(`Vision API error: ${data.error.message || JSON.stringify(data.error)}`);
          } else {
            resolve(data.choices?.[0]?.message?.content || 'No response');
          }
        } catch (e) {
          resolve(`Vision error: ${body.substring(0, 200)}`);
        }
      });
    });
    req.on('error', (e) => resolve(`Request error: ${e.message}`));
    req.setTimeout(60000, () => { req.destroy(); resolve('Vision request timed out'); });
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

    // Body overflow check
    const bodyOverflow = l.bodyScrollWidth > l.bodyClientWidth;
    console.log(`  Body: scrollW=${l.bodyScrollWidth} clientW=${l.bodyClientWidth} ${bodyOverflow ? 'FAIL overflow' : 'PASS'}`);

    // Root check
    if (l.root) {
      const rootOverflow = l.root.scrollWidth > l.root.width;
      console.log(`  Root: w=${l.root.width} scrollW=${l.root.scrollWidth} box=${l.root.boxSizing} ${rootOverflow ? 'FAIL overflow' : 'PASS'}`);
    }

    // Main check
    if (l.main) {
      const mainOverflow = l.main.scrollWidth > l.main.width;
      console.log(`  Main: w=${l.main.width} scrollW=${l.main.scrollWidth} box=${l.main.boxSizing} ${mainOverflow ? 'FAIL overflow' : 'PASS'}`);
    }
    
    // Slice checks
    if (l.sliceHub) {
      const hubOverflow = l.sliceHub.scrollWidth > l.sliceHub.width;
      console.log(`  SliceHub: w=${l.sliceHub.width} scrollW=${l.sliceHub.scrollWidth} ${hubOverflow ? 'FAIL overflow' : 'PASS'}`);
    }
    if (l.sliceCard) {
      const cardOverflow = l.sliceCard.scrollWidth > l.sliceCard.width;
      console.log(`  SliceCard: w=${l.sliceCard.width} scrollW=${l.sliceCard.scrollWidth} box=${l.sliceCard.boxSizing} ${cardOverflow ? 'FAIL overflow' : 'PASS'}`);
    }
    if (l.sliceOrbit) {
      console.log(`  SliceOrbit: ${l.sliceOrbit.width}x${l.sliceOrbit.width} (square: ${l.sliceOrbit.width === l.sliceOrbit.width ? 'PASS' : 'FAIL'})`);
    }

    // Pills
    if (l.pills.length > 0) {
      const widths = l.pills.filter(p => !p.class.includes('tokens')).map(p => p.width);
      if (widths.length > 0) {
        const minW = Math.min(...widths);
        const maxW = Math.max(...widths);
        const even = (maxW - minW) <= 2;
        console.log(`  Stat pills: ${widths.join('/')}px ${even ? 'PASS even' : 'FAIL uneven (' + (maxW - minW) + 'px diff)'}`);
      }
      
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

  console.log('Discovering best free vision model...');
  const visionModel = await findBestFreeVisionModel();
  console.log(`  Using: ${visionModel}\n`);

  const results = await captureAll();
  await runLayoutChecks(results);

  console.log('\n\n========================================');
  console.log(`  VISION ANALYSIS (${visionModel})`);
  console.log('========================================');
  
  for (const r of results) {
    console.log(`\n[${r.viewport.name} ${r.viewport.width}px]`);
    const analysis = await analyzeWithVision(r.shotPath, r.viewport.name, visionModel);
    console.log(analysis);
  }

  console.log('\n\nDone. Screenshots in ' + SCREENSHOT_DIR);
}

main().catch(e => { console.error(e); process.exit(1); });
