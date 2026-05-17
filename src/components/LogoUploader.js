'use client'

import { useRef, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'

async function resizeLogo(file, maxLato = 400) {
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
    return await new Promise((res) => canvas.toBlob(res, 'image/png'))
  } finally {
    URL.revokeObjectURL(url)
  }
}

export default function LogoUploader({ defaultUrl = '', azione }) {
  const [preview, setPreview] = useState(defaultUrl || null)
  const [busy, setBusy] = useState(false)
  const [errore, setErrore] = useState(null)
  const inputRef = useRef(null)
  const [, startTransition] = useTransition()

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setErrore(null)
    setBusy(true)
    try {
      const blob = await resizeLogo(file, 400)
      if (!blob) throw new Error('Resize fallito')

      const supabase = createClient()
      const path = `logo-${Date.now()}.png`
      const { error: upErr } = await supabase.storage
        .from('logo')
        .upload(path, blob, {
          contentType: 'image/png',
          cacheControl: '31536000',
        })
      if (upErr) throw new Error(upErr.message)

      const { data: pub } = supabase.storage.from('logo').getPublicUrl(path)
      setPreview(pub.publicUrl)

      const fd = new FormData()
      fd.set('logo_url', pub.publicUrl)
      startTransition(async () => {
        try {
          await azione(fd)
        } catch (err) {
          setErrore(err?.message ?? String(err))
        } finally {
          setBusy(false)
        }
      })
    } catch (err) {
      setErrore(err?.message ?? String(err))
      setBusy(false)
    }
  }

  async function rimuoviLogo() {
    setErrore(null)
    setBusy(true)
    const fd = new FormData()
    fd.set('logo_url', '')
    startTransition(async () => {
      try {
        await azione(fd)
        setPreview(null)
      } catch (err) {
        setErrore(err?.message ?? String(err))
      } finally {
        setBusy(false)
      }
    })
  }

  return (
    <div className="space-y-3">
      {preview ? (
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 flex items-center justify-center">
          <img
            src={preview}
            alt="Logo corrente"
            className="max-h-32 object-contain"
          />
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-50 border-2 border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Nessun logo caricato
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex-1 rounded-lg bg-indigo-600 text-white font-semibold py-2.5 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 transition-colors"
        >
          {busy ? 'Caricamento…' : preview ? 'Sostituisci logo' : 'Carica logo'}
        </button>
        {preview && (
          <button
            type="button"
            onClick={rimuoviLogo}
            disabled={busy}
            className="rounded-lg border border-red-300 bg-white text-red-700 text-sm font-medium px-4 py-2.5 hover:bg-red-50 disabled:opacity-50"
          >
            Rimuovi
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={handleFile}
        className="hidden"
      />

      <p className="text-xs text-slate-500">
        Formati: PNG, JPG, WebP, SVG. Resize automatico a max 400px lato lungo.
      </p>

      {errore && <p className="text-xs text-red-600">{errore}</p>}
    </div>
  )
}
