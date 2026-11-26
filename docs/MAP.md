# ぶっとびチェイス 地図（2026-11-22・ver 1.5。ファイルの分け方は夜の作業 #1）

読み方：この地図 → `grep -n` で関数名・文字をさがす（`grep -rn 名前 src/`）→ その前後だけ読む → Edit で変わる所だけ直す → `node tools/build.mjs`。丸ごと読む・書き直すことはしない。出口の index.html は読まない（絵の base64 が入っている）。

## ビルドと確かめ
- `node tools/build.mjs`（`npm run build`）：src/index.html（わく）の `@@include <ファイル>@@` の行を、そのファイルの中身にそのまま置きかえ、`../assets/<名前>` を data: URI にして、出口の index.html を作る
- `node tools/build.mjs --check`（`npm test`）：出口の index.html が src/・assets/ と同じか、src/sound/ をつないだものが dev/sound.js と同じかを見る（ちがえば止まる）
- **index.html は自動で作るファイル。手で直さない**（直すのは src/ と assets/）。出口なのでコミットはする
- src の .js はつないで1つの script になる（ファイルの切れ目は関数・節の切れ目。1つだけでは動かない）。分けかたを変えても、つないだ中身が同じなら出口は1バイトも変わらない

## ファイル
| ファイル | 役目 |
|---|---|
| src/index.html | わく（163行）：doctype・head・`<style>`・HTML（canvas・HUD・あそびかた・タイトル・リザルト・ガレージ・設定・一時停止）・`<script>` と、下のファイルをつなぐ `@@include` の行（この順につなぐ） |
| src/css/screens.css | CSS：道と全体・走る画面の上（HUD）・タイトル（タイトルの絵・縦／iPad 縦／横）・リザルト・ガレージ（整備室 .bay・ポイント .ptbar・.pts）・あそびかた |
| src/css/sheets-sizes-motion.css | CSS：一時停止と設定の板（.ov・.sheet）・画面の大きさごと（背の低いスマホ・背の高いスマホ・iPad 横・タブレット・iPad 縦・iPad 横）・作りこみの動き（fx…・火花 .spk・動きをへらす設定）・garage sizes |
| src/sound/1-tools.js〜4-loops-api.js | script 1：音（window.RaceSound）。1 道具と楽譜・2 曲（makeSong・Player）・3 効果音（SE）・4 エンジンとサイレン・API。4つをつなぐと dev/sound.js と同じ |
| src/js/01-data-save.js | 定数・TOWNS（街）・CARS（車15台・0番は軽自動車）・TITLES（称号）・STAT_MAX・PT_PRICES・UPGRADES・セーブ（SAVE_KEY・古いセーブの直し・carV）・TOWN_MIS・DAILY |
| src/js/02-state-road.js | 道具（helpers・snd・sndDo・hap＝アプリの振動）・state（スピードのフロー flowT…）・追っ手の作戦・道のしかけ（工事・かべ） |
| src/js/03-crash-effects.js | クラッシュ（tryBoost・nitroBlast・nitroHit・impactOn・RAM_SELF）・エフェクト・toy look & crash juice |
| src/js/04-ai.js | 追っ手の AI |
| src/js/05-update.js | update |
| src/js/06-draw-cars.js | 描く（drawing）の頭：toyGloss・toyUnder・drawPart・drawVehicle・carSprite・ニトロの光・block（積み木の建物）・こわれた建物 |
| src/js/07-draw-ground.js | 地面の帯（groundStamp・drawGround・drawGroundLive）・工事・看板・draw（フローのスピード線・ニトロの線は終わり） |
| src/js/08-hud-garage.js | HUD とメニュー（hud・carPic）・作りこみの動きの道具（RM・fxRestart・fxLines・fxIn・tilesIn・fxCount・openOv / closeOv・fxGo）・ガレージ（renderHero・renderPanel・drawBay・bayFx・renderTown・renderGarage・openGarage・fxGot・fxHero） |
| src/js/09-result-title.js | 走りの終わり（finishRun）・指のヒント・一時停止・音のスイッチ・あそびかた（TUT・showTut・drawTut）・タイトル（showTitle・leaveTitle）・iOS のタップ |
| src/js/10-input-boot.js | 入力（指・キー・ボタン。ガレージのタップは $('garage') の click）・Game Center（gcScore・gcSync・ガレージのトロフィー #openRank）・ループ（frame）・自動運転（autoDrive）・window.__butto（file: で開いたときだけ・アプリの中にはない）・App Store のスクショの場面（runShot・shotSave）・起動（boot） |
| assets/ | 絵のファイル（一覧と出どころは docs/ART.md） |
| tools/build.mjs | 上の「ビルドと確かめ」 |
| index.html | 出口（遊ぶ人が開く・ゲーム工房と App Store が取りこむ・アーティファクトもここから）。自動で作る・手で直さない・読まない |
| sound-test.html | 音の試聴ページ（dev/sound.js と同じ中身） |
| dev/sound.js | 音のもと。直したら src/sound/ と sound-test.html も同じにする（`--check` が src/sound/ とのずれを見る） |
| dev/tests/ | playwright のテスト（CLAUDE.md） |
| dev/out/ | テストが作るファイル（読まない・コミットしない） |
| RELEASES.md・.github/workflows/release.yml・tools/release/ | ゲーム工房に出す版。main に入るとまだタグのない版にタグと Releases を作る |

