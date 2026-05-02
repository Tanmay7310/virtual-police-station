import { useState, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { http } from '../api/http'
import { useFirs } from '../api/hooks'
import { Panel, StatCard, LoadingSpinner, EmptyState } from '../ui/Cards'
import { StatusBadge, PriorityBadge, StatusTimeline, Field, Alert } from '../ui/Shared'
import { useTranslation } from '../i18n/LanguageContext'

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

const SPEECH_LOCALES = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
  bn: 'bn-IN',
  sa: 'hi-IN',
  bho: 'hi-IN',
  hne: 'hi-IN',
  mwr: 'hi-IN',
}

function useVoiceInput({ lang = 'en-IN' } = {}) {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimText, setInterimText] = useState('')
  const [error, setError] = useState(null)
  const recognitionRef = useRef(null)

  const supported = !!SpeechRecognition

  const start = useCallback(() => {
    if (!supported) {
      setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.')
      return
    }

    setError(null)
    setTranscript('')
    setInterimText('')

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = lang
    recognition.maxAlternatives = 1

    recognition.onstart = () => setListening(true)
    recognition.onend = () => {
      setListening(false)
      setInterimText('')
    }
    recognition.onerror = (event) => {
      setListening(false)
      setInterimText('')
      if (event.error === 'no-speech') setError('No speech detected. Try again.')
      else if (event.error === 'not-allowed') setError('Microphone access denied. Allow mic permissions and try again.')
      else setError(`Recognition error: ${event.error}`)
    }
    recognition.onresult = (event) => {
      let finalText = ''
      let interim = ''

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const text = event.results[i][0].transcript
        if (event.results[i].isFinal) finalText += `${text} `
        else interim += text
      }

      if (finalText) setTranscript((previous) => previous + finalText)
      setInterimText(interim)
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [supported, lang])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  const clear = useCallback(() => {
    setTranscript('')
    setInterimText('')
    setError(null)
  }, [])

  return { supported, listening, transcript, interimText, error, start, stop, clear }
}

