import { useMemo } from 'react'
import { useAdminData } from '../api/hooks'
import { Panel, StatCard, LoadingSpinner, EmptyState } from '../ui/Cards'
import { Alert } from '../ui/Shared'
import { useTranslation } from '../i18n/LanguageContext'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const CHART_COLORS = [
  { border: 'rgba(45, 82, 196, 1)',   bg: 'rgba(45, 82, 196, 0.15)' },
  { border: 'rgba(234, 179, 8, 1)',   bg: 'rgba(234, 179, 8, 0.15)' },
  { border: 'rgba(16, 185, 129, 1)',  bg: 'rgba(16, 185, 129, 0.15)' },
  { border: 'rgba(239, 68, 68, 1)',   bg: 'rgba(239, 68, 68, 0.15)' },
  { border: 'rgba(168, 85, 247, 1)',  bg: 'rgba(168, 85, 247, 0.15)' },
  { border: 'rgba(236, 72, 153, 1)',  bg: 'rgba(236, 72, 153, 0.15)' },
]

function CrimeTrendChart({ trendData }) {
  const { t } = useTranslation()

  const chartData = useMemo(() => {
    if (!trendData.length) return null

    const labels = trendData.map((d) => {
      const date = new Date(d.date)
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    })

    // Extract category keys (everything except 'date' and 'total')
    const categories = Object.keys(trendData[0]).filter((k) => k !== 'date' && k !== 'total')

    const datasets = [
      // Total line — thick, prominent
      {
        label: t('adm_total_firs') || 'Total FIRs',
        data: trendData.map((d) => d.total),
        borderColor: 'rgba(13, 25, 71, 1)',
        backgroundColor: 'rgba(13, 25, 71, 0.08)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgba(13, 25, 71, 1)',
      },
      // Per-category lines
      ...categories.map((cat, i) => {
        const color = CHART_COLORS[i % CHART_COLORS.length]
        return {
          label: cat,
          data: trendData.map((d) => d[cat] || 0),
          borderColor: color.border,
          backgroundColor: color.bg,
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5,
          borderDash: [5, 3],
        }
      }),
    ]

    return { labels, datasets }
  }, [trendData, t])

  if (!chartData) return <EmptyState icon="📈" title={t('adm_no_trend_data') || 'No crime data yet'} />

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'bottom',
        labels: { usePointStyle: true, padding: 16, font: { size: 11 } },
      },
      tooltip: {
        backgroundColor: 'rgba(13, 25, 71, 0.9)',
        titleFont: { size: 13, weight: 'bold' },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 }, maxRotation: 45 },
      },
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1, font: { size: 11 } },
        grid: { color: 'rgba(0,0,0,0.04)' },
      },
    },
  }

  return (
    <div style={{ height: '320px' }}>
      <Line data={chartData} options={options} />
    </div>
  )
}

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
  const { stats, users, firByCategory, firByStatus, events, crimeTrend, loading, error } = useAdminData()
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

      {/* Crime Rate Trend Chart */}
      <Panel title={`📈 ${t('adm_crime_trend') || 'Crime Rate Trend (Last 30 Days)'}`}>
        {loading ? <LoadingSpinner label={t('loading')} /> : <CrimeTrendChart trendData={crimeTrend} />}
      </Panel>

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
