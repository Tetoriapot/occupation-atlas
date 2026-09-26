import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div>
          <p className="footer-brand">探索者職業図鑑</p>
          <p className="footer-copy">
            現実の仕事を知り、物語の人物像を深くするための創作資料庫です。
          </p>
        </div>
        <nav aria-label="フッターナビゲーション">
          <Link href="/occupations">職業を探す</Link>
          <Link href="/categories">カテゴリー</Link>
          <Link href="/updates">更新情報</Link>
          <Link href="/about">編集方針・免責事項</Link>
        </nav>
      </div>
      <div className="shell footer-note">
        <p>本サイトの探索者適性・技能イメージは、特定のゲームルールを示すものではありません。</p>
        <p>© 2026 探索者職業図鑑</p>
      </div>
    </footer>
  );
}
