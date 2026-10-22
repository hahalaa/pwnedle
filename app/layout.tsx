import type { Metadata } from "next";
import { Doto, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import Script from "next/script";
import { COFFEE_URL, SITE_URL, THEME_KEY, UMAMI_WEBSITE_ID } from "../lib/config";
import "./globals.css";
import { Backdrop } from "./backdrop";
import { HowToPlay } from "./how-to-play";
import { NavLabel } from "./nav-label";
import { Sound } from "./sound";
import { Spider } from "./spider";
import { Stats } from "./stats";
import { Theme } from "./theme";
import { TimeZone } from "./time-zone";

const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-plex-mono" });
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
    // The script below sets data-theme before hydration, so React must not flag the difference.
    <html lang="en" className={`${plexMono.variable} ${doto.variable}`} suppressHydrationWarning>
      <head>
        {/* T44: apply a saved theme before first paint, so the page doesn't flash the system theme first. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
      </head>
      <body className="font-mono antialiased">
        <TimeZone />
        <Backdrop />
        {/* R27/D32: Umami sets no cookies. data-domains keeps dev and preview visits out of the counts. */}
        <Script src="https://cloud.umami.is/script.js" data-website-id={UMAMI_WEBSITE_ID} data-domains={new URL(SITE_URL).host} />
        {/* main spans the viewport; the inner column holds the content at a readable width.
            Mobile: the page fills the screen so Lock in sits at the bottom.
            Desktop: spacers split the free height 2:3, so content sits just above centre, with the top gap capped.
            From lg the column widens; header and footer sit inside it, so they line up (T40). */}
        <main className="flex min-h-dvh w-full flex-col items-center px-4 py-6 sm:py-8 short:py-4 sm:before:max-h-24 sm:before:flex-[2] sm:before:content-[''] sm:after:flex-[3] sm:after:content-['']">
          <div className="flex w-full max-w-xl flex-1 lg:max-w-240 flex-col sm:flex-none">
            <header className="relative mb-8 short:mb-6 flex items-center sm:items-baseline justify-between border-b border-line pb-3">
              {/* T58a: Halloween days turn the wordmark orange and add the label and spider. */}
              <div>
                <h1 className="font-dot text-2xl sm:text-4xl halloween:text-pumpkin">
                  <Link href="/" className="tap focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-bone">Pwnedle</Link>
                </h1>
                <p className="hidden text-xs text-pumpkin halloween:block">halloween special</p>
              </div>
              <Spider />
              <nav className="flex gap-5 sm:gap-4">
                <HowToPlay />
                <Link href="/archive" aria-label="archive" className="tap text-sm text-ash underline underline-offset-4 hover:text-bone focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-bone">
                  <NavLabel text="archive">
                    <path d="M3.5 5.5h17v15h-17zM3.5 9.5h17M8.5 3.5v4M15.5 3.5v4" />
                  </NavLabel>
                </Link>
                <Stats />
                <Sound />
                <Theme />
              </nav>
            </header>
            {children}
            {/* R23, R24 */}
            <footer className="mt-10 short:mt-6 border-t border-line pt-4 text-sm text-ash">
              <p className="flex gap-4">
                <Link href="/about" className="tap underline underline-offset-4 hover:text-bone focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-bone">
                  about
                </Link>
                <a href={COFFEE_URL} target="_blank" rel="noopener noreferrer" className="tap inline-flex items-center gap-1.5 underline underline-offset-4 hover:text-bone focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-bone">
                  buy me a coffee
                  {/* Decorative; a mask so the drawing takes the link colour (D41). */}
                  <span aria-hidden="true" className="size-5 bg-current [mask:url(/art/coffee.svg)_center/contain_no-repeat]" />
                </a>
              </p>
            </footer>
          </div>
        </main>
      </body>
    </html>
  );
}
