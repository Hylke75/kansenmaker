export default function Loading() {
  return (
    <div role="status" className="mx-auto flex max-w-3xl flex-col gap-4 p-8" aria-label="Bezig met laden">
      <div className="h-10 w-2/3 max-w-md animate-pulse rounded-lg bg-km-softgreen" />
      <div className="h-5 w-full max-w-xl animate-pulse rounded bg-km-softgreen/70" />
      <span className="sr-only">Bezig met laden…</span>
    </div>
  );
}
