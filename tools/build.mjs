// 出口の index.html を作る：node tools/build.mjs（確かめるだけ：node tools/build.mjs --check）
// 元は src/index.html（わく）と、そこに書いた @@include <ファイル>@@ の行（src/css・src/sound・src/js）と assets/。
// @@include の行を、そのファイルの中身にそのまま置きかえてから、"../assets/<名前>" を data: URI に置きかえる。
// 遊ぶ人が開く index.html（ゲーム工房・App Store が取りこむ出口）は、いままでどおり1ファイルで動く。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
const NOTE = '<!-- 自動で作るファイル・手で直さない（元は src/index.html と assets/。node tools/build.mjs） -->';

let html = readFileSync(join(root, 'src/index.html'), 'utf8');
const parts = [];
html = html.replace(/^@@include ([\w./-]+)@@\n/gm, (_, name) => {
  const file = join(root, 'src', name);
  if (!existsSync(file)) throw new Error('src にない: ' + name);
  const text = readFileSync(file, 'utf8');
  if (!text.endsWith('\n')) throw new Error('src/' + name + ' の最後は改行にする');
  if (text.includes('@@include ')) throw new Error('src/' + name + ' の中に @@include は書かない');
  parts.push(name);
  return text;
});
if (html.includes('@@include ')) throw new Error('src/index.html の @@include は1行に1つ・行の頭から書く');
// 音は dev/sound.js（試聴ページのもと）と src/sound/ をつないだものが同じであること
const sound = parts.filter(n => n.startsWith('sound/')).map(n => readFileSync(join(root, 'src', n), 'utf8')).join('');
if (sound !== readFileSync(join(root, 'dev/sound.js'), 'utf8')) {
  console.error('src/sound/ をつないだものと dev/sound.js がちがう → 同じにする（sound-test.html も）'); process.exit(1);
}
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
  if (now !== html) { console.error('index.html が src/・assets/ とずれている → node tools/build.mjs'); process.exit(1); }
  console.log('index.html は最新');
} else {
  writeFileSync(out, html);
  console.log(`index.html ${html.length} 字` + (used.length ? `（埋めこみ: ${[...new Set(used)].join(' ')}）` : ''));
}
