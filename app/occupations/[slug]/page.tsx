import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AptitudeRatings,
  OccupationCard,
  OccupationOverview,
  OccupationScenarioSituations,
  OccupationSettingIdeas,
} from "@/app/components/occupation";
import { CreativeInformationAnchored } from "@/app/components/occupation/creative-information-anchored";
import { DetailActions } from "@/app/components/occupation/detail-actions";
import { OccupationSelectionTools } from "@/app/components/occupation/occupation-selection-tools";
import { Breadcrumbs } from "@/app/components/layout/breadcrumbs";
import {
  getAllOccupations,
  getCategoryById,
  getOccupationBySlug,
  getRelatedOccupations,
} from "@/app/lib/occupations";
import { getBeginnerEvaluationReason } from "@/app/lib/beginner-diagnosis";
import {
  absoluteUrl,
  sharedOpenGraphImage,
  sharedTwitterImage,
  siteConfig,
} from "@/app/lib/site";
import type { SourceSupport, SourceType } from "@/app/types/occupation";

type OccupationPageProps = {
  params: Promise<{ slug: string }>;
};

const aptitudeLabels = [
  { key: "investigation", label: "調査" },
  { key: "negotiation", label: "交渉" },
  { key: "combat", label: "戦闘" },
  { key: "infiltration", label: "潜入" },
  { key: "support", label: "サポート" },
  { key: "knowledge", label: "知識" },
  { key: "beginnerFriendly", label: "初心者おすすめ" },
] as const;

const sourceTypeLabels: Record<SourceType, string> = {
  government: "行政・法令",
  "education-research": "教育・研究機関",
  "professional-organization": "専門団体",
  "public-information": "公開情報",
};

const sourceSupportLabels: Record<SourceSupport, string> = {
  responsibilities: "仕事内容",
  qualifications: "資格",
  education: "学歴・養成",
  workStyle: "勤務形態",
  annualIncome: "年収・給与",
};

export function generateStaticParams() {
  return getAllOccupations().map((occupation) => ({ slug: occupation.slug }));
}

