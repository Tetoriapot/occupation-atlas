import type { Metadata } from "next";
import { GlobalComparisonTray } from "@/app/components/layout/global-comparison-tray";
import { SiteFooter } from "@/app/components/layout/site-footer";
import { SiteHeader } from "@/app/components/layout/site-header";
import {
  absoluteUrl,
  sharedOpenGraphImage,
  sharedTwitterImage,
  siteConfig,
} from "@/app/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s｜${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: ["職業図鑑", "TRPG", "キャラクター創作", "探索者", "職業設定", "創作資料"],
  authors: [{ name: "探索者職業図鑑 編集部" }],
  creator: "探索者職業図鑑 編集部",
  publisher: "探索者職業図鑑",
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: absoluteUrl("/"),
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
    images: [sharedOpenGraphImage],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: [sharedTwitterImage],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('tansakusha-theme');var d=t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <a className="skip-link" href="#main-content">本文へ移動</a>
        <SiteHeader />
        <main id="main-content">{children}</main>
        <GlobalComparisonTray />
        <SiteFooter />
      </body>
    </html>
  );
}
