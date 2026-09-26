# GitHub Pagesでの公開

## 構成

- 公開用リポジトリ: https://github.com/Tetoriapot/occupation-atlas
- 公開先: https://tetoriapot.github.io/occupation-atlas/
- Next.jsの `output: export` で静的ページを生成。既存のSites用 `pnpm build` は変更しない。
- 全260職・20カテゴリーと固定ページを生成し、検索・候補保存・比較・本日の一職はブラウザーで動作する。
- GitHub Pagesにはサーバー、Cloudflare Worker、認証情報は不要。

## ローカルの確認

Node.js 24とpnpm 11.9.0を利用する。

```powershell
pnpm install --frozen-lockfile
$env:NEXT_PUBLIC_SITE_URL = 'https://tetoriapot.github.io/occupation-atlas'
pnpm build:pages
pnpm test:pages
```

出力先は `out/`。`file://` で直接開くのではなく、`/occupation-atlas/` を `out/` に対応させた静的HTTPサーバーで確認する。

## 公開と更新

GitHubのSettings → PagesでSourceを「GitHub Actions」にする。`main` へpushすると `.github/workflows/pages.yml` が静的出力、全ページのURL・アセット確認、公開を順に実行する。手動実行はActionsの「Deploy occupation atlas to GitHub Pages」から行う。

データ更新は `data/occupations/` のJSONを編集し、`data/updates.json` に変更内容を追記する。職業が増えても個別の公開設定は不要。`.nojekyll` を生成し、`_next/` 以下のアセットも配信する。

GitHub用の公開ソースは、従来の非公開作業履歴・`.openai`・ローカルログ・認証情報を含めず、必要なコードと職業データだけを複製する。旧Sitesの公開版は自動で更新・停止しない。

## 制約

- 旧ドメインのlocalStorageは引き継がれないため、候補保存は新サイトでも行う必要がある。
- 不明なパスはGitHub Pagesの404として扱う。既存の職業ページは静的ファイルとして直接開ける。
- プロジェクトサイト配下のrobots.txtはドメイン直下のrobots.txtを管理するものではない。
- 公開先を変更する場合は `NEXT_PUBLIC_SITE_URL` を変えて再ビルドする。検索索引・共有URL・canonical・OG画像・サイトマップも追従する。
