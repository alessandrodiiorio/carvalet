export default function CompagniaForm({ action, compagnia, submitLabel = 'Salva' }) {
  const c = compagnia ?? {}
  return (
    <form action={action} className="space-y-4">
      <Field label="Nome *" name="nome" defaultValue={c.nome} required />
      <Field label="Partita IVA" name="partita_iva" defaultValue={c.partita_iva} />
      <Field label="Referente" name="referente" defaultValue={c.referente} />
      <Field label="Email" name="email" type="email" defaultValue={c.email} />
      <Field label="Telefono" name="telefono" type="tel" defaultValue={c.telefono} />
      <Field label="Indirizzo" name="indirizzo" defaultValue={c.indirizzo} />

      <div>
        <label htmlFor="note" className="block text-sm font-medium mb-1">
          Note
        </label>
        <textarea
          id="note"
          name="note"
          rows={3}
          defaultValue={c.note ?? ''}
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

function Field({ label, name, type = 'text', defaultValue, required }) {
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
        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
      />
    </div>
  )
}
