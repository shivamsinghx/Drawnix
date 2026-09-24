export default function DashboardLoading() {
  return (
    <div className="relative min-h-svh overflow-hidden bg-zinc-50 dark:bg-black">
      <div className="relative z-10 mx-auto flex min-h-svh w-full max-w-5xl flex-col px-6 py-8">
        <p className="text-xs font-semibold tracking-[0.28em] text-muted-foreground uppercase">
          Dashboard
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Welcome to Drawnix
        </h1>
        <p className="mt-6 text-sm text-muted-foreground">Loading boards…</p>
      </div>
    </div>
  )
}
