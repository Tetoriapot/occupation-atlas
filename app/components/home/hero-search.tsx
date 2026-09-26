import Link from "next/link";
import { sitePath } from "@/app/lib/site-path";

type HeroSearchProps = {
  occupationCount: number;
  categoryCount: number;
};

const quickSearches = [
  { label: "調査が得意", href: "/occupations?aptitude=investigation" },
  { label: "交渉が得意", href: "/occupations?aptitude=negotiation" },
  { label: "初心者おすすめ", href: "/occupations?aptitude=beginnerFriendly" },
  { label: "医療の仕事", href: "/occupations?category=medical" },
];

export function HeroSearch({ occupationCount, categoryCount }: HeroSearchProps) {
  return (
    <section className="home-hero" aria-labelledby="home-title">
      <div className="shell home-hero-grid">
        <div className="home-hero-copy">
          <p className="eyebrow">OCCUPATION ARCHIVE FOR CREATORS</p>
          <h1 id="home-title">
            現実の仕事から、
            <span>物語の人物像をつくる。</span>
          </h1>
          <p className="home-hero-lead">
            仕事内容と一日の流れ、人物造形やシナリオ導入のヒントを一緒に引ける、
            TRPGプレイヤーと創作者のための職業図鑑です。
          </p>

          <form className="hero-search" action={sitePath("/occupations/")} method="get" role="search">
            <label htmlFor="home-occupation-search">職業名・知識・能力から探す</label>
            <div className="hero-search-row">
              <input
                id="home-occupation-search"
                name="q"
                type="search"
                placeholder="例：刑事、心理学、コンピューター"
                autoComplete="off"
              />
              <button type="submit">図鑑を検索</button>
            </div>
          </form>

          <nav className="quick-searches" aria-label="おすすめの検索条件">
            <span>すぐに探す</span>
            {quickSearches.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <aside className="archive-counter" aria-label="図鑑の掲載状況">
          <p className="archive-counter-label">現在の収録</p>
          <p className="archive-counter-number">
            <strong>{occupationCount.toLocaleString("ja-JP")}</strong>
            <span>職業</span>
          </p>
          <p>{categoryCount}カテゴリーから人物像を探せます</p>
          <dl>
            <div>
              <dt>現実の仕事</dt>
              <dd>基礎情報</dd>
            </div>
            <div>
              <dt>物語での役割</dt>
              <dd>創作ヒント</dd>
            </div>
            <div>
              <dt>得意分野</dt>
              <dd>独自評価</dd>
            </div>
          </dl>
          <small>※特定のゲームルールや数値データではありません。</small>
        </aside>
      </div>
    </section>
  );
}
