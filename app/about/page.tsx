import type { Metadata } from "next";

export const metadata: Metadata = { title: "About · Pwnedle" };

const link = "text-bone underline underline-offset-4 focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-bone";

// R24: credits and the non-affiliation statement.
export default function About() {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-lg">About</h2>
      <p className="text-ash">
        Pwnedle is a daily guessing game. Each count is the number of times that password appears in known data
        breaches.
      </p>
      <div className="flex flex-col gap-3">
        <h3 className="font-mono text-sm text-ash">credits</h3>
        <p className="text-ash">
          Breach counts come from{" "}
          <a href="https://haveibeenpwned.com/Passwords" target="_blank" rel="noopener noreferrer" className={link}>
            Pwned Passwords
          </a>{" "}
          by Have I Been Pwned, created by Troy Hunt.
        </p>
        <p className="text-ash">
          Some passwords are picked from the{" "}
          <a href="https://github.com/danielmiessler/SecLists" target="_blank" rel="noopener noreferrer" className={link}>
            SecLists
          </a>{" "}
          common password list, MIT licensed, copyright (c) 2018 Daniel Miessler.
        </p>
      </div>
      <p className="text-ash">Pwnedle is not affiliated with or endorsed by Have I Been Pwned.</p>
    </section>
  );
}
