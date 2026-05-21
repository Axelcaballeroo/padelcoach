export default function Loading() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-5">
      <div className="w-full max-w-sm rounded-3xl border border-line bg-surface p-5 shadow-sm">
        <div className="h-4 w-28 animate-pulse rounded-full bg-surface-muted" />
        <div className="mt-5 h-8 w-48 animate-pulse rounded-full bg-surface-muted" />
        <div className="mt-3 h-4 w-full animate-pulse rounded-full bg-surface-muted" />
        <div className="mt-2 h-4 w-3/4 animate-pulse rounded-full bg-surface-muted" />
      </div>
    </div>
  );
}
