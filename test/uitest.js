const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] }).catch(async () => chromium.launch({ args: ['--no-sandbox'] }));
  const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  await p.route('**/three.min.js', r => r.fulfill({ contentType: 'application/javascript', body: require('fs').readFileSync(__dirname + '/stub-three.js', 'utf8') }));
  await p.route('**/fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  await p.goto('file:///home/user/pmg3d/pmg3d-viewer.html');
  await p.waitForTimeout(6000);
  console.log('loading hidden:', await p.$eval('#loading', e => e.hidden), '| text:', await p.$eval('#loading', e => e.textContent));
  for (const v of ['front', 'tq', 'left', 'right', 'back', 'top', 'face']) { await p.click(`[data-view=${v}]`); }
  for (const id of ['zin', 'zout', 'fit', 'resetView']) await p.click('#' + id);
  for (const l of ['warm', 'cool', 'soft']) await p.click(`[data-light=${l}]`);
  await p.fill('#c-blazer', '#224466').catch(() => {}); await p.$eval('#c-blazer', e => { e.value = '#224466'; e.dispatchEvent(new Event('input', { bubbles: true })); });
  await p.$eval('#s-dir', e => { e.value = 90; e.dispatchEvent(new Event('input', { bubbles: true })); });
  await p.$eval('#s-int', e => { e.value = 1.4; e.dispatchEvent(new Event('input', { bubbles: true })); });
  await p.$eval('#s-exp', e => { e.value = 1.2; e.dispatchEvent(new Event('input', { bubbles: true })); });
  await p.$eval('#s-rough', e => { e.value = 0.5; e.dispatchEvent(new Event('input', { bubbles: true })); });
  await p.click('#t-wire'); await p.click('#t-floor'); await p.click('#resetAll');
  const box = await p.$('#stage canvas'); const bb = await box.boundingBox();
  await p.mouse.move(bb.x + 300, bb.y + 300); await p.mouse.down(); await p.mouse.move(bb.x + 400, bb.y + 320); await p.mouse.up(); await p.mouse.wheel(0, 200);
  console.log('state after reset:', JSON.stringify(await p.evaluate(() => window.__viewer.state)));
  console.log('errors:', errs.length ? errs.join('\n') : 'none');
  await b.close();
})();
