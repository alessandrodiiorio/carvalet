import { redirect } from 'next/navigation'
import { getUtente, isTitolare } from '@/lib/auth'
import LogoUploader from '@/components/LogoUploader'
import { aggiornaLogo, salvaAnagrafica } from './actions'

export const metadata = {
  title: 'Impostazioni',
}

export default async function ImpostazioniPage({ searchParams }) {
  const { profilo, supabase } = await getUtente()
  if (!isTitolare(profilo)) redirect('/movimenti')

  const sp = await searchParams
  const { data: imp } = await supabase
    .from('impostazioni_app')
    .select('*')
    .eq('id', 1)
    .single()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Impostazioni</h1>

      {sp?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {sp.error}
        </div>
      )}
      {sp?.info && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm p-3">
          {sp.info}
        </div>
      )}

      <section className="rounded-2xl bg-white shadow p-5 space-y-3">
        <div>
          <h2 className="font-semibold">Anagrafica azienda</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Nome mostrato nell&apos;header e nelle email. Dati per fatturazione (opzionali).
          </p>
        </div>

        <form action={salvaAnagrafica} className="space-y-3">
          <Field
            label="Nome azienda *"
            name="nome_azienda"
            defaultValue={imp?.nome_azienda ?? ''}
            required
            placeholder="Es. Auto Express SRL"
          />
          <Field
            label="Ragione sociale"
            name="ragione_sociale"
            defaultValue={imp?.ragione_sociale ?? ''}
            placeholder="Se diversa dal nome"
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Partita IVA"
              name="partita_iva"
              defaultValue={imp?.partita_iva ?? ''}
              placeholder="01234567890"
            />
            <Field
              label="Codice fiscale"
              name="codice_fiscale"
              defaultValue={imp?.codice_fiscale ?? ''}
            />
          </div>
          <Field
            label="Indirizzo"
            name="indirizzo"
            defaultValue={imp?.indirizzo ?? ''}
            placeholder="Via Roma 1"
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Città"
              name="citta"
              defaultValue={imp?.citta ?? ''}
            />
            <div className="grid grid-cols-2 gap-2">
              <Field
                label="CAP"
                name="cap"
                defaultValue={imp?.cap ?? ''}
                placeholder="80100"
              />
              <Field
                label="Prov."
                name="provincia"
                defaultValue={imp?.provincia ?? ''}
                placeholder="NA"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Telefono"
              name="telefono"
              type="tel"
              defaultValue={imp?.telefono ?? ''}
            />
            <Field
              label="Email contatto"
              name="email_contatto"
              type="email"
              defaultValue={imp?.email_contatto ?? ''}
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-slate-900 text-white font-semibold py-2.5 hover:bg-slate-800 transition-colors"
          >
            Salva anagrafica
          </button>
        </form>
      </section>

      <section className="rounded-2xl bg-white shadow p-5 space-y-3">
        <div>
          <h2 className="font-semibold">Logo</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Mostrato nell&apos;header e nelle email dei report.
          </p>
        </div>
        <LogoUploader
          defaultUrl={imp?.logo_url ?? ''}
          azione={aggiornaLogo}
        />
      </section>
    </div>
  )
}

function Field({ label, name, type = 'text', defaultValue, required, ...rest }) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-medium mb-1">
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