function FirForm({ onSuccess }) {
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm()
  const [ocrFile, setOcrFile] = useState(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrResult, setOcrResult] = useState(null)
  const [message, setMessage] = useState(null)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const { t, lang } = useTranslation()
  const firAadhaar = watch('aadhaarNumber')
  const voice = useVoiceInput({ lang: SPEECH_LOCALES[lang] ?? 'en-IN' })

  const applyVoiceText = async () => {
    const text = voice.transcript.trim()
    if (!text) return

    voice.stop()
    setOcrLoading(true)
    setMessage(null)

    try {
      const blob = new Blob([text], { type: 'text/plain' })
      const form = new FormData()
      form.append('file', blob, 'voice-input.txt')
      const { data } = await http.post('/citizen/ocr/extract', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setOcrResult(data)
      setValue('ocrExtractedText', text)
      setValue('ocrKeywords', data.keywords || '')
      if (data.suggestedTitle) setValue('title', data.suggestedTitle)
      if (data.suggestedDescription) setValue('description', data.suggestedDescription)
      if (data.suggestedLocation) setValue('location', data.suggestedLocation)
      setMessage({ type: 'success', text: t('cit_msg_voice_applied') })
      setVoiceOpen(false)
      voice.clear()
    } catch {
      setValue('description', text)
      setMessage({ type: 'success', text: t('cit_msg_voice_description_only') })
      setVoiceOpen(false)
      voice.clear()
    } finally {
      setOcrLoading(false)
    }
  }

  const runOcr = async () => {
    if (!ocrFile) {
      setMessage({ type: 'error', text: t('cit_msg_choose_file') })
      return
    }

    setOcrLoading(true)
    setMessage(null)
    const form = new FormData()
    form.append('file', ocrFile)

    try {
      const { data } = await http.post('/citizen/ocr/extract', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setOcrResult(data)
      setValue('ocrExtractedText', data.extractedText || '')
      setValue('ocrKeywords', data.keywords || '')
      if (data.suggestedTitle) setValue('title', data.suggestedTitle)
      if (data.suggestedDescription) setValue('description', data.suggestedDescription)
      if (data.suggestedLocation) setValue('location', data.suggestedLocation)
      setMessage({ type: 'success', text: t('cit_msg_ocr_complete') })
    } catch (err) {
      setMessage({ type: 'error', text: err?.response?.data?.error ?? t('cit_msg_ocr_failed') })
    } finally {
      setOcrLoading(false)
    }
  }

  const onSubmit = async (values) => {
    if (!values.aadhaarNumber?.trim()) {
      setMessage({ type: 'error', text: t('cit_msg_aadhaar_required') })
      return
    }

    setMessage(null)

    try {
      await http.post('/citizen/fir', values)
      reset({ aadhaarNumber: values.aadhaarNumber, ocrExtractedText: '', ocrKeywords: '' })
      setOcrFile(null)
      setOcrResult(null)
      setMessage({ type: 'success', text: t('cit_msg_fir_submitted') })
      onSuccess?.()
    } catch (err) {
      setMessage({ type: 'error', text: err?.response?.data?.error ?? t('cit_msg_fir_failed') })
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      {message && <Alert type={message.type}>{message.text}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('cit_title')} error={errors.title?.message} tip={t('cit_title_tip')}>
          <input id="fir-title" className="input" placeholder={t('cit_placeholder_title')} {...register('title')} />
        </Field>
        <Field label={t('cit_location')} error={errors.location?.message} tip={t('cit_location_tip')}>
          <input id="fir-location" className="input" placeholder={t('cit_placeholder_location')} {...register('location')} />
        </Field>
      </div>

      <Field label={t('cit_description')} error={errors.description?.message} tip={t('cit_description_tip')}>
        <textarea id="fir-description" className="input min-h-24" placeholder={t('cit_placeholder_description')} {...register('description')} />
      </Field>

      <div className="rounded-xl border border-policeBlue-100 bg-policeBlue-50 p-4">
        <p className="mb-3 text-sm font-semibold text-policeBlue">
          📄 {t('cit_ocr_label')} <span className="ml-1 text-xs font-normal text-slate-400">{t('cit_ocr_optional')}</span>
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            id="fir-ocr-file"
            className="input flex-1"
            type="file"
            accept=".jpg,.jpeg,.png,.pdf,.txt,image/jpeg,image/png,application/pdf,text/plain"
            aria-label={t('cit_ocr_upload_aria')}
            onChange={(e) => setOcrFile(e.target.files?.[0] || null)}
          />
          <button
            type="button"
            id="fir-ocr-btn"
            onClick={runOcr}
            disabled={ocrLoading || !ocrFile}
            className="btn btn-primary btn-sm whitespace-nowrap"
          >
            {ocrLoading ? (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9" />
              </svg>
            ) : '🔍'}
            {ocrLoading ? t('cit_ocr_extracting') : t('cit_ocr_btn')}
          </button>
        </div>

        {ocrResult && (
          <div className="mt-3 rounded-lg border border-ok/30 bg-green-50 p-3 text-xs text-ok">
            <p><strong>{t('cit_category')}:</strong> {ocrResult.suggestedCategory || t('cit_ocr_result_na')} | <strong>{t('cit_priority')}:</strong> {ocrResult.suggestedPriority || t('cit_ocr_result_na')}</p>
            <p className="mt-1"><strong>{t('cit_keywords')}:</strong> {ocrResult.keywords || t('cit_ocr_keywords_none')}</p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-purple-100 bg-purple-50 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-purple-700">
            🎙️ {t('cit_voice_label')}
            <span className="ml-1 text-xs font-normal text-slate-400">{t('cit_ocr_optional')}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              setVoiceOpen((open) => !open)
              voice.stop()
              voice.clear()
            }}
            className="text-xs text-purple-500 underline hover:text-purple-700"
          >
            {voiceOpen ? t('cit_voice_close') : t('cit_voice_open')}
          </button>
        </div>

        {voiceOpen && (
          <div className="mt-3 space-y-3">
            {!voice.supported && (
              <p className="text-xs text-red-500">{t('cit_voice_browser_unsupported')}</p>
            )}

            {voice.supported && (
              <>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    id="voice-mic-btn"
                    onClick={voice.listening ? voice.stop : voice.start}
                    className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl text-white shadow-lg transition-all duration-200 ${
                      voice.listening ? 'scale-110 bg-red-500' : 'bg-purple-600 hover:scale-105 hover:bg-purple-700'
                    }`}
                    title={voice.listening ? t('cit_voice_stop') : t('cit_voice_start_btn')}
                  >
                    {voice.listening && (
                      <span className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-60" />
                    )}
                    🎙️
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${voice.listening ? 'text-red-600' : 'text-slate-600'}`}>
                      {voice.listening ? `● ${t('cit_voice_recording')}` : t('cit_voice_start')}
                    </p>
                    <p className="text-xs text-slate-400">
                      {voice.listening ? t('cit_voice_live') : t('cit_voice_idle_hint')}
                    </p>
                  </div>
                </div>

                <div className={`min-h-16 rounded-lg border p-3 text-sm transition-colors ${voice.listening ? 'border-red-200 bg-white' : 'border-purple-100 bg-white/60'}`}>
                  {(voice.transcript || voice.interimText) ? (
                    <p className="whitespace-pre-wrap leading-relaxed text-slate-700">
                      {voice.transcript}
                      {voice.interimText && <span className="italic text-slate-400">{voice.interimText}</span>}
                    </p>
                  ) : (
                    <p className="text-xs italic text-slate-300">{t('cit_voice_empty')}</p>
                  )}
                </div>

                {voice.error && <p className="text-xs text-red-500">{voice.error}</p>}

                <div className="flex gap-2">
                  <button
                    type="button"
                    id="voice-apply-btn"
                    disabled={!voice.transcript.trim() || ocrLoading}
                    onClick={applyVoiceText}
                    className="btn btn-primary btn-sm flex-1 disabled:opacity-40"
                  >
                    {ocrLoading ? `⏳ ${t('cit_voice_analysing')}` : `✅ ${t('cit_voice_apply')}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      voice.stop()
                      voice.clear()
                    }}
                    className="btn btn-outline btn-sm"
                  >
                    🗑️ {t('cit_voice_clear')}
                  </button>
                </div>

                <p className="text-xs text-slate-400">💡 {t('cit_voice_tip')}</p>
              </>
            )}
          </div>
        )}
      </div>

      <Field label={t('cit_aadhaar')} error={errors.aadhaarNumber?.message} tip={t('cit_aadhaar_tip')}>
        <input id="fir-aadhaar" className="input" placeholder={t('reg_placeholder_aadhaar')} maxLength={12} {...register('aadhaarNumber')} />
      </Field>

      <input type="hidden" {...register('ocrExtractedText')} />
      <input type="hidden" {...register('ocrKeywords')} />

      <div className="flex items-center gap-3">
        <button id="fir-submit" type="submit" disabled={!firAadhaar} className="btn btn-primary">
          {t('cit_submit')}
        </button>
        {!firAadhaar && <p className="text-xs text-warn">{t('cit_submit_hint')}</p>}
      </div>
    </form>
  )
}

function EvidenceForm() {
  const [firId, setFirId] = useState('')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const { t } = useTranslation()

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!firId.trim()) {
      setMessage({ type: 'error', text: t('cit_msg_enter_fir') })
      return
    }
    if (!/^\d+$/.test(firId)) {
      setMessage({ type: 'error', text: t('cit_msg_invalid_fir') })
      return
    }
    if (!file) {
      setMessage({ type: 'error', text: t('cit_msg_choose_evidence') })
      return
    }

    setBusy(true)
    setMessage(null)
    const form = new FormData()
    form.append('file', file)

    try {
      await http.post(`/citizen/fir/${firId.trim()}/evidence`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setMessage({
        type: 'success',
        text: t('cit_msg_evidence_success').replace('{file}', file.name).replace('{id}', firId),
      })
      setFile(null)
      setFirId('')
      const input = document.getElementById('ev-file')
      if (input) input.value = ''
    } catch (err) {
      setMessage({ type: 'error', text: err?.response?.data?.error ?? t('cit_msg_evidence_failed') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      {message && <Alert type={message.type}>{message.text}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('cit_ev_fir_id')} tip={t('cit_ev_fir_tip')}>
          <input
            id="ev-firId"
            className={`input ${firId && !/^\d+$/.test(firId) ? 'border-red-400 focus:ring-red-300' : ''}`}
            placeholder={t('cit_ev_placeholder')}
            value={firId}
            onChange={(e) => setFirId(e.target.value.replace(/\D/g, ''))}
          />
          {firId && !/^\d+$/.test(firId) && (
            <p className="mt-1 text-xs text-red-500">{t('cit_ev_id_error')}</p>
          )}
        </Field>

        <Field label={t('cit_ev_file')} tip={t('cit_ev_file_tip')}>
          <input
            id="ev-file"
            className="input"
            type="file"
            accept="*/*"
            aria-label={t('cit_ev_file')}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </Field>
      </div>

      {file && (
        <p className="text-xs text-slate-500">
          {t('cit_ev_selected')} <span className="font-medium text-policeBlue">{file.name}</span>
          {' '}({(file.size / 1024).toFixed(0)} KB · {file.type || t('cit_ev_unknown_type')})
        </p>
      )}

      <button id="ev-submit" type="submit" disabled={busy || !firId || !file} className="btn btn-gold disabled:opacity-50">
        {busy ? t('cit_ev_uploading') : `📎 ${t('cit_ev_btn')}`}
      </button>
    </form>
  )
}

function FirTable({ firs, loading }) {
  const { t } = useTranslation()

  if (loading) return <LoadingSpinner label={t('cit_loading_firs')} />
  if (!firs.length) return <EmptyState icon="📂" title={t('cit_no_firs')} description={t('cit_no_firs_desc')} />

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>{t('cit_table_id')}</th>
            <th>{t('cit_table_title')}</th>
            <th>{t('cit_table_category')}</th>
            <th>{t('cit_table_status')}</th>
            <th>{t('cit_table_priority')}</th>
          </tr>
        </thead>
        <tbody>
          {firs.map((fir) => (
            <tr key={fir.id}>
              <td className="font-mono text-xs text-slate-500">#{fir.id}</td>
              <td className="font-medium text-policeBlue">{fir.title}</td>
              <td className="text-slate-500">{fir.category ?? '—'}</td>
              <td><StatusBadge status={fir.status} /></td>
              <td><PriorityBadge priority={fir.priority} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FirTimelines({ firs }) {
  const { t } = useTranslation()
  if (!firs.length) return null

  return (
    <div className="mt-6 space-y-4">
      {firs.map((fir) => (
        <div key={`tl-${fir.id}`} className="rounded-xl border border-policeBlue-50 bg-surface p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-policeBlue">FIR #{fir.id} - {fir.title}</p>
            <div className="flex gap-2">
              <StatusBadge status={fir.status} />
              <PriorityBadge priority={fir.priority} />
            </div>
          </div>
          <StatusTimeline status={fir.status} />
          <p className="mt-3 text-xs text-slate-500">
            📍 {t('cit_assigned_station')}: <span className="font-medium">{fir.assignedStation ?? t('cit_pending_assignment')}</span>
          </p>
        </div>
      ))}
    </div>
  )
}

export function CitizenDashboard() {
  const { firs, loading, error, reload } = useFirs()
  const { t } = useTranslation()

  return (
    <div className="animate-fade-in space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title={t('cit_total_firs')} value={firs.length} tone="blue" icon="📋" />
        <StatCard title={t('cit_pending')} value={firs.filter((fir) => fir.status !== 'RESOLVED').length} tone="gold" icon="⏳" />
        <StatCard title={t('cit_resolved')} value={firs.filter((fir) => fir.status === 'RESOLVED').length} tone="green" icon="✅" />
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <Panel title={`🗂️ ${t('cit_file_fir')}`}>
        <FirForm onSuccess={reload} />
      </Panel>

      <Panel title={`📎 ${t('cit_upload_evidence')}`}>
        <EvidenceForm />
      </Panel>

      <Panel title={`📊 ${t('cit_track_status')}`}>
        <FirTable firs={firs} loading={loading} />
        <FirTimelines firs={firs} />
      </Panel>
    </div>
  )
}
