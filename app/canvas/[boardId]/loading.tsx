export default function CanvasLoading() {
  return (
    <div className="flex h-svh flex-col bg-background">
      <header className="z-20 flex items-center border-b bg-background/80 px-4 py-3 backdrop-blur-xl">
        <p className="text-sm text-muted-foreground">Opening board…</p>
      </header>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading editor…</p>
      </div>
    </div>
  )
}
