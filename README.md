# 探索者職業図鑑

現実の職業をTRPG・キャラクター創作向けに独自編集した資料サイトです。260職を収録しています。

公開サイト: https://tetoriapot.github.io/occupation-atlas/

## 開発

Node.js 24 / pnpm 11.9.0を使用します。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

## GitHub Pages用ビルド

```sh
NEXT_PUBLIC_SITE_URL=https://tetoriapot.github.io/occupation-atlas pnpm build:pages
pnpm test:pages
```

PowerShellでは環境変数を先に設定します。

```powershell
$env:NEXT_PUBLIC_SITE_URL = 'https://tetoriapot.github.io/occupation-atlas'
pnpm build:pages
pnpm test:pages
pnpm start
```

出力先はout/。ローカル静的プレビューは http://localhost:3000/occupation-atlas/ です。
mainへのpush後、GitHub Actionsがビルド・検証・公開します。詳しくは[公開手順](docs/github-pages.md)を参照してください。

## 職業の追加・修正

data/occupations/ に1職業1JSONを置き、data/updates.jsonに更新内容を記載します。
pnpm data:buildでスキーマ・重複・関連職業・日付・参考URLを検証します。
pnpm test:unitで検索・比較・診断等の回帰テストを実行できます。

## コンテンツについて

公式ルールブックの文章・技能値を転載したものではありません。探索者適性は創作やRPへの取り入れやすさを示す独自評価であり、ゲームルールではありません。
仕事内容・資格等は日本国内の一般像を基本とし、地域・所属・経験で異なります。各ページに参考資料を記載しています。
候補保存はブラウザーごとのローカル保存です。別ドメインの保存内容は自動移行されません。
