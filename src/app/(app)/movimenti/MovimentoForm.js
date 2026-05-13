'use client'

import { useEffect, useState } from 'react'
import ModelloPicker from '@/components/ModelloPicker'
import LuogoPicker from '@/components/LuogoPicker'

const TIPI = [
  { value: 'ritiro', label: 'Ritiro' },
  { value: 'consegna', label: 'Consegna' },
  { value: 'ritiro_consegna', label: 'Ritiro + Consegna' },
]

const STATI = [
  { value: 'programmato', label: 'Programmato' },
  { value: 'completato', label: 'Completato' },
  { value: 'annullato', label: 'Annullato' },
]

function isoToLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function MovimentoForm({
  action,
  movimento,
  veicoli,
  compagnie,
  profili,
  isModifica = false,
  submitLabel = 'Salva',
}) {
  const m = movimento ?? {}

  const [modalita, setModalita] = useState('esistente')
  const [dataLocale, setDataLocale] = useState('')
  const [tipo, setTipo] = useState(m.tipo ?? 'ritiro_consegna')
  const [dueVeicoli, setDueVeicoli] = useState(!!m.veicolo_consegna_id)
  useEffect(() => {
    if (m.data_ora) setDataLocale(isoToLocalInput(m.data_ora))
  }, [m.data_ora])
  const dataIso = dataLocale ? new Date(dataLocale).toISOString() : ''
  const mostraDueVeicoli = tipo === 'ritiro_consegna' && dueVeicoli
  const labelPrimoVeicolo = mostraDueVeicoli ? 'Veicolo ritiro' : 'Veicolo'

  return (
    <form action={action} className="space-y-5">
      {/* Selettore veicolo */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">{labelPrimoVeicolo}</legend>

        {!isModifica && (
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
            <ToggleBtn
              active={modalita === 'esistente'}
              onClick={() => setModalita('esistente')}
            >
              Esistente
            </ToggleBtn>
            <ToggleBtn
              active={modalita === 'nuovo'}
              onClick={() => setModalita('nuovo')}
            >
              Nuovo
            </ToggleBtn>
          </div>
        )}

        <input type="hidden" name="modalita_veicolo" value={isModifica ? 'esistente' : modalita} />

        {(isModifica || modalita === 'esistente') && (
          <div>
            <label htmlFor="veicolo_id" className="sr-only">{labelPrimoVeicolo}</label>
            <select
              id="veicolo_id"
              name="veicolo_id"
              required={isModifica || modalita === 'esistente'}
              defaultValue={m.veicolo_id ?? ''}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="" disabled>Seleziona un veicolo</option>
              {veicoli.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.targa} — {v.modello}
                  {v.compagnie?.nome ? ` (${v.compagnie.nome})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {!isModifica && modalita === 'nuovo' && (
          <div className="space-y-3 rounded-lg bg-slate-50 p-3">
            <div>
              <label htmlFor="nuovo_compagnia_id" className="block text-sm font-medium mb-1">
                Compagnia *
              </label>
              <select
                id="nuovo_compagnia_id"
                name="nuovo_compagnia_id"
                required={modalita === 'nuovo'}
                defaultValue=""
                className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="" disabled>Seleziona</option>
                {compagnie.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <Field
              label="Targa *"
              name="nuova_targa"
              required={modalita === 'nuovo'}
              autoCapitalize="characters"
              placeholder="es. AB123CD"
            />
            <ModelloPicker
              name="nuovo_modello"
              required={modalita === 'nuovo'}
            />
            <p className="text-xs text-slate-500">
              Il veicolo verrà aggiunto all&apos;anagrafica.
            </p>
          </div>
        )}
      </fieldset>

      {/* Tipo */}
      <div>
        <label htmlFor="tipo" className="block text-sm font-medium mb-1">Tipo *</label>
        <select
          id="tipo"
          name="tipo"
          required
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
        >
          {TIPI.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Toggle 2 veicoli (solo ritiro_consegna) */}
      {tipo === 'ritiro_consegna' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
            <ToggleBtn
              active={!dueVeicoli}
              onClick={() => setDueVeicoli(false)}
            >
              Stesso veicolo
            </ToggleBtn>
            <ToggleBtn
              active={dueVeicoli}
              onClick={() => setDueVeicoli(true)}
            >
              2 veicoli diversi
            </ToggleBtn>
          </div>

          {dueVeicoli && (
            <div>
              <label htmlFor="veicolo_consegna_id" className="block text-sm font-medium mb-1">
                Veicolo consegna *
              </label>
              <select
                id="veicolo_consegna_id"
                name="veicolo_consegna_id"
                required={dueVeicoli}
                defaultValue={m.veicolo_consegna_id ?? ''}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="" disabled>Seleziona veicolo per consegna</option>
                {veicoli.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.targa} — {v.modello}
                    {v.compagnie?.nome ? ` (${v.compagnie.nome})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                Veicolo diverso ritirato/consegnato nel secondo segmento.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Data e ora */}
      <div>
        <label htmlFor="data_ora_local" className="block text-sm font-medium mb-1">
          Data e ora *
        </label>
        <input
          id="data_ora_local"
          type="datetime-local"
          required
          value={dataLocale}
          onChange={(e) => setDataLocale(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
        <input type="hidden" name="data_ora" value={dataIso} />
      </div>

      {/* Luoghi */}
      <LuogoPicker
        label="Luogo di ritiro"
        name="luogo_ritiro"
        defaultValue={m.luogo_ritiro ?? ''}
      />
      <LuogoPicker
        label="Luogo di consegna"
        name="luogo_consegna"
        defaultValue={m.luogo_consegna ?? ''}
      />

      {/* Assegnato a */}
      <div>
        <label htmlFor="assegnato_a" className="block text-sm font-medium mb-1">
          Assegnato a
        </label>
        <select
          id="assegnato_a"
          name="assegnato_a"
          defaultValue={m.assegnato_a ?? ''}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
        >
          <option value="">— Nessuno —</option>
          {profili.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome} ({p.ruolo})
            </option>
          ))}
        </select>
      </div>

      {/* Stato (solo in modifica) */}
      {isModifica && (
        <div>
          <label htmlFor="stato" className="block text-sm font-medium mb-1">Stato</label>
          <select
            id="stato"
            name="stato"
            defaultValue={m.stato ?? 'programmato'}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            {STATI.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Note */}
      <div>
        <label htmlFor="note" className="block text-sm font-medium mb-1">Note</label>
        <textarea
          id="note"
          name="note"
          rows={3}
          defaultValue={m.note ?? ''}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-slate-900 text-white font-medium py-2.5 hover:bg-slate-800"
      >
        {submitLabel}
      </button>
    </form>
  )
}

function ToggleBtn({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'rounded-md py-1.5 text-sm font-medium transition ' +
        (active ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900')
      }
    >
      {children}
    </button>
  )
}

function Field({ label, name, type = 'text', defaultValue, required, ...rest }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium mb-1">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ''}
        required={required}
        {...rest}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
      />
    </div>
  )
}
