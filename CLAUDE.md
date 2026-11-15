# ぶっとびチェイス（記号 race）

派手なクラッシュの縦スクロール・カーチェイス。スマホ縦と iPad（縦・横）で遊ぶ。企画と決まったことは、ネット副業プロジェクトの claude/race-game-idea.md（最新の状態はそちら）。

## ファイル
- index.html：ゲーム本体（1ファイル）。最初の script が音（window.RaceSound・コードで鳴らす）、次の script がゲーム
- sound-test.html：音の試聴ページ（sound.js と同じ中身を入れたもの）
- dev/sound.js：音のもと。直したら index.html と sound-test.html の中身も同じにする
- dev/tests/：playwright のテスト（/usr/bin/google-chrome で動かす）。dbg.py＋f1.py（通しの流れ）・m1.py（ミッション）・final.py（街4つを自動運転）・perf.py（重さ）・t2.py（街×車のバランス）・t6.py（最初からの通し）・t7.py（古いセーブ）・t8.py（音のつなぎ）

## 決まり
- file: で開いたときだけ window.__butto がある（get・save・load・start・sim・garage・pause）。公開ページにはない
- 試しに遊ぶページ（アーティファクト）https://claude.ai/artifact/9MNEHG5BAX88qBR5FT1h45 にも同じ中身を出している。アーティファクトはスケルトン（doctype・head）なしの中身だけで出す
- 絵・音・コインのしくみを変えるときは claude/game-art-rule.md（音はコードで作る・運でコインを増やさない）
- 直したら node --check（ゲームの script）と dev/tests/f1.py・final.py でエラー0を確かめる
- ライセンスファイルは置かない（著作権はしょーくんのまま）
