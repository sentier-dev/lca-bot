interface AuthPanelProps {
  title: string
  subtitle?: string
  children: React.ReactNode
}

export function AuthPanel({ title, subtitle, children }: AuthPanelProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center text-center gap-3">
          <img src="/dds-logo-green.svg" alt="Départ de Sentier" className="h-12 w-auto" />
          <h1 className="font-headline text-2xl font-bold text-on-surface tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-on-surface-variant">{subtitle}</p>}
        </div>
        <div className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-6 shadow-sm space-y-5">
          {children}
        </div>
      </div>
    </div>
  )
}
