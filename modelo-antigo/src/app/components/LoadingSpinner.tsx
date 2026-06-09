export function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto" />
        <p className="text-black font-mono text-sm">
          Carregando...
        </p>
      </div>
    </div>
  );
}