## 決まり
- 動き（animation）の名前は fx ではじめる。押したときだけの1回の動き（くり返す・下から出る動きは入れない）。中身はすぐ進み、動きは見た目だけ。RM() が true（動きをへらす設定・window.__NOFX）なら動かさない
- メニューの文：語りかけ（〜よ・〜ね・〜しよう）なし・「！」なし（リザルトの「にげきった！」「クラッシュ！」はそのまま）。説明は1行
- 走っている間は文の知らせを出さない（toast() はガレージだけ・tip() は空。11/17）。出すのは大きい1語のバナー（街の名前・ボス！・げきは！・クラッシュ！・にげきった！）・ゲージのヒント・クラッシュのコインだけ。警告は音と光で
- ならぶ枠は同じ高さ・幅（板のボタンは 56px、iPad は 64px）。すき間は 6 / 10 / 16
- 見た目は「積み木とトイカーのジオラマ」（11/17）。描く道具は drawing の頭：toyGloss（車のつや）・toyUnder（ひっくり返った車の裏）・drawPart（飛ぶ部品と積み木）。建物は block()（木目・光る辺・上に小さい積み木／屋根／丸い積み木／雪）、地面はフェルトの点々（texPat）
- クラッシュの作りこみは effects の下の「toy look & crash juice」：parts（タイヤ・ドア・ネジ）・blocksFly（道ばたの積み木が崩れる）・ring・stars・rollOver（転がって裏返る）・hitStop・bigCrash（一瞬スロー＋寄る）。時間のゆがみは frame() だけ（update と sim・テストは今までどおり）
- こわれた建物：broken（`セル番号:左右` → 1 こわれた／2 大爆発）・breakAt（かべドーン・道ばたの爆発で、建物のある街だけ）・rubble（低い土台・道へこぼれた積み木・ほこり）。drawGround が道のすぐ横の建物の代わりに描く。走りだすたびに空にする
- 軽量化（11/17）：止まっている地面（道・道ばた・建物・氷）は groundStamp が帯（GC_H=224）に1回だけ描いて、毎フレームは帯の絵を置くだけ（drawGround＝帯に描く中身、drawGroundLive＝毎フレーム描く踏切・スタンド・工事・ゴール）。建物がこわれたら gcDirty で帯を描き直す。車は carSprite が種類・色・大きさ・ランプの点滅ごとに絵にしておく（ロケットカーだけ毎回描く）。ニトロの光はぼかしではなく drawNitroGlow の絵
- 強化（11/17・20回目）：車ごとにポイントを買って（PT_MAX=7・値段は PT_PRICES×車の番号）、はやさ・かたさ・ニトロ・体当たりに振る（各 STAT_MAX=5）。全部は最大にできない。振りなおしは無料。セーブは save.up[車]（振った数）・save.pts[車]（買った数）・upV=2。ガレージのタブに数（何分の何）は出さない
- 体当たり（21回目）：自分から横・後ろでぶつけたときは自分のダメージ RAM_SELF（0.2倍）。正面の逆走車・交差点の車・ボス・タックル・はさみうちは今までどおり。ぶつけた車は横へ飛んで回る（ramT）、その残骸は RAM_GRACE 秒は当たっても痛くない
- スピードのフロー（21回目）：トップスピードの93%以上を FLOW_T1（3秒）・FLOW_T2（7秒）続けると段が上がる（flowLv・見た目の強さ flowK）。スピード線・車の後ろの風・カメラが少し引く（FLOW_ZOOM）・画面の横が光る・風の音（R.engine の3つ目）・段が上がると whoosh。当たる・遅くなる・85%を切ると0に。速さ・ルール・コインは変えない
- ニトロ（21回目）：始めに nitroBlast（衝撃波。すぐ横の車は nitroHit・少し先は押しのける・横の建物がくずれる・shock の音）。走っている間は道のはしの建物をくずす（edgeSmashT）、はね飛ばした車がかべに当たると建物がくずれる（nFling）。ニトロ中はヒットストップなし
- タイトルの絵（11/17）：assets/title.webp（縦）・title-wide.webp（横）。Canva の AI の絵（A）で、一覧と出どころは docs/ART.md。ロゴは絵に入れずコードの字。縦はロゴ上・ボタン下、iPad 縦（縦横比 3/5 以上）はロゴを左に、横は左にロゴとボタン
- iOS アプリ（ios-kobo・11/24）：アプリが入れる window.APP_* を使う。振動は hap()（APP_HAPTIC。ニトロ heavy・自分のクラッシュ light／追っ手 medium・大きいダメージ medium・クラッシュ error・にげきった success）。Game Center は1回のスコアの最高（save.hiScore）を APP_SCORE で送る（リザルトのたびと、ログインしたとき）。実績（11/26）は ACHIEVE の表（id と、セーブから取ったかを見る関数）→ gcAchieve：writeSave のたびに新しく取った分を APP_ACHIEVE で送り、開いたとき・ログインしたとき（gcSync）は全部送りなおす。id・名前・点・隠すか・バッジは docs/kobo/gamecenter.json（id を変えない・消して使い回さない）。ガレージの上のトロフィー（#openRank）はログインしてから出て、APP_RANKING を開く。ウェブ版では何も変わらない
- App Store のスクショ（file: で開いたときだけ）：`#shot=<場面>:<街>:<秒>:<車>` で、書きこまないデモのセーブ（shotSave）で場面を作って止める（shotHold）。run・nitro・boss・result・garage（<街> の数がタブ）。使っている場面は ios-kobo の apps/buttobi-chase/app.json の screenshots。ゲームの中身を変えたら、場面がずれていないか撮り直して見る（同じ数字なら毎回同じ絵・画面の大きさで中身はかわる）
- Game Center の実績のバッジ（11/26）：docs/kobo/achievements/<id>.png（1024×1024・RGB）は dev/badges.py が描く（dev/badges.js の SCENES・ゲームと同じ drawVehicle と block を __butto.art で借りる＝C の絵）。実績を足したら、gamecenter.json と ACHIEVE と SCENES に同じ id を足して `python3 dev/badges.py`・`python3 dev/tests/gc_check.py`。メダルのふちは点で色が変わる（10 銅・25 銀・50 金・100 赤）
