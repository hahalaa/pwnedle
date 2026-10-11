// Remounts on every navigation, so each page fades in (T35). Keeps the layout's flex column for Lock in on phones.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 animate-enter flex-col sm:flex-none">{children}</div>;
}
