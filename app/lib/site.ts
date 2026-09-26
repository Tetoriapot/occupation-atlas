export const siteConfig = {
  name: "探索者職業図鑑",
  shortName: "職業図鑑",
  description:
    "現実の職業を、TRPGや物語のキャラクター創作に役立つ視点で読み解く職業データベース。",
  url:
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://tansakusha-occupation-atlas.tetoriapot.chatgpt.site",
};

export function absoluteUrl(path = "/") {
  const base = `${siteConfig.url.replace(/\/$/, "")}/`;
  const url = new URL(path.replace(/^\/+/, ""), base);
  if (process.env.NEXT_PUBLIC_STATIC_EXPORT === "1" && !/\.[a-z0-9]+$/i.test(url.pathname)) {
    url.pathname = `${url.pathname.replace(/\/$/, "")}/`;
  }
  return url.toString();
}

export const sharedOpenGraphImage = {
  url: absoluteUrl("/og.jpg"),
  width: 1200,
  height: 675,
  type: "image/jpeg",
  alt: "探索者職業図鑑 — 現実の仕事から、物語の人物像をひらく。",
};

export const sharedTwitterImage = absoluteUrl("/og.jpg");
