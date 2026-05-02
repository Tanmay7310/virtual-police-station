import { useTranslation } from '../i18n/LanguageContext'

/**
 * StatusBadge — maps FIR status strings to styled pill badges.
 * Priority — maps priority strings to coloured chips.
 */

const STATUS_MAP = {
  SUBMITTED:      { key: 'status_submitted',     cls: 'badge-blue' },
  UNDER_REVIEW:   { key: 'status_review',        cls: 'badge-gold' },
  INVESTIGATING:  { key: 'status_investigating', cls: 'badge-blue' },
  RESOLVED:       { key: 'status_resolved',      cls: 'badge-green' },
  REJECTED:       { key: 'status_rejected',      cls: 'badge-red' },
}

const PRIORITY_MAP = {
  LOW:      { key: 'priority_low',      cls: 'badge-gray'  },
  MEDIUM:   { key: 'priority_medium',   cls: 'badge-gold'  },
  HIGH:     { key: 'priority_high',     cls: 'badge-red'   },
  CRITICAL: { key: 'priority_critical', cls: 'badge-red'   },
}

export function StatusBadge({ status }) {
  const { t } = useTranslation()
  const { key, cls } = STATUS_MAP[status] ?? { key: null, cls: 'badge-gray' }
  return <span className={`badge ${cls}`}>{key ? t(key) : status}</span>
}

export function PriorityBadge({ priority }) {
  const { t } = useTranslation()
  const { key, cls } = PRIORITY_MAP[priority] ?? { key: null, cls: 'badge-gray' }
  return <span className={`badge ${cls}`}>{key ? t(key) : priority}</span>
}

/**
 * StatusTimeline — horizontal stepper for FIR progress.
 */
const STEPS = ['SUBMITTED', 'UNDER_REVIEW', 'INVESTIGATING', 'RESOLVED']

export function StatusTimeline({ status }) {
  const { t } = useTranslation()
  const currentIndex = Math.max(0, STEPS.indexOf(status))

  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, index) => {
        const done    = index < currentIndex
        const current = index === currentIndex
        return (
          <div key={step} className="flex flex-1 items-center">
            <div className="flex flex-col items-center flex-1">
              {/* Dot */}
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ring-2 transition-all ${
                  done    ? 'bg-ok ring-ok/30 text-white'
                  : current ? 'bg-policeBlue ring-policeBlue/30 text-white'
                  : 'bg-white ring-slate-200 text-slate-400'
                }`}
              >
                {done ? (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              {/* Label */}
              <span className={`mt-1 text-center text-[10px] font-semibold leading-tight ${
                done || current ? 'text-policeBlue' : 'text-slate-400'
              }`}>
                {STATUS_MAP[step]?.key ? t(STATUS_MAP[step].key) : step.replace('_', ' ')}
              </span>
            </div>
            {/* Connector */}
            {index < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 transition-all ${done ? 'bg-ok' : 'bg-slate-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/**
 * Field — a labelled form field with error display.
 */
export function Field({ label, error, children, tip }) {
  return (
    <div className="field">
      <label className="field-label">
        {label}
        {tip && (
          <span
            className="ml-1.5 inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-policeBlue/10 text-[10px] font-bold text-policeBlue"
            title={tip}
          >
            ?
          </span>
        )}
      </label>
      {children}
      {error && <span className="field-error">{error}</span>}
    </div>
  )
}

/**
 * Alert — contextual message bar.
 */
export function Alert({ type = 'info', children }) {
  const cls = { success: 'alert-success', error: 'alert-error', info: 'alert-info' }[type]
  const icons = {
    success: '✓',
    error:   '✕',
    info:    'ℹ',
  }
  if (!children) return null
  return (
    <div className={`alert ${cls} flex items-start gap-2`}>
      <span className="mt-0.5 font-bold">{icons[type]}</span>
      <span>{children}</span>
    </div>
  )
}
