import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getUtente, isTitolare } from '@/lib/auth'
import DeleteButton from '@/components/DeleteButton'
import {
  aggiornaMovimento,
  aggiornaStatoMovimento,
  eliminaMovimento,
} from '../actions'
import MovimentoForm from '../MovimentoForm'

const TIPO_LABEL = {
  ritiro: 'Ritiro',
  consegna: 'Consegna',
  ritiro_consegna: 'Ritiro + Consegna',
}

function formatDataOra(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function MovimentoPage({ params, searchParams }) {
  const { id } = await params
  const sp = await searchParams

  const { profilo, supabase } = await getUtente()
  const titolare = isTitolare(profilo)

  const [
    { data: movimento, error: errLoad },
    { data: veicoli },
    { data: profili },
  ] = await Promise.all([
    supabase
      .from('movimenti')
      .select(`
        *,
        veicoli ( id, targa, modello, compagnie ( nome ) ),
        assegnato:profili!movimenti_assegnato_a_fkey ( id, nome )
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('veicoli')
      .select('id, targa, modello, compagnie ( nome )')
      .order('targa', { ascending: true }),
    supabase.from('profili').select('id, nome, ruolo').order('nome', { ascending: true }),
  ])

  if (errLoad || !movimento) notFound()

  const aggiornaConId = aggiornaMovimento.bind(null, id)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Movimento</h1>
        <Link href="/movimenti" className="text-sm text-slate-600 underline">
          Indietro
        </Link>
      </div>

      <p className="text-sm text-slate-500">
        {formatDataOra(movimento.data_ora)} · {TIPO_LABEL[movimento.tipo] ?? movimento.tipo}
      </p>

      {sp?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {sp.error}
        </div>
      )}
      {sp?.info && (
        <div className="rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm p-3">
          {sp.info}
        </div>
      )}

      {titolare ? (
        <div className="rounded-2xl bg-white shadow p-5">
          <MovimentoForm
            action={aggiornaConId}
            movimento={movimento}
            veicoli={veicoli ?? []}
            compagnie={[]}
            profili={profili ?? []}
            isModifica
            submitLabel="Salva modifiche"
          />
        </div>
      ) : (
        <CollaboratorView movimento={movimento} />
      )}

      {titolare && (
        <div className="rounded-2xl bg-white shadow p-5 border border-red-100">
          <h2 className="font-semibold text-red-700 mb-2">Zona pericolo</h2>
          <p className="text-sm text-slate-600 mb-3">L&apos;eliminazione è permanente.</p>
          <form action={eliminaMovimento}>
            <input type="hidden" name="id" value={id} />
            <DeleteButton message="Eliminare definitivamente questo movimento?">
              Elimina movimento
            </DeleteButton>
          </form>
        </div>
      )}
    </div>
  )
}

function CollaboratorView({ movimento }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white shadow p-5 space-y-2 text-sm">
        <Row label="Veicolo" value={`${movimento.veicoli?.targa ?? '—'} · ${movimento.veicoli?.modello ?? ''}`} />
        <Row label="Compagnia" value={movimento.veicoli?.compagnie?.nome} />
        <Row label="Tipo" value={TIPO_LABEL[movimento.tipo]} />
        <Row label="Data e ora" value={formatDataOra(movimento.data_ora)} />
        <Row label="Luogo ritiro" value={movimento.luogo_ritiro} />
        <Row label="Luogo consegna" value={movimento.luogo_consegna} />
        <Row label="Note" value={movimento.note} />
        <Row label="Stato" value={movimento.stato} />
      </div>

      <div className="rounded-2xl bg-white shadow p-5 space-y-3">
        <h2 className="font-semibold">Aggiorna stato</h2>
        <form action={aggiornaStatoMovimento} className="flex flex-wrap gap-2">
          <input type="hidden" name="id" value={movimento.id} />
          <StateBtn name="stato" value="programmato" current={movimento.stato}>
            Programmato
          </StateBtn>
          <StateBtn name="stato" value="completato" current={movimento.stato}>
            Completato
          </StateBtn>
          <StateBtn name="stato" value="annullato" current={movimento.stato}>
            Annullato
          </StateBtn>
        </form>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  if (!value) return null
  return (
    <div>
      <p className="text-slate-500">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}

function StateBtn({ name, value, current, children }) {
  const active = value === current
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={active}
      className={
        'rounded-lg px-3 py-2 text-sm font-medium ' +
        (active
          ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
          : 'bg-slate-900 text-white hover:bg-slate-800')
      }
    >
      {children}
    </button>
  )
}