export async function generateMetadata({ params }: OccupationPageProps): Promise<Metadata> {
  const { slug } = await params;
  const occupation = getOccupationBySlug(slug);

  if (!occupation) {
    return {
      title: "職業が見つかりません",
      robots: { index: false, follow: false },
    };
  }

  const category = getCategoryById(occupation.categoryId);
  const canonicalPath = `/occupations/${occupation.slug}`;
  const title = `${occupation.name}の仕事内容・創作設定`;
  const description = `${occupation.shortDescription} 仕事内容、資格、一日の流れ、探索者としての特徴やRPのヒントを紹介します。`;

  return {
    title,
    description,
    keywords: [
      occupation.name,
      ...occupation.aliases,
      ...(category ? [category.name] : []),
      ...occupation.keywords,
      ...occupation.skillImages,
      "職業設定",
      "キャラクター創作",
    ],
    alternates: { canonical: absoluteUrl(canonicalPath) },
    openGraph: {
      type: "article",
      locale: "ja_JP",
      siteName: siteConfig.name,
      url: absoluteUrl(canonicalPath),
      title,
      description,
      publishedTime: occupation.publishedAt,
      modifiedTime: occupation.updatedAt,
      section: category?.name,
      tags: occupation.keywords,
      images: [sharedOpenGraphImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [sharedTwitterImage],
    },
  };
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return `${year}年${month}月${day}日`;
}

function jsonLd(value: object) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export default async function OccupationDetailPage({ params }: OccupationPageProps) {
  const { slug } = await params;
  const occupation = getOccupationBySlug(slug);

  if (!occupation) {
    notFound();
  }

  const category = getCategoryById(occupation.categoryId);
  const relatedOccupations = getRelatedOccupations(occupation);
  const canonicalPath = `/occupations/${occupation.slug}`;
  const rankedAptitudes = aptitudeLabels
    .map(({ key, label }) => ({ key, label, score: occupation.aptitude[key] }))
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, "ja"));
  const topAptitudes = rankedAptitudes.slice(0, 3);
  const lowestScore = rankedAptitudes.at(-1)?.score ?? 1;
  const lowerAptitudes = rankedAptitudes.filter(({ score }) => score === lowestScore).slice(0, 2);
  const primarySkills = occupation.skillImages.slice(0, 3);
  const roleplayTip = occupation.creative.roleplayTips[0];
  const scenarioHook = occupation.creative.scenarioHooks[0];
  const personalityExample = occupation.creative.personalityExamples[0];
  const settingEraText = occupation.setting.eras.join("・");
  const settingRegionText = occupation.setting.regions.join("・");
  const settingScopeLabel = `時代 ${settingEraText}／地域 ${settingRegionText}`;
  const lowerAptitudeReason = lowerAptitudes
    .map(({ key }) => occupation.aptitudeReasons[key])
    .find(Boolean);
  const weaknessText =
    lowerAptitudeReason ??
    `${lowerAptitudes.map(({ label, score }) => `${label} ${score}/5`).join("・")}は相対的に低め。苦手分野を仲間との関係や物語上の弱点にすると、人物像を作りやすくなります。`;
  const summaryText = [
    `【${occupation.name}｜30秒要約】`,
    `基準：時代 ${settingEraText}／地域 ${settingRegionText}`,
    `得意適性：${topAptitudes.map(({ label, score }) => `${label} ${score}/5`).join("、")}`,
    `主要技能イメージ：${primarySkills.join("、")}`,
    `RPの一言：${roleplayTip}`,
    `導入例：${scenarioHook}`,
    `注意点：${weaknessText}`,
    absoluteUrl(canonicalPath),
  ].join("\n");
  const characterText = [
    `【${occupation.name}のキャラクター案】`,
    `職業像：${occupation.catchphrase}`,
    `性格例：${personalityExample}`,
    `RPのヒント：${roleplayTip}`,
    `持っていそうな能力：${primarySkills.join("、")}`,
    `シナリオ導入：${scenarioHook}`,
    "※探索者適性・技能イメージは、公式ルールではなく創作・RP向けの独自目安です。",
    absoluteUrl(canonicalPath),
  ].join("\n");
  const beginnerReason = getBeginnerEvaluationReason({
    name: occupation.name,
    aptitude: occupation.aptitude,
    skillImages: occupation.skillImages,
    roleplayTip,
  });
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "トップ", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "職業を探す", item: absoluteUrl("/occupations") },
      { "@type": "ListItem", position: 3, name: occupation.name, item: absoluteUrl(canonicalPath) },
    ],
  };
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${occupation.name}の仕事内容と創作向け情報`,
    description: occupation.shortDescription,
    url: absoluteUrl(canonicalPath),
    mainEntityOfPage: absoluteUrl(canonicalPath),
    inLanguage: "ja-JP",
    isAccessibleForFree: true,
    datePublished: occupation.publishedAt,
    dateModified: occupation.updatedAt,
    articleSection: category?.name,
    keywords: [occupation.name, ...occupation.aliases, ...occupation.keywords, ...occupation.skillImages].join(", "),
    about: {
      "@type": "Occupation",
      name: occupation.name,
      description: occupation.shortDescription,
      occupationalCategory: category?.name,
    },
    author: {
      "@type": "Organization",
      name: `${siteConfig.name} 編集部`,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: absoluteUrl("/"),
    },
  };

  return (
    <div className="page-shell occupation-detail-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(articleJsonLd) }}
      />

      <Breadcrumbs
        items={[
          { label: "職業を探す", href: "/occupations" },
          { label: occupation.name },
        ]}
      />

      <article className="occupation-detail">
        <header className="occupation-detail__hero">
          <div className="occupation-detail__classification">
            <span className="occupation-detail__index">図鑑番号 {occupation.id}</span>
            {category ? (
              <Link className="occupation-detail__category" href={`/categories/${category.slug}`}>
                <span aria-hidden="true">{category.symbol}</span>
                {category.name}
              </Link>
            ) : null}
          </div>

          <p className="occupation-detail__catchphrase">{occupation.catchphrase}</p>
          <h1>{occupation.name}</h1>
          <p className="occupation-detail__summary">{occupation.shortDescription}</p>

          {occupation.aliases.length > 0 ? (
            <p className="occupation-detail__aliases">
              <span>別名・呼び方</span>
              {occupation.aliases.join("、")}
            </p>
          ) : null}

          {occupation.keywords.length > 0 ? (
            <ul className="tag-list occupation-detail__keywords" aria-label="職業のキーワード">
              {occupation.keywords.map((keyword) => (
                <li key={keyword}>{keyword}</li>
              ))}
            </ul>
          ) : null}
        </header>

        <section
          id="quick-summary"
          className="occupation-quick-summary"
          aria-labelledby="quick-summary-title"
        >
          <header className="occupation-quick-summary__header">
            <div>
              <p className="occupation-section__eyebrow">30-SECOND BRIEF</p>
              <h2 id="quick-summary-title">30秒でわかる探索者像</h2>
            </div>
            <span className="occupation-quick-summary__scope">基準：{settingScopeLabel}</span>
          </header>

          <dl className="occupation-quick-summary__grid">
            <div className="occupation-quick-summary__item occupation-quick-summary__item--aptitude">
              <dt>得意適性</dt>
              <dd>
                <ul className="quick-summary-tags" aria-label="得意な探索者適性">
                  {topAptitudes.map(({ key, label, score }) => (
                    <li key={key}>{label} <span>{score}/5</span></li>
                  ))}
                </ul>
              </dd>
            </div>
            <div className="occupation-quick-summary__item">
              <dt>主要技能イメージ</dt>
              <dd>{primarySkills.join("・")}</dd>
            </div>
            <div className="occupation-quick-summary__item">
              <dt>RPの一言</dt>
              <dd>{roleplayTip}</dd>
            </div>
            <div className="occupation-quick-summary__item">
              <dt>導入例</dt>
              <dd>{scenarioHook}</dd>
            </div>
            <div className="occupation-quick-summary__item occupation-quick-summary__item--caution">
              <dt>人物づくりの注意点</dt>
              <dd>{weaknessText}</dd>
            </div>
          </dl>

          <DetailActions
            occupationName={occupation.name}
            shareUrl={absoluteUrl(canonicalPath)}
            shareText={`${occupation.name}の仕事内容と探索者・創作向け情報を読む`}
            summaryText={summaryText}
            characterText={characterText}
          />
          <OccupationSelectionTools
            slug={occupation.slug}
            name={occupation.name}
            variant="detail"
          />
        </section>

        <nav
          className="occupation-detail__toc occupation-detail__toc--sticky occupation-detail__section-nav"
          aria-label="このページの目次"
        >
          <div className="occupation-detail__toc-primary">
            <a href="#quick-summary">30秒要約</a>
            <a href="#overview">現実の仕事</a>
            <a href="#setting-and-ideas">創作・導入</a>
            <a href="#aptitude">適性・技能</a>
            <a href="#related-occupations">関連・資料</a>
          </div>
          <details className="occupation-detail__toc-more">
            <summary>全目次</summary>
            <div className="occupation-detail__toc-more-panel">
              <a href="#quick-summary">30秒要約</a>
              <a href="#overview">職業概要</a>
              <a href="#setting-and-ideas">時代・地域と創作案</a>
              <a href="#investigator-features">探索者の特徴</a>
              <a href="#likely-knowledge">知識</a>
              <a href="#roleplay-tips">RPのヒント</a>
              <a href="#personality-examples">性格例</a>
              <a href="#everyday-events">日常イベント</a>
              <a href="#scenario-hooks">導入例</a>
              <a href="#common-character-settings">創作設定</a>
              <a href="#scenario-situations">おすすめシチュエーション</a>
              <a href="#aptitude">探索者適性</a>
              <a href="#skill-images">技能イメージ</a>
              <a href="#related-occupations">関連職業</a>
              <a href="#sources">参考資料</a>
            </div>
          </details>
        </nav>

        <OccupationOverview overview={occupation.overview} />
        <OccupationSettingIdeas
          setting={occupation.setting}
          creativeIdeas={occupation.creativeIdeas}
        />
        <CreativeInformationAnchored creative={occupation.creative} />
        <OccupationScenarioSituations situations={occupation.scenarioSituations} />
        <AptitudeRatings
          aptitude={occupation.aptitude}
          aptitudeReasons={occupation.aptitudeReasons}
          beginnerReason={beginnerReason}
        />

        <section id="skill-images" className="occupation-section skill-images-section" aria-labelledby="skill-images-title">
          <header className="occupation-section__header">
            <p className="occupation-section__eyebrow">ABILITY IMAGE</p>
            <h2 id="skill-images-title">技能イメージ</h2>
            <p>この職業の経験から身につけていそうな、一般的な知識・能力のイメージです。</p>
          </header>
          <ul className="skill-tag-list">
            {occupation.skillImages.map((skill) => (
              <li key={skill}>{skill}</li>
            ))}
          </ul>
          <p className="editorial-note">
            ここに掲載する名称は創作の手がかりであり、特定のTRPGシステムにおける技能やルールデータを示すものではありません。
          </p>
        </section>

        <section id="related-occupations" className="occupation-section related-occupations" aria-labelledby="related-occupations-title">
          <header className="occupation-section__header">
            <p className="occupation-section__eyebrow">RELATED</p>
            <h2 id="related-occupations-title">関連職業</h2>
          </header>
          {relatedOccupations.length > 0 ? (
            <div className="occupation-grid occupation-grid--related">
              {relatedOccupations.map((related) => (
                <OccupationCard
                  key={related.slug}
                  occupation={related}
                  category={getCategoryById(related.categoryId)}
                  showSelectionTools
                />
              ))}
            </div>
          ) : (
            <p className="empty-state">関連職業は現在編集中です。</p>
          )}
        </section>

        <section id="sources" className="occupation-section sources-section" aria-labelledby="sources-title">
          <header className="occupation-section__header">
            <p className="occupation-section__eyebrow">EDITORIAL DATA</p>
            <h2 id="sources-title">参考資料・更新情報</h2>
          </header>

          {occupation.sources.length > 0 ? (
            <>
              <p className="source-list__guide">
                各資料が主に裏付ける項目を表示しています。金額や制度はリンク先の更新日もご確認ください。
              </p>
              <ol className="source-list">
              {occupation.sources.map((source) => (
                <li key={`${source.title}-${source.url}`}>
                  <a href={source.url} rel="noreferrer">
                    {source.title}
                  </a>
                  <div className="source-list__metadata">
                    <span className="source-list__type">
                      {sourceTypeLabels[source.type]}
                    </span>
                    <ul
                      className="source-list__supports"
                      aria-label={`${source.title}が主に裏付ける項目`}
                    >
                      {source.supports.map((support) => (
                        <li key={support}>{sourceSupportLabels[support]}</li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
              </ol>
            </>
          ) : (
            <div className="source-status source-status--pending" role="note">
              <strong>参考資料：要確認</strong>
              <p>参照先を現在確認中です。制度や資格の最新情報は、関係省庁・団体などの一次情報もあわせてご確認ください。</p>
            </div>
          )}

          <dl className="publication-dates">
            <div>
              <dt>公開日</dt>
              <dd><time dateTime={occupation.publishedAt}>{formatDate(occupation.publishedAt)}</time></dd>
            </div>
            <div>
              <dt>更新日</dt>
              <dd><time dateTime={occupation.updatedAt}>{formatDate(occupation.updatedAt)}</time></dd>
            </div>
            <div>
              <dt>最終確認日</dt>
              <dd><time dateTime={occupation.lastReviewedAt}>{formatDate(occupation.lastReviewedAt)}</time></dd>
            </div>
          </dl>
        </section>

        <footer className="occupation-detail__disclaimer">
          <h2>このページの情報について</h2>
          <p>
            本ページは、日本国内で見られる一般的な職業像を創作資料として独自に整理したものです。仕事内容、資格要件、学歴、勤務形態、年収は、地域・所属先・雇用形態・経験・時期などによって異なります。
          </p>
          <p>
            探索者適性と技能イメージは、キャラクター設定やRPへの取り入れやすさを示す編集部独自の目安です。公式ルール、能力値、職業データではありません。
          </p>
        </footer>
      </article>
    </div>
  );
}
