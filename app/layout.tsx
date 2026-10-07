import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pwnedle",
  description:
    "Five passwords a day. Guess how many times each one has turned up in data breaches.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
