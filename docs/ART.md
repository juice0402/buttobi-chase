# 絵の一覧（ぶっとびチェイス）

決まりはネット副業プロジェクトの claude/game-art-rule.md（A＝AI で言葉から作った絵・B＝Canva のライブラリの素材入り・C＝コードや手描き）。このゲームは B を使わない。

| 名前 | 分け | 道具・作った日 | もと | 使う所 |
|---|---|---|---|---|
| assets/title.webp（1200×1800） | A | Canva の AI・2026-11-17 | 案B MAHbJNcTkzs → 描き直し MAHbJJibwyc（下のプロンプト）。こちらで窓を暗いガラスにぬり直し、ボンネットのマークのあとをぼかした | タイトル画面（縦）・ゲーム工房の表紙 |
| assets/title-wide.webp（1600×1200） | A | Canva の AI・2026-11-17 | MAHbJTicZaU（MAHbJJibwyc をもとに横長に描き直し）。窓は同じようにぬり直し | タイトル画面（横） |
| docs/kobo/icon.png（1024×1024） | A | Canva の AI・2026-11-17 | MAHbJbkNp3U（MAHbJJibwyc をもとに）。こちらで前のマークのあとをぼかした | アイコン（ゲーム工房・あとで App Store） |
| docs/kobo/cover.png（800×1200） | A＋C | 2026-11-17 | assets/title.webp の上にゲームのロゴ（コードの字・Dela Gothic One）。元は tools/cover/cover.html（しょーくんが案1「ロゴ上」を選んだ） | ゲーム工房の表紙 |
| ほかの絵（車・街・エフェクト・UI・あそびかたの絵） | C | コードで描く | src/index.html の drawing | ゲーム全体 |

- 書き出し：Canva の作業用デザイン DAHbJFrro48「ぶっとびチェイス 絵（作業用）」（1ページ目＝縦 1000×1500、2ページ目＝横 1600×1200、3ページ目＝アイコン 1024×1024）を PNG で書き出し → WebP（品質80）
- ロゴ・文字は絵に入れない（コードで Dela Gothic One・Zen Maru Gothic＝OFL）
- 音はすべてコード（dev/sound.js）

## プロンプト（Canva の generate-image）
- 案B（MAHbJNcTkzs・PORTRAIT_2_3）：Dynamic low three-quarter view of a toy car chase on a tabletop diorama. A small pink compact toy car speeds toward the viewer with a burst of blue nitro flame, toy police cars with flashing red and blue lights right behind it, one police car flipping in the air, wooden toy building blocks bursting outward. Motion blur, tilt-shift miniature photo look, warm afternoon light, vivid colors. Plenty of open sky at the top for a title. No text, no letters, no logos.
- 描き直し（MAHbJJibwyc・案B を参考の絵に）：Edit this image, keep the same scene, composition, lighting, colors and action. Remove every emblem, badge, logo and grille ornament from all cars, leaving smooth plain surfaces. Remove the driver and all people: the car windows show an empty interior with darker tinted glass, no faces, no figures. Make the pink car a chunky original toy car with simplified rounded toy proportions that does not resemble any real car model. Keep the blue nitro flames, the flipping police car, the flying wooden blocks and the warm sunset sky. No text, no letters, no logos.
- 横長（MAHbJTicZaU・LANDSCAPE_4_3・MAHbJJibwyc を参考の絵に）：Recompose this image as a wide landscape scene in the same style, lighting and colors. Place the pink toy car with blue nitro flames, the chasing police car and the flipping police car on the right half of the frame. Fill the left half with open warm sunset sky, a few flying wooden toy blocks and the empty road with a wooden barrier, leaving calm space on the left for a title. Cars have no emblems, no badges, no logos, and dark tinted windows with no people inside. No text, no letters, no logos.
- アイコン（MAHbJbkNp3U・SQUARE_1_1・MAHbJJibwyc を参考の絵に）：Square app icon in the same style, lighting and colors as this image: a close-up of the chunky pink toy car speeding toward the viewer at a slight angle with bright blue nitro flames bursting from behind, a couple of wooden toy blocks flying, warm sunset sky background with soft glow. The car fills most of the square and is centered, bold simple composition that stays readable when very small. The car has no emblem, no badge, no logo, and dark tinted windows with no people inside. No text, no letters, no logos, no border.

## 確かめたこと（2026-11-17）
- エンブレム・会社の印・文字・人の顔なし（拡大して見た）。ほかの作品の名前やキャラ名はプロンプトに入れていない
- 「人が描いた」とは書かない
