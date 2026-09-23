export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-40 rounded-md bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-28 rounded-xl border bg-muted/40" />
        <div className="h-28 rounded-xl border bg-muted/40" />
        <div className="h-28 rounded-xl border bg-muted/40" />
      </div>
      <div className="h-64 rounded-xl border bg-muted/30" />
    </div>
  );
}
