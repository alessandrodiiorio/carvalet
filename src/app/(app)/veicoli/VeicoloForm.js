import ModelloPicker from '@/components/ModelloPicker'
import TargaInput from '@/components/TargaInput'
import FotoVeicoloInput from '@/components/FotoVeicoloInput'

export default function VeicoloForm({
  action,
  veicolo,
  compagnie,
  submitLabel = 'Salva',
}) {
  const v = veicolo ?? {}
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="compagnia_id" className="block text-sm font-medium mb-1">
          Compagnia *
        </label>
        <select
          id="compagnia_id"
          name="compagnia_id"
          required
          defaultValue={v.compagnia_id ?? ''}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
        >
          <option value="" disabled>
            Seleziona una compagnia
          </option>
          {compagnie.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>

      <TargaInput
        name="targa"
        defaultValue={v.targa ?? ''}
        defaultFotoUrl={v.foto_targa_url ?? ''}
        required
      />
      <ModelloPicker
        name="modello"
        defaultValue={v.modello ?? ''}
        required
      />

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Foto veicolo</legend>
        <div className="grid grid-cols-2 gap-3">
          <FotoVeicoloInput
            name="foto_fianco_dx_url"
            label="Fianco destro"
            defaultUrl={v.foto_fianco_dx_url ?? ''}
          />
          <FotoVeicoloInput
            name="foto_fianco_sx_url"
            label="Fianco sinistro"
            defaultUrl={v.foto_fianco_sx_url ?? ''}
          />
          <FotoVeicoloInput
            name="foto_anteriore_url"
            label="Anteriore"
            defaultUrl={v.foto_anteriore_url ?? ''}
          />
          <FotoVeicoloInput
            name="foto_posteriore_url"
            label="Posteriore"
            defaultUrl={v.foto_posteriore_url ?? ''}
          />
        </div>
      </fieldset>

      <div>
        <label htmlFor="note" className="block text-sm font-medium mb-1">
          Note
        </label>
        <textarea
          id="note"
          name="note"
          rows={3}
          defaultValue={v.note ?? ''}
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
