export function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="relative w-24 h-24 mx-auto">
          <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-4xl animate-pulse-soft">
            🐼
          </div>
        </div>
        <p className="text-muted-foreground animate-pulse-soft">
          Carregando sua biblioteca...
        </p>
      </div>
    </div>
  );
}
