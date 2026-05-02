import { useAdminData } from '../api/hooks'
import { Panel, StatCard, LoadingSpinner, EmptyState } from '../ui/Cards'
import { Alert } from '../ui/Shared'
import { useTranslation } from '../i18n/LanguageContext'

function CategoryBar({ items }) {
  const { t } = useTranslation()
  if (!items.length) return <EmptyState icon="📊" title={t('adm_no_data')} />

  const max = Math.max(...items.map((item) => item.count), 1)

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.key}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-medium text-policeBlue">{item.key}</span>
            <span className="font-bold text-policeBlue">{item.count}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-policeBlue-50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-policeBlue-500 to-policeBlue-400 transition-all duration-700"
              style={{ width: `${Math.round((item.count / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

const STATUS_STYLE = {
  SUBMITTED: 'badge-blue',
  UNDER_REVIEW: 'badge-gold',
  INVESTIGATING: 'badge-blue',
  RESOLVED: 'badge-green',
  REJECTED: 'badge-red',
}

function StatusBreakdown({ items }) {
  const { t } = useTranslation()
  if (!items.length) return <EmptyState icon="📋" title={t('adm_no_status_data')} />

  const labels = {
    SUBMITTED: t('status_submitted'),
    UNDER_REVIEW: t('status_review'),
    INVESTIGATING: t('status_investigating'),
    RESOLVED: t('status_resolved'),
    REJECTED: t('status_rejected'),
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.key} className="flex items-center justify-between rounded-lg border border-policeBlue-50 bg-surface px-4 py-2.5">
          <span className={`badge ${STATUS_STYLE[item.key] ?? 'badge-gray'}`}>
            {labels[item.key] ?? item.key.replace('_', ' ')}
          </span>
          <span className="font-heading text-xl font-bold text-policeBlue">{item.count}</span>
        </div>
      ))}
    </div>
  )
}

const ROLE_BADGE = {
  CITIZEN: 'badge-blue',
  POLICE: 'badge-gold',
  ADMIN: 'badge-red',
}

function UserTable({ users }) {
  const { t } = useTranslation()
  if (!users.length) return <EmptyState icon="👥" title={t('adm_no_users')} />

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>{t('adm_col_name')}</th>
            <th>{t('adm_col_email')}</th>
            <th>{t('adm_col_role')}</th>
            <th>{t('adm_col_aadhaar')}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td className="font-medium text-policeBlue">{user.fullName}</td>
              <td className="text-xs text-slate-500">{user.email}</td>
              <td>
                <span className={`badge ${ROLE_BADGE[user.role] ?? 'badge-gray'}`}>{user.role}</span>
              </td>
              <td className="font-mono text-xs text-slate-400">
                {user.aadhaarNumber ? `••••${user.aadhaarNumber.slice(-4)}` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const EVENT_ICONS = {
  FIR_SUBMITTED: '📝',
  FIR_UPDATED: '🔄',
  USER_CREATED: '👤',
  STATUS_CHANGE: '🔁',
}

function EventLog({ events }) {
  const { t } = useTranslation()
  if (!events.length) return <EmptyState icon="📜" title={t('adm_no_events')} />

  return (
    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
      {events.map((event, idx) => (
        <div
          key={`${event.createdAt}-${idx}`}
          className="flex items-start gap-3 rounded-lg border border-policeBlue-50 bg-surface px-3 py-2.5"
        >
          <span className="mt-0.5 text-base">{EVENT_ICONS[event.eventType] ?? '📌'}</span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-policeBlue">{event.eventType?.replace('_', ' ')}</p>
            <p className="truncate text-xs text-slate-600">{event.message}</p>
            <p className="text-[10px] text-slate-400">{new Date(event.createdAt).toLocaleString()}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export function AdminDashboard() {
  const { stats, users, firByCategory, firByStatus, events, loading, error } = useAdminData()
  const { t } = useTranslation()

  return (
    <div className="animate-fade-in space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title={t('adm_users')} value={stats.users} tone="blue" icon="👥" />
        <StatCard title={t('adm_officers')} value={stats.officers} tone="gold" icon="🚓" />
        <StatCard title={t('adm_firs')} value={stats.firs} tone="green" icon="📋" />
        <StatCard title={t('adm_active')} value={stats.activeCases} tone="blue" icon="🔍" />
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <Panel title={`👥 ${t('adm_registered_users')}`}>
        {loading ? <LoadingSpinner label={t('loading')} /> : <UserTable users={users} />}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={`📁 ${t('adm_by_category')}`}>
          {loading ? <LoadingSpinner label={t('loading')} /> : <CategoryBar items={firByCategory} />}
        </Panel>
        <Panel title={`📊 ${t('adm_by_status')}`}>
          {loading ? <LoadingSpinner label={t('loading')} /> : <StatusBreakdown items={firByStatus} />}
        </Panel>
      </div>

      <Panel title={`🕒 ${t('adm_event_log')}`}>
        {loading ? <LoadingSpinner label={t('loading')} /> : <EventLog events={events} />}
      </Panel>
    </div>
  )
}
