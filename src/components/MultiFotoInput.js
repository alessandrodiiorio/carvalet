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

export default function MultiFotoInput({
  name = 'foto_aggiuntive_urls',
  defaultUrls = [],
  label = 'Foto aggiuntive',
}) {
  const [urls, setUrls] = useState(defaultUrls)
  const [busy, setBusy] = useState(false)
  const [errore, setErrore] = useState(null)
  const inputFileRef = useRef(null)

  async function handleFiles(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setErrore(null)
    setBusy(true)

    try {
      const supabase = createClient()
      const nuoveUrls = []
      for (const file of files) {
        const blob = await resizeImmagine(file, 800, 0.7)
        if (!blob) continue
        const path = `veicolo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
        const { error: upErr } = await supabase.storage
          .from('targhe')
          .upload(path, blob, {
            contentType: 'image/jpeg',
            cacheControl: '31536000',
          })
        if (upErr) throw new Error('Upload: ' + upErr.message)
        const { data: pub } = supabase.storage.from('targhe').getPublicUrl(path)
        nuoveUrls.push(pub.publicUrl)
      }
      setUrls((prev) => [...prev, ...nuoveUrls])
    } catch (err) {
      setErrore(err?.message ?? String(err))
    } finally {
      setBusy(false)
      if (inputFileRef.current) inputFileRef.current.value = ''
    }
  }

  function rimuovi(idx) {
    setUrls((prev) => prev.filter((_, i) => i !== idx))
  }

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold">{label}</legend>

      <input type="hidden" name={name} value={JSON.stringify(urls)} />

      {urls.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {urls.map((url, i) => (
            <div
              key={url + i}
              className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 border border-slate-300"
            >
              <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => rimuovi(i)}
                disabled={busy}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 border border-slate-300 text-slate-700 text-xs flex items-center justify-center shadow"
                aria-label="Rimuovi foto"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => inputFileRef.current?.click()}
        disabled={busy}
        className="w-full rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium text-slate-600 disabled:opacity-50"
      >
        {busy ? (
          <>
            <svg viewBox="0 0 24 24" className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
            </svg>
            Caricamento…
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            Aggiungi foto
            {urls.length > 0 && (
              <span className="text-xs text-slate-400">({urls.length})</span>
            )}
          </>
        )}
      </button>

      <input
        ref={inputFileRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleFiles}
        className="hidden"
      />

      {errore && <p className="text-xs text-red-600">{errore}</p>}
    </fieldset>
  )
}
