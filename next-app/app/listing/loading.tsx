export default function ListingLoading() {
  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-4">
          <div className="h-10 w-72 rounded bg-slate-200" />
          <div className="h-44 rounded-2xl bg-slate-200" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="h-56 rounded-2xl bg-slate-200" />
            <div className="h-56 rounded-2xl bg-slate-200" />
            <div className="h-56 rounded-2xl bg-slate-200" />
          </div>
        </div>
      </div>
    </main>
  );
}
