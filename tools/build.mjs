// 出口の index.html を作る：node tools/build.mjs（確かめるだけ：node tools/build.mjs --check）
// 元は src/index.html と assets/。src の中の "../assets/<名前>" を、そのファイルの data: URI に置きかえる。
// 遊ぶ人が開く index.html（ゲーム工房・App Store が取りこむ出口）は、いままでどおり1ファイルで動く。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
const NOTE = '<!-- 自動で作るファイル・手で直さない（元は src/index.html と assets/。node tools/build.mjs） -->';

let html = readFileSync(join(root, 'src/index.html'), 'utf8');
const used = [];
html = html.replace(/\.\.\/assets\/([\w.-]+)/g, (_, name) => {
  const mime = MIME[extname(name).toLowerCase()];
  if (!mime) throw new Error('assets の種類がわからない: ' + name);
  const file = join(root, 'assets', name);
  if (!existsSync(file)) throw new Error('assets にない: ' + name);
  used.push(name);
  return `data:${mime};base64,` + readFileSync(file).toString('base64');
});
if (!/^<!doctype html>/i.test(html)) throw new Error('src/index.html の1行目は <!doctype html> にする');
html = html.replace(/^<!doctype html>/i, m => m + NOTE);

const out = join(root, 'index.html');
if (process.argv.includes('--check')) {
  const now = existsSync(out) ? readFileSync(out, 'utf8') : '';
  if (now !== html) { console.error('index.html が src/index.html・assets/ とずれている → node tools/build.mjs'); process.exit(1); }
  console.log('index.html は最新');
} else {
  writeFileSync(out, html);
  console.log(`index.html ${html.length} 字` + (used.length ? `（埋めこみ: ${[...new Set(used)].join(' ')}）` : ''));
}
