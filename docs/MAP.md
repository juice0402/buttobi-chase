# ぶっとびチェイス 地図（行は 2026-11-17・ver 1.5 の目安）

読み方：この地図 → `grep -n` で関数名・文字をさがす（src/index.html）→ その前後だけ読む → Edit で変わる所だけ直す → `node tools/build.mjs`。丸ごと読む・書き直すことはしない。出口の index.html は読まない（絵の base64 が入っている）。

## ファイル
| ファイル | 役目 |
|---|---|
| src/index.html | ゲームの元（直すのはここ・4,848行）。アーティファクトと同じ中身に、外側の doctype・head（1〜8行）をつけたもの。絵は `../assets/<名前>` で指す |
| assets/ | 絵のファイル（一覧と出どころは docs/ART.md） |
| tools/build.mjs | src/index.html と assets/ から出口の index.html を作る（`../assets/…` を data: URI に）。`--check` でずれを見る |
| index.html | 出口（遊ぶ人が開く・ゲーム工房と App Store が取りこむ・アーティファクトもここから）。自動で作る・手で直さない・読まない |
| sound-test.html | 音の試聴ページ（dev/sound.js と同じ中身） |
| dev/sound.js | 音のもと。直したら index.html の最初の script と sound-test.html も同じにする |
| dev/tests/ | playwright のテスト（CLAUDE.md） |
| dev/out/ | テストが作るファイル（読まない・コミットしない） |

## src/index.html
| 行 | 中身 |
|---|---|
| 16〜300 | CSS：16 道と全体・46 走る画面の上（HUD）・101 タイトル（117 タイトルの絵・縦／iPad 縦／横）・133 リザルト・169 ガレージ・277 あそびかた |
| 303〜322 | CSS：一時停止と設定の板（.ov・.sheet） |
| 357〜560 | CSS：画面の大きさごと（357 背の低いスマホ・388 背の高いスマホ・408 iPad 横・423 タブレット・528 iPad 縦・540 iPad 横）。強化タブの整備室（.bay）・ポイント（.ptbar・.pts）はガレージの CSS の終わり（254 あたり） |
| 560〜625 | CSS：作りこみの動き（fx…・fxrattle・fxlift・火花 .spk）と、動きをへらす設定のとき止める動き。最後に「garage sizes」（ガレージの高さをそろえる・21回目） |
| 625〜745 | HTML：canvas・HUD・あそびかた・タイトル・リザルト・ガレージ・設定・一時停止 |
| 748〜1950 | script 1：音（window.RaceSound）。dev/sound.js と同じ |
| 1959〜2250 | データ：1971 TOWNS（街）・2037 CARS（車15台・0番は軽自動車）・2081 TITLES（称号）・2110 STAT_MAX・PT_PRICES・UPGRADES（強化のポイント）・2120 セーブ（SAVE_KEY・古いセーブのポイントへの直し・carV の車の入れかえ）・2195 TOWN_MIS（街のミッション）・2202 DAILY（今日のミッション） |
| 2251〜3372 | 走る中身：2251 state（スピードのフロー flowT…）・2351 追っ手の作戦・2407 道のしかけ・2550 クラッシュ（tryBoost・nitroBlast・nitroHit・体当たり impactOn・RAM_SELF）・2757 エフェクト（2780 toy look & crash juice）・2850 追っ手のAI・3154 update |
| 3373〜4184 | 描く（drawing）。車の絵（drawVehicle）・地面の帯（groundStamp）・draw（フローのスピード線・ニトロの線は draw の終わり） |
| 4185 | HUD とメニューの共通（hud・carPic） |
| 4235 | 作りこみの動きの道具：RM（動きを止めるか）・fxRestart・fxLines（スピード線）・fxIn（横から入る）・tilesIn（タイルを左上から敷く）・fxCount（数字のかぞえ上げ）・openOv / closeOv（板が横から入って左へ出ていく）・fxGo（走りだしの線） |
| 4301 | ガレージ：renderHero・renderPanel（強化タブ＝整備室・ポイント・振り分け）・drawBay（整備室の絵）・bayFx（揺れ・持ち上がり・火花）・renderTown・renderGarage・openGarage・fxGot・fxHero |
| 4481 | 走りの終わり：finishRun（リザルトの中身と動き） |
| 4602 | あそびかた：TUT（カード3枚の絵と文）・showTut・drawTut・タイトル（showTitle・leaveTitle。タップかキーを待ってからスタート） |
| 4671 | 入力：指・キー・ボタン（ガレージのタップは $('garage') の click にまとまっている。強化は pt-buy・st-add・st-sub・respec） |
| 4786 | ループと起動。4803 window.__butto（file: で開いたときだけ）・4830 boot |

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
