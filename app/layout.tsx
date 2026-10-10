import type { Metadata } from "next";
import { Archivo, Doto, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import Script from "next/script";
import { COFFEE_URL, SITE_URL, UMAMI_WEBSITE_ID } from "../lib/config";
import "./globals.css";
import { HowToPlay } from "./how-to-play";
import { Stats } from "./stats";
import { TimeZone } from "./time-zone";

const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono" });
const doto = Doto({ subsets: ["latin"], weight: "900", variable: "--font-doto" });

const description = "Five passwords a day. Guess how many times each one has turned up in data breaches.";

// R26: app/opengraph-image.png is added to every page; metadataBase makes its URL absolute.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Pwnedle",
  description,
  openGraph: { title: "Pwnedle", description, type: "website" },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${plexMono.variable} ${doto.variable}`}>
      <body className="font-sans antialiased">
        <TimeZone />
        {/* R27/D32: Umami sets no cookies. data-domains keeps dev and preview visits out of the counts. */}
        <Script src="https://cloud.umami.is/script.js" data-website-id={UMAMI_WEBSITE_ID} data-domains={new URL(SITE_URL).host} />
        {/* main spans the viewport; the inner column holds the content at a readable width.
            Mobile: the page fills the screen so Lock in sits at the bottom.
            Desktop: spacers split the free height 2:3, so content sits just above centre, with the top gap capped. */}
        <main className="flex min-h-dvh w-full flex-col items-center px-4 py-6 sm:py-8 sm:before:max-h-24 sm:before:flex-[2] sm:before:content-[''] sm:after:flex-[3] sm:after:content-['']">
          <div className="flex w-full max-w-xl flex-1 flex-col sm:flex-none">
            <header className="mb-8 flex items-baseline justify-between border-b border-line pb-3">
              <h1 className="font-dot text-4xl">
                <Link href="/" className="tap focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-bone">Pwnedle</Link>
              </h1>
              <nav className="flex gap-4">
                <HowToPlay />
                <Link href="/archive" className="tap font-mono text-sm text-ash underline underline-offset-4 hover:text-bone focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-bone">
                  archive
                </Link>
                <Stats />
              </nav>
            </header>
            {children}
            {/* R23, R24 */}
            <footer className="mt-10 border-t border-line pt-4 text-sm text-ash">
              <p className="flex gap-4 font-mono">
                <Link href="/about" className="tap underline underline-offset-4 hover:text-bone focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-bone">
                  about
                </Link>
                <a href={COFFEE_URL} target="_blank" rel="noopener noreferrer" className="tap underline underline-offset-4 hover:text-bone focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-bone">
                  buy me a coffee
                </a>
              </p>
            </footer>
          </div>
        </main>
      </body>
    </html>
  );
}
