'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

async function resizeImmagine(file, maxLato = 800, quality = 0.7) {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const ratio = Math.min(maxLato / Math.max(img.width, img.height), 1)
    const w = Math.round(img.width * ratio)
    const h = Math.round(img.height * ratio)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, w, h)
    const blob = await new Promise((res) =>
      canvas.toBlob(res, 'image/jpeg', quality),
    )
    return blob
  } finally {
    URL.revokeObjectURL(url)
  }
}

export default function FotoVeicoloInput({
  name,
  label,
  defaultUrl = '',
}) {
  const [preview, setPreview] = useState(defaultUrl || null)
  const [fotoUrl, setFotoUrl] = useState(defaultUrl || '')
  const [busy, setBusy] = useState(false)
  const [errore, setErrore] = useState(null)
  const inputFileRef = useRef(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setErrore(null)
    setBusy(true)
    try {
      const blob = await resizeImmagine(file, 800, 0.7)
      if (!blob) throw new Error('Resize fallito')

      const supabase = createClient()
      const path = `veicolo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
      const { error: upErr } = await supabase.storage
        .from('targhe')
        .upload(path, blob, {
          contentType: 'image/jpeg',
          cacheControl: '31536000',
        })
      if (upErr) throw new Error('Upload: ' + upErr.message)

      const { data: pub } = supabase.storage.from('targhe').getPublicUrl(path)
      setFotoUrl(pub.publicUrl)
      setPreview(pub.publicUrl)
    } catch (err) {
      setErrore(err?.message ?? String(err))
    } finally {
      setBusy(false)
    }
  }

  function rimuovi() {
    setPreview(null)
    setFotoUrl('')
    setErrore(null)
    if (inputFileRef.current) inputFileRef.current.value = ''
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-slate-700">
        {label}
      </label>

      <input type="hidden" name={name} value={fotoUrl} />

      {preview ? (
        <div className="relative aspect-[4/3] rounded-lg border border-slate-300 overflow-hidden bg-slate-100">
          <img
            src={preview}
            alt={label}
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={rimuovi}
            disabled={busy}
            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 border border-slate-300 text-slate-700 text-xs flex items-center justify-center shadow"
            aria-label="Rimuovi"
          >
            ×
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputFileRef.current?.click()}
          disabled={busy}
          className="aspect-[4/3] w-full rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 flex flex-col items-center justify-center text-xs text-slate-500 transition-colors disabled:opacity-50"
        >
          {busy ? (
            <svg viewBox="0 0 24 24" className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
            </svg>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 mb-1">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Aggiungi foto
            </>
          )}
        </button>
      )}

      <input
        ref={inputFileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />

      {errore && <p className="text-[10px] text-red-600">{errore}</p>}
    </div>
  )
}
