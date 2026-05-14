'use client'

import { useRef, useState } from 'react'

// Pattern targa italiana: 2 lettere + 3 cifre + 2 lettere (es. AB123CD)
const REGEX_TARGA_IT = /[A-Z]{2}\s?\d{3}\s?[A-Z]{2}/

function estraiTarga(testo) {
  if (!testo) return null
  const up = testo.toUpperCase().replace(/[^A-Z0-9\s]/g, '')
  const match = up.match(REGEX_TARGA_IT)
  return match ? match[0].replace(/\s+/g, '') : null
}

export default function TargaInput({
  name,
  defaultValue = '',
  required = false,
  placeholder = 'es. AB123CD',
}) {
  const [valore, setValore] = useState(defaultValue)
  const [preview, setPreview] = useState(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrErrore, setOcrErrore] = useState(null)
  const inputFileRef = useRef(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setPreview(URL.createObjectURL(file))
    setOcrErrore(null)
    setOcrLoading(true)

    try {
      const Tesseract = await import('tesseract.js')
      const { data } = await Tesseract.recognize(file, 'eng', {
        // logger: (m) => console.log(m),
      })
      const targa = estraiTarga(data?.text || '')
      if (targa) {
        setValore(targa)
      } else {
        setOcrErrore(
          'Targa non rilevata automaticamente. Digita manualmente.',
        )
      }
    } catch (err) {
      setOcrErrore('OCR non disponibile: ' + (err?.message || 'errore'))
    } finally {
      setOcrLoading(false)
    }
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
          disabled={ocrLoading}
          aria-label="Scatta foto targa"
          className="inline-flex items-center justify-center w-10 h-10 shrink-0 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50 transition-colors"
          title="Scatta foto targa"
        >
          {ocrLoading ? (
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

      {preview && (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Foto targa"
            className="max-w-full max-h-40 rounded-lg border border-slate-300"
          />
          <button
            type="button"
            onClick={() => {
              setPreview(null)
              setOcrErrore(null)
            }}
            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 border border-slate-300 text-slate-700 text-xs flex items-center justify-center"
            aria-label="Rimuovi foto"
          >
            ×
          </button>
        </div>
      )}

      {ocrLoading && (
        <p className="text-xs text-slate-500">Riconoscimento targa in corso…</p>
      )}
      {ocrErrore && (
        <p className="text-xs text-amber-700">{ocrErrore}</p>
      )}
    </div>
  )
}
