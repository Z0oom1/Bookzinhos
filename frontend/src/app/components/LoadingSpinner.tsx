/**
 * Tela de carregamento com a marca.
 *
 * Três lombadas subindo em sequência — o mesmo gesto do logo e do modo estante,
 * para a espera parecer parte do app e não um spinner genérico.
 */
export function LoadingSpinner({ label = "Abrindo sua estante…" }: { label?: string }) {
  const bars = [
    { color: "linear-gradient(180deg, #FF7A9C, #E11D48)", height: 44, delay: 0 },
    { color: "linear-gradient(180deg, #FFB37A, #F97316)", height: 58, delay: 0.14 },
    { color: "linear-gradient(180deg, #A78BFA, #6D28D9)", height: 50, delay: 0.28 },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-7 px-6 select-none">
      <div className="flex flex-col items-center">
        <div className="flex items-end gap-2 h-[62px]" role="status" aria-label={label}>
          {bars.map((bar, i) => (
            <span
              key={i}
              className="w-[15px] rounded-[5px] shadow-[0_6px_16px_-6px_rgba(0,0,0,.45)]"
              style={{
                height: bar.height,
                background: bar.color,
                animation: `mb-shelf-bounce 1.05s ${bar.delay}s cubic-bezier(.45,.05,.35,1) infinite`,
              }}
            />
          ))}
        </div>
        <span className="block w-[74px] h-[5px] rounded-full bg-[var(--surface-3)] mt-2" />
      </div>

      <div className="text-center">
        <h1 className="text-[22px] font-bold tracking-tight mb-gradient-text">myBooks</h1>
        <p className="text-[13px] text-[var(--text-3)] mt-1">{label}</p>
      </div>
    </div>
  );
}
