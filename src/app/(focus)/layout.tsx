export default function FocusLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#inhoud"
        data-focus-ring-inverse
        className="sr-only z-50 rounded-lg bg-km-green px-4 py-3 font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Naar de inhoud
      </a>
      {children}
    </>
  );
}
