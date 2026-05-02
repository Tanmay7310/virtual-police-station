/* ─── StatCard ───────────────────────────────────────────────────────────────── */
const TONE_MAP = {
  blue: {
    wrapper: 'from-policeBlue-700 to-policeBlue-500',
    icon:    'bg-white/15',
    text:    'text-white',
    sub:     'text-policeBlue-100',
  },
  gold: {
    wrapper: 'from-policeGold-500 to-policeGold-400',
    icon:    'bg-policeBlue-900/15',
    text:    'text-policeBlue-900',
    sub:     'text-policeBlue-700',
  },
  green: {
    wrapper: 'from-emerald-600 to-emerald-500',
    icon:    'bg-white/15',
    text:    'text-white',
    sub:     'text-emerald-100',
  },
  red: {
    wrapper: 'from-rose-600 to-rose-500',
    icon:    'bg-white/15',
    text:    'text-white',
    sub:     'text-rose-100',
  },
}

const DEFAULT_ICONS = {
  blue:  '📋',
  gold:  '⏳',
  green: '✅',
  red:   '🔴',
}

export function StatCard({ title, value, tone = 'blue', icon, subtitle }) {
  const t = TONE_MAP[tone] ?? TONE_MAP.blue
  const emoji = icon ?? DEFAULT_ICONS[tone] ?? '📌'

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${t.wrapper} p-5 shadow-panel transition-all hover:-translate-y-0.5 hover:shadow-float`}>
      {/* Decorative circle */}
      <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/8" />

      <div className="flex items-start justify-between">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-widest ${t.sub}`}>{title}</p>
          <p className={`mt-1.5 font-heading text-3xl font-bold ${t.text}`}>{value ?? '—'}</p>
          {subtitle && <p className={`mt-1 text-xs ${t.sub}`}>{subtitle}</p>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${t.icon} text-xl`}>
          {emoji}
        </div>
      </div>
    </div>
  )
}

/* ─── Panel ──────────────────────────────────────────────────────────────────── */
export function Panel({ title, children, action, className = '' }) {
  return (
    <section className={`card p-5 animate-fade-in ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-policeBlue">{title}</h2>
        {action && <div>{action}</div>}
      </div>
      <div className="divider -mt-1 mb-4" />
      {children}
    </section>
  )
}

/* ─── LoadingOverlay ──────────────────────────────────────────────────────────── */
export function LoadingSpinner({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-policeBlue-400">
      <svg className="h-8 w-8 animate-spin-slow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      <p className="text-sm font-medium">{label}</p>
    </div>
  )
}

/* ─── EmptyState ──────────────────────────────────────────────────────────────── */
export function EmptyState({ icon = '📂', title, description }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <span className="text-4xl">{icon}</span>
      <p className="font-semibold text-policeBlue">{title}</p>
      {description && <p className="max-w-xs text-sm text-slate-500">{description}</p>}
    </div>
  )
}
