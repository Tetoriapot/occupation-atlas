import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { MobileMenu } from "./mobile-menu";

const navigation = [
  { href: "/occupations", label: "職業を探す" },
  { href: "/categories", label: "カテゴリー" },
  { href: "/updates", label: "更新情報" },
  { href: "/about", label: "この図鑑について" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link href="/" className="brand" aria-label="探索者職業図鑑 トップページ">
          <span className="brand-mark" aria-hidden="true">探</span>
          <span>
            <strong>探索者職業図鑑</strong>
            <small>OCCUPATION ARCHIVE</small>
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="メインナビゲーション">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href}>{item.label}</Link>
          ))}
        </nav>
        <div className="header-actions">
          <ThemeToggle />
          <MobileMenu>
            {navigation.map((item) => (
              <Link key={item.href} href={item.href}>{item.label}</Link>
            ))}
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}
