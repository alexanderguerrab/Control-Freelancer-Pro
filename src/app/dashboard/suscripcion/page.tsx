import { createClient } from '@/utils/supabase/server'
import { EstadoSuscripcion } from '@/components/ui'
import { estadoSuscripcion } from '@/lib/saas'
import type { PagoSaaS, SuscripcionSaaS } from '@/lib/types'

function Caja({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 bg-white p-5 rounded-lg border border-gray-200 text-center shadow-sm min-w-[200px]">
      <label className="etiqueta">{titulo}</label>
      <div className="text-xl font-extrabold mt-1">{children}</div>
    </div>
  )
}

export default async function SuscripcionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const [{ data: suscripcion }, { data: pagos }] = await Promise.all([
    supabase.from('suscripciones_saas').select('*').eq('usuario_id', user!.id).maybeSingle<SuscripcionSaaS>(),
    supabase.from('pagos_saas').select('*').eq('usuario_id', user!.id).order('fecha_pago', { ascending: false }),
  ])
  const historial = (pagos ?? []) as PagoSaaS[]

  return (
    <div>
      <h1 className="titulo-seccion">💳 Estado de Mi Suscripción</h1>

      <div className="flex gap-4 mb-5 flex-wrap">
        <Caja titulo="Plan Actual"><span className="text-accent">{suscripcion?.plan ?? 'Sin plan activo'}</span></Caja>
        <Caja titulo="Próximo Pago"><span className="text-warning-gold">{suscripcion?.proximo_pago ?? '---'}</span></Caja>
        <Caja titulo="Estado"><EstadoSuscripcion estado={estadoSuscripcion(suscripcion)} /></Caja>
      </div>

      <div className="card-ancha">
        <div className="bg-warning-gold p-2 font-bold text-center text-sm">HISTORIAL DE PAGOS</div>
        <div className="tabla-contenedor mt-2">
          <table className="tabla min-w-[700px]">
            <thead>
              <tr>{['FECHA DE PAGO', 'PERIODO CUBIERTO', 'PLAN', 'MÉTODO', 'RECIBO'].map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {historial.length === 0 ? (
                <tr><td colSpan={5} className="py-8! text-gray-400!">No hay pagos registrados en tu historial.</td></tr>
              ) : (
                historial.map((p) => (
                  <tr key={p.id}>
                    <td>{p.fecha_pago}</td>
                    <td>{p.periodo}</td>
                    <td>{p.plan}</td>
                    <td>{p.metodo}</td>
                    <td>
                      {p.recibo_url && (
                        <a href={p.recibo_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">🧾 Ver Recibo</a>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
