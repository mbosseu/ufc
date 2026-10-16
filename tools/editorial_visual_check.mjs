/** Contrôle réellement les pages produites, captures et géométrie de l'affiche. */
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
const require = createRequire(import.meta.url);
let pw;
for (const name of [process.env.PLAYWRIGHT_MODULE, 'playwright', 'playwright-core',
  process.platform === 'win32' && `${process.env.USERPROFILE}/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright`].filter(Boolean)) {
  try { pw = require(name); break; } catch { /* essayer le suivant */ }
}
if (!pw) throw new Error('Installer playwright ou définir PLAYWRIGHT_MODULE dans .env.local.');
const executablePath = process.env.CHROME_PATH || (process.platform === 'win32' && existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe') ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined);
const browser = await pw.chromium.launch({headless:true, ...(executablePath ? {executablePath} : {})});
if (process.argv[2] === '--doctor') { await browser.close(); console.log('Navigateur disponible.'); process.exit(0); }
const [rootArg, slug, out] = process.argv.slice(2);
if (!rootArg || !/^[a-z0-9-]+$/.test(slug || '') || !out) throw new Error('Usage : node tools/editorial_visual_check.mjs SITE SLUG DOSSIER_PRIVE');
const root = resolve(rootArg);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.svg':'image/svg+xml'};
const server = createServer((req,res)=>{
  const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file = resolve(root,'.'+pathname+(pathname.endsWith('/') ? 'index.html' : ''));
  if (!file.startsWith(root+sep) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200,{'Content-Type':types[extname(file)] || 'application/octet-stream'}); res.end(readFileSync(file));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base = process.env.EDITORIAL_BASE_URL || `http://127.0.0.1:${server.address().port}`;
const results=[];
try {
  const page = await browser.newPage();
  await page.route('**/*',route=>route.request().url().startsWith(base+'/') ? route.continue() : route.abort());
  for (const [size,width,height] of [['desktop',1440,1000],['mobile',390,844]]) {
    await page.setViewportSize({width,height});
    for (const kind of ['article','accueil']) {
      await page.goto(base+(kind==='article' ? '/'+slug+'/' : '/'),{waitUntil:'networkidle'});
      const block=page.locator(kind==='article' ? '.article' : `.ed-lead[href="/${slug}/"]`);
      if (await block.count()!==1) throw new Error('Article absent de la page '+kind);
      const media=block.locator(kind==='article' ? '.figure.lead' : '.ed-lead-media');
      await media.scrollIntoViewIfNeeded();
      await page.evaluate(async()=>{ for(let y=0;y<document.documentElement.scrollHeight;y+=500){scrollTo(0,y);await new Promise(r=>setTimeout(r,30));} });
      await block.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      const geometry=await block.evaluate((el,kind)=>{
        const image=el.querySelector(kind==='article' ? '.figure.lead img' : '.ed-lead-media img');
        const rect=image.getBoundingClientRect();
        const holder=image.parentElement.getBoundingClientRect();
        const copy=el.querySelector(kind==='article' ? '.ah' : '.ed-lead-copy').getBoundingClientRect();
        const overlap=rect.left<copy.right-1 && rect.right>copy.left+1 && rect.top<copy.bottom-1 && rect.bottom>copy.top+1;
        return {overflow:document.documentElement.scrollWidth>innerWidth+1, loaded:image.complete&&image.naturalWidth>0,
          ratioError:Math.abs(rect.width/rect.height-image.naturalWidth/image.naturalHeight), overlap,
          clipped:rect.left<holder.left-1||rect.right>holder.right+1||rect.top<holder.top-1||rect.bottom>holder.bottom+1,
          sourceWidth:image.naturalWidth, sourceHeight:image.naturalHeight,
          outgoing:[...el.querySelectorAll('a[href]')].filter(a=>!a.getAttribute('href').startsWith('/') && new URL(a.href).hostname!=='ufc.fr').length};
      },kind);
      if(geometry.overflow||!geometry.loaded||geometry.ratioError>0.02||geometry.overlap||geometry.clipped||(kind==='article'&&geometry.outgoing)) throw new Error('Mise en page refusée : '+JSON.stringify({kind,size,...geometry}));
      await block.screenshot({path:resolve(out,`${kind}-${size}.png`),style:'body > header { visibility:hidden !important; }'});
      results.push({kind,size,...geometry});
    }
  }
  writeFileSync(resolve(out,'layout-qa.json'),JSON.stringify(results,null,2));
  console.log('Contrôles bureau/mobile : affiche entière, aucun chevauchement, aucun débordement.');
} finally { await browser.close(); await new Promise(r=>server.close(r)); }
