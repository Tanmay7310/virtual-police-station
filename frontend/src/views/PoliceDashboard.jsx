import { useState, useCallback } from 'react'
import { usePoliceFirs } from '../api/hooks'
import { http } from '../api/http'
import { Panel, StatCard, LoadingSpinner, EmptyState } from '../ui/Cards'
import { StatusBadge, PriorityBadge, Alert } from '../ui/Shared'
import { useTranslation } from '../i18n/LanguageContext'

function fileIcon(type = '') {
  if (type.startsWith('image/')) return '🖼️'
  if (type.includes('pdf')) return '📄'
  if (type.startsWith('video/')) return '🎥'
  if (type.startsWith('audio/')) return '🎵'
  if (type.includes('zip') || type.includes('compressed')) return '🗜️'
  return '📎'
}

function EvidencePanel({ firId }) {
  const [open, setOpen] = useState(false)
  const [evidence, setEvidence] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { t } = useTranslation()

  const toggle = useCallback(async () => {
    if (!open && evidence.length === 0) {
      setLoading(true)
      setError(null)
      try {
        const { data } = await http.get(`/police/fir/${firId}/evidence`)
        setEvidence(data)
      } catch {
        setError(t('pol_msg_load_evidence_failed'))
      } finally {
        setLoading(false)
      }
    }
    setOpen((value) => !value)
  }, [open, evidence.length, firId, t])

  const handleDownload = async (item) => {
    try {
      const response = await http.get(`/police/evidence/${item.id}/download`, {
        responseType: 'blob',
      })
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = item.fileName
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      alert(t('pol_msg_download_failed'))
    }
  }

  return (
    <div className="mt-3 border-t border-policeBlue-50 pt-3">
      <button
        onClick={toggle}
        className="flex items-center gap-1.5 text-xs font-medium text-policeBlue transition-colors hover:text-policeBlue-700"
        aria-expanded={open}
      >
        <span className={`transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>▶</span>
        {open ? t('pol_hide_evidence') : t('pol_evidence')}
      </button>

      {open && (
        <div className="mt-2 space-y-1.5">
          {loading && <p className="animate-pulse text-xs italic text-slate-400">{t('pol_loading_evidence')}</p>}
          {error && <p className="text-xs text-red-500">{error}</p>}
          {!loading && !error && evidence.length === 0 && (
            <p className="text-xs italic text-slate-400">{t('pol_no_evidence')}</p>
          )}
          {evidence.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-base">{fileIcon(item.fileType)}</span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-700">{item.fileName}</p>
                  <p className="text-slate-400">
                    {item.fileType} · {item.fileSizeBytes > 0 ? `${(item.fileSizeBytes / 1024).toFixed(1)} KB` : t('pol_file_size_unknown')} · {new Date(item.uploadedAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDownload(item)}
                className="ml-3 shrink-0 rounded-md border border-policeBlue px-2.5 py-1 text-xs font-medium text-policeBlue transition-colors hover:bg-policeBlue hover:text-white"
              >
                ⬇ {t('pol_download')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FirCard({ fir, onUpdate }) {
  const [busy, setBusy] = useState(false)
  const { t } = useTranslation()

  const actions = [
    { value: 'UNDER_REVIEW', label: t('pol_btn_review'), cls: 'btn-outline' },
    { value: 'INVESTIGATING', label: t('pol_btn_investigate'), cls: 'btn-primary' },
    { value: 'RESOLVED', label: t('pol_btn_resolve'), cls: 'btn-gold' },
  ]

  const handleUpdate = async (status) => {
    setBusy(true)
    try {
      await onUpdate(fir.id, status)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-policeBlue-50 bg-surface p-4 transition-shadow hover:shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-policeBlue">#{fir.id} - {fir.title}</p>
          <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{fir.description}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <StatusBadge status={fir.status} />
          <PriorityBadge priority={fir.priority} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span>📁 {fir.category ?? t('pol_uncategorized')}</span>
        <span>📍 {fir.location ?? t('pol_location_missing')}</span>
        <span>🏢 {fir.assignedStation ?? t('pol_station_missing')}</span>
        <span>👤 {fir.citizenName ?? t('pol_citizen_unknown')}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {actions.filter((action) => action.value !== fir.status).map((action) => (
          <button
            key={action.value}
            disabled={busy}
            onClick={() => handleUpdate(action.value)}
            className={`btn btn-xs ${action.cls} disabled:opacity-50`}
          >
            {action.label}
          </button>
        ))}
      </div>

      <EvidencePanel firId={fir.id} />
    </div>
  )
}

export function PoliceDashboard() {
  const { firs, loading, error, updateStatus } = usePoliceFirs()
  const [toast, setToast] = useState('')
  const { t } = useTranslation()

  const handleUpdate = async (id, status) => {
    await updateStatus(id, status)
    const statusText = {
      UNDER_REVIEW: t('status_review'),
      INVESTIGATING: t('status_investigating'),
      RESOLVED: t('status_resolved'),
    }[status] ?? status
    setToast(t('pol_toast_status_moved').replace('{id}', id).replace('{status}', statusText))
    setTimeout(() => setToast(''), 3500)
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title={t('pol_assigned')} value={firs.length} tone="blue" icon="📋" />
        <StatCard title={t('pol_review')} value={firs.filter((fir) => fir.status === 'UNDER_REVIEW').length} tone="gold" icon="🔍" />
        <StatCard title={t('pol_investigating')} value={firs.filter((fir) => fir.status === 'INVESTIGATING').length} tone="green" icon="🚓" />
      </div>

      {toast && <Alert type="success">{toast}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      <Panel title={`🚓 ${t('pol_manage')}`}>
        {loading ? (
          <LoadingSpinner label={t('pol_loading_queue')} />
        ) : firs.length === 0 ? (
          <EmptyState icon="✅" title={t('pol_no_firs')} description={t('pol_no_firs_desc')} />
        ) : (
          <div className="space-y-3">
            {firs.map((fir) => (
              <FirCard key={fir.id} fir={fir} onUpdate={handleUpdate} />
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}
