# ぶっとびチェイス（記号 race）

派手なクラッシュの縦スクロール・カーチェイス。スマホ縦と iPad（縦・横）で遊ぶ。企画と決まったことは、ネット副業プロジェクトの claude/race-game-idea.md（最新の状態はそちら）。

## ファイル
- src/：ゲームの元（直すのはここ）。src/index.html はわく（HTML と `@@include` の行）、src/css/（スタイル）・src/sound/（音＝window.RaceSound・コードで鳴らす）・src/js/（ゲーム）。どのファイルに何があるかは docs/MAP.md
- assets/：絵のファイル（タイトルの絵など。一覧と出どころは docs/ART.md）。src からは `../assets/<名前>` で指す
- index.html：遊ぶ人が開く出口（ゲーム工房・App Store が取りこむ）。`node tools/build.mjs` で src と assets から作る（絵は base64 で埋めこまれる）。手で直さない・読まない
- sound-test.html：音の試聴ページ（sound.js と同じ中身を入れたもの）
- dev/sound.js：音のもと。直したら src/sound/ と sound-test.html の中身も同じにする（`--check` が src/sound/ とのずれを見る）
- dev/tests/：playwright のテスト（/usr/bin/google-chrome で動かす）。dbg.py＋f1.py（通しの流れ）・m1.py（ミッション）・final.py（街4つを自動運転）・perf.py（重さ）・t2.py（街×車のバランス）・t6.py（最初からの通し）・t7.py（古いセーブ）・t8.py（音のつなぎ）・bal.py（バランス。python3 bal.py ../../index.html ship|lazy|line 6 で、ふつう／なまけ者／真ん中だけの自動運転をくらべる）

## 決まり
- 直す前に docs/MAP.md（地図）を見て、src/ の検索した所だけ読む。直したら `node tools/build.mjs`（出口の index.html を作り直す）
- 動きは fx… の名前で1回だけ（くり返す・下から出る動きなし）。メニューの文は語りかけなし・「！」なし（docs/MAP.md の決まり）
- file: で開いたときだけ window.__butto がある（get・save・load・start・sim・garage・pause）。公開ページにはない
- 試しに遊ぶページ（アーティファクト）https://claude.ai/artifact/9MNEHG5BAX88qBR5FT1h45 にも同じ中身を出している。アーティファクトは出口の index.html から、スケルトン（doctype・head）なしの中身だけで出す
- 絵・音・コインのしくみを変えるときは claude/game-art-rule.md（音はコードで作る・運でコインを増やさない）
- 直したら `node tools/build.mjs` → node --check（ゲームの script）と dev/tests/f1.py・final.py・ko_check.py（倒した種類の数え忘れ）でエラー0を確かめる。`node tools/build.mjs --check` で出口が最新かも見る
- ライセンスファイルは置かない（著作権はしょーくんのまま）
- ゲーム工房に出す版は RELEASES.md のいちばん上に足して PR（マージは司令塔）。main に入ると release.yml がタグと Releases を作り、司令塔が工房に取りこむ
