'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Pattern targa italiana: 2 lettere + 3 cifre + 2 lettere
const REGEX_TARGA_IT = /[A-Z]{2}[\s\-]?\d{3}[\s\-]?[A-Z]{2}/

// Confusioni OCR comuni
const SUB_NUM_LETT = { '0': 'O', '1': 'I', '5': 'S', '8': 'B', '2': 'Z' }
const SUB_LETT_NUM = { O: '0', I: '1', S: '5', B: '8', Z: '2', Q: '0', D: '0' }

function estraiTarga(testo) {
  if (!testo) return null
  const up = testo.toUpperCase().replace(/[^A-Z0-9\s\-]/g, '')

  // Match diretto
  const direct = up.match(REGEX_TARGA_IT)
  if (direct) return direct[0].replace(/[\s\-]/g, '')

  // Cerca finestre di 7 char compatibili dopo sostituzioni OCR confusion
  const compact = up.replace(/[\s\-]/g, '')
  for (let i = 0; i + 7 <= compact.length; i++) {
    const w = compact.slice(i, i + 7)
    const fixed =
      (SUB_NUM_LETT[w[0]] ?? w[0]) +
      (SUB_NUM_LETT[w[1]] ?? w[1]) +
      (SUB_LETT_NUM[w[2]] ?? w[2]) +
      (SUB_LETT_NUM[w[3]] ?? w[3]) +
      (SUB_LETT_NUM[w[4]] ?? w[4]) +
      (SUB_NUM_LETT[w[5]] ?? w[5]) +
      (SUB_NUM_LETT[w[6]] ?? w[6])
    if (/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(fixed)) return fixed
  }
  return null
}

// Resize via canvas. Max 800px lato lungo, JPEG quality 0.7.
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

// Preprocessing per OCR: grayscale + contrast boost + threshold binario.
async function preprocessPerOCR(file, maxLato = 1600) {
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
    const id = ctx.getImageData(0, 0, w, h)
    const d = id.data

    // Calcola media luminanza
    let sum = 0
    const total = (d.length / 4) | 0
    for (let i = 0; i < d.length; i += 4) {
      sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    }
    const mean = sum / total
    const threshold = Math.max(60, Math.min(200, mean - 10))

    for (let i = 0; i < d.length; i += 4) {
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
      const bw = lum > threshold ? 255 : 0
      d[i] = bw
      d[i + 1] = bw
      d[i + 2] = bw
    }
    ctx.putImageData(id, 0, 0)
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'))
    return blob
  } finally {
    URL.revokeObjectURL(url)
  }
}

export default function TargaInput({
  name,
  defaultValue = '',
  defaultFotoUrl = '',
  required = false,
  placeholder = 'es. AB123CD',
}) {
  const [valore, setValore] = useState(defaultValue)
  const [preview, setPreview] = useState(defaultFotoUrl || null)
  const [fotoUrl, setFotoUrl] = useState(defaultFotoUrl || '')
  const [busy, setBusy] = useState(null) // 'upload' | 'ocr' | null
  const [errore, setErrore] = useState(null)
  const inputFileRef = useRef(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setErrore(null)
    setBusy('upload')

    try {
      // Resize
      const blob = await resizeImmagine(file, 800, 0.7)
      if (!blob) throw new Error('Resize fallito')

      setPreview(URL.createObjectURL(blob))

      // Upload a Supabase Storage
      const supabase = createClient()
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
      const { error: upErr } = await supabase.storage
        .from('targhe')
        .upload(path, blob, {
          contentType: 'image/jpeg',
          cacheControl: '31536000',
        })
      if (upErr) throw new Error('Upload: ' + upErr.message)

      const { data: pub } = supabase.storage.from('targhe').getPublicUrl(path)
      setFotoUrl(pub.publicUrl)

      // OCR su immagine preprocessata (grayscale + threshold)
      setBusy('ocr')
      try {
        const Tesseract = await import('tesseract.js')
        const blobOcr = await preprocessPerOCR(file)
        const targetOcr = blobOcr || file

        const tentativi = [
          { psm: '7', label: 'PSM7' },
          { psm: '6', label: 'PSM6' },
          { psm: '11', label: 'PSM11' }, // sparse text
        ]

        let trovata = null
        let ultimoTesto = ''
        for (const t of tentativi) {
          const worker = await Tesseract.createWorker('eng')
          await worker.setParameters({
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            tessedit_pageseg_mode: t.psm,
          })
          const { data } = await worker.recognize(targetOcr)
          await worker.terminate()
          ultimoTesto = data?.text || ''
          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.log(`[OCR ${t.label}]`, JSON.stringify(ultimoTesto))
          }
          trovata = estraiTarga(ultimoTesto)
          if (trovata) break
        }

        if (trovata) {
          setValore(trovata)
        } else {
          setErrore(
            'Targa non rilevata. OCR: "' +
              ultimoTesto.trim().slice(0, 60) +
              '". Digita manualmente.',
          )
        }
      } catch (ocrErr) {
        setErrore('OCR non disponibile: ' + (ocrErr?.message || 'errore'))
      }
    } catch (err) {
      setErrore(err?.message || String(err))
    } finally {
      setBusy(null)
    }
  }

  function rimuoviFoto() {
    setPreview(null)
    setFotoUrl('')
    setErrore(null)
    if (inputFileRef.current) inputFileRef.current.value = ''
  }

  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium">
        Targa {required && '*'}
      </label>

      <div className="flex gap-2">
        <input
          id={name}
          name={name}
          type="text"
          required={required}
          value={valore}
          onChange={(e) => setValore(e.target.value.toUpperCase().replace(/\s+/g, ''))}
          autoCapitalize="characters"
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
        <button
          type="button"
          onClick={() => inputFileRef.current?.click()}
          disabled={busy !== null}
          aria-label="Scatta foto targa"
          className="inline-flex items-center justify-center w-10 h-10 shrink-0 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50 transition-colors"
          title="Scatta foto targa"
        >
          {busy ? (
            <svg viewBox="0 0 24 24" className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          )}
        </button>
      </div>

      <input
        ref={inputFileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />

      {/* Hidden field con URL foto, letto dal server action */}
      <input type="hidden" name={`${name}_foto`} value={fotoUrl} />

      {preview && (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Foto targa"
            className="max-w-full max-h-40 rounded-lg border border-slate-300"
          />
          <button
            type="button"
            onClick={rimuoviFoto}
            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 border border-slate-300 text-slate-700 text-xs flex items-center justify-center"
            aria-label="Rimuovi foto"
          >
            ×
          </button>
        </div>
      )}

      {busy === 'upload' && (
        <p className="text-xs text-slate-500">Upload foto…</p>
      )}
      {busy === 'ocr' && (
        <p className="text-xs text-slate-500">Riconoscimento targa…</p>
      )}
      {errore && <p className="text-xs text-amber-700">{errore}</p>}
    </div>
  )
}
