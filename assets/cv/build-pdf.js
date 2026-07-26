/* ============================================================
   Renders assets/cv/resume.html → assets/CV.pdf via headless Chrome.

   Run from the project root:  node assets/cv/build-pdf.js

   The page box is A4 because that is what the résumé was designed
   against. The previous CV.pdf was printed to US Letter, which is
   shorter than A4 by 1.23in — that leftover showed up as a band of
   blank space at the foot of the page.

   --no-pdf-header-footer suppresses Chrome's date/URL/page-count
   stamps; resume.html's own `@page { margin: 0 }` does the same for a
   manual Ctrl+P, so both routes produce the same document.
   ============================================================ */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const SRC = path.join(HERE, 'resume.html');
const OUT = path.join(HERE, '..', 'CV.pdf');

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

const chrome = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
if (!chrome) {
  console.error('No Chrome/Edge found. Set CHROME_PATH to the browser binary.');
  process.exit(1);
}
if (!fs.existsSync(SRC)) {
  console.error('Missing ' + SRC);
  process.exit(1);
}

/* Chrome refuses to overwrite through a symlink and appends nothing —
   clear the target so a failed run can't leave the old file in place. */
if (fs.existsSync(OUT)) fs.rmSync(OUT);

execFileSync(chrome, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--print-to-pdf=' + OUT,
  '--no-pdf-header-footer',
  /* webfonts are fetched over the network; give the page time to settle
     so Public Sans is embedded rather than falling back to Arial */
  '--virtual-time-budget=15000',
  'file:///' + SRC.replace(/\\/g, '/'),
], { stdio: 'inherit' });

const size = fs.statSync(OUT).size;
console.log('Wrote ' + path.relative(process.cwd(), OUT) + ' (' + Math.round(size / 1024) + ' KB)');
