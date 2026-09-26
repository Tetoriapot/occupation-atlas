import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/app/components/layout/breadcrumbs";
import { absoluteUrl, sharedOpenGraphImage, siteConfig } from "@/app/lib/site";

export const metadata: Metadata = {
  title: "このサイトについて",
  description: "探索者職業図鑑の目的、編集方針、独自評価、掲載情報の取り扱いについて説明します。",
  alternates: { canonical: absoluteUrl("/about") },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: siteConfig.name,
    url: absoluteUrl("/about"),
    title: `このサイトについて｜${siteConfig.name}`,
    description: "探索者職業図鑑の目的、編集方針、独自評価、掲載情報の取り扱いについて説明します。",
    images: [sharedOpenGraphImage],
  },
};

export default function AboutPage() {
  return (
    <div className="page-shell about-page">
      <Breadcrumbs items={[{ label: "このサイトについて" }]} />

      <article className="about-content">
        <header className="page-heading">
          <p className="page-heading__eyebrow">ABOUT THIS ENCYCLOPEDIA</p>
          <h1>このサイトについて</h1>
          <p>
            探索者職業図鑑は、現実の職業を知り、TRPGや小説・漫画・ゲームのキャラクター創作へ生かすための資料サイトです。
          </p>
        </header>

        <section className="about-section" aria-labelledby="about-purpose">
          <h2 id="about-purpose">目指しているもの</h2>
          <p>
            「この職業は普段どんな仕事をしているのか」「キャラクターにすると、どんな経験や視点を持ちそうか」を一つのページで調べられる、創作の入口を目指しています。
          </p>
          <p>
            就職情報やゲーム攻略情報を提供することが目的ではなく、現実の職業への理解を深めながら設定の発想を広げることを大切にしています。
          </p>
        </section>

        <section className="about-section" aria-labelledby="editorial-policy">
          <h2 id="editorial-policy">編集方針</h2>
          <ul className="principle-list">
            <li>日本国内で見られる一般的な職業像を基礎に、創作へ活用しやすい言葉で独自に編集します。</li>
            <li>仕事内容だけでなく、一日の流れ、知識、人物像、物語への導入例まで多面的に扱います。</li>
            <li>資格・制度などは可能な限り公的機関や関係団体の情報を確認し、確認日を明記します。</li>
            <li>職業への固定観念や偏見を強めないよう、働き方や人物像には幅があることを前提に記述します。</li>
          </ul>
        </section>

        <section className="about-section about-section--notice" aria-labelledby="rules-policy">
          <h2 id="rules-policy">公式ルールの転載は行いません</h2>
          <p>
            本サイトは、特定のTRPG作品や出版社による公式サイトではありません。公式ルールブックに掲載された文章、職業データ、技能値、ゲーム上の数値などは転載しません。
          </p>
          <p>
            掲載内容は現実の職業に関する一般知識をもとにした独自コンテンツです。実際に遊ぶ際のルールは、お手元の正規のルールブックをご確認ください。
          </p>
        </section>

        <section className="about-section" aria-labelledby="rating-policy">
          <h2 id="rating-policy">探索者適性・技能イメージについて</h2>
          <p>
            「調査」「交渉」「戦闘」「潜入」「サポート」「知識」「初心者おすすめ」の5段階評価は、ゲーム上の強さではありません。この職業の背景を、キャラクター設定やRPへどの程度取り入れやすいかを示す編集部独自の目安です。
          </p>
          <p>
            評価は3を標準とし、4・5は職務との結びつきが明確な場合に限定しています。「初心者おすすめ」は、職業の知名度と一般的な認知度が高く、専門知識を調べなくても日常・目的・会話を想像してRPを始めやすいかで判定します。低い評価は選択非推奨という意味ではありません。
          </p>
          <p>
            技能イメージも同様に、職業経験から身につけていそうな一般的な能力を表す創作タグであり、特定のゲームシステムの技能を指定するものではありません。
          </p>
        </section>

        <section className="about-section" aria-labelledby="information-notice">
          <h2 id="information-notice">掲載情報と個人差</h2>
          <p>
            同じ職業でも、仕事内容、必要資格、学歴、勤務時間、収入は、地域・勤務先・役職・雇用形態・経験・時期によって大きく異なります。掲載する一日の流れや年収は代表的な例・目安であり、個人や組織にそのまま当てはまるものではありません。
          </p>
          <p>
            制度は変更される場合があります。進路、就職、資格取得などの判断には、行政機関、教育機関、資格団体、募集元が公開する最新の一次情報をご利用ください。
          </p>
        </section>

        <footer className="about-content__footer">
          <p>職業から、次のキャラクターの輪郭を探してみましょう。</p>
          <Link className="button-link" href="/occupations">職業を探す</Link>
        </footer>
      </article>
    </div>
  );
}
