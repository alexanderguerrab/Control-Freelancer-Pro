export default function SuscripcionPage() {
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-center text-primary mb-6">💳 Estado de Mi Suscripción</h1>
      <div className="flex gap-4 mb-5 flex-wrap">
        <div className="flex-1 bg-white p-5 rounded-lg border border-gray-200 text-center shadow-sm min-w-[200px]">
          <label className="block text-[0.75em] font-bold text-gray-500 uppercase">PLAN ACTUAL</label>
          <span className="text-xl font-extrabold text-accent">Premium</span>
        </div>
        <div className="flex-1 bg-white p-5 rounded-lg border border-gray-200 text-center shadow-sm min-w-[200px]">
          <label className="block text-[0.75em] font-bold text-gray-500 uppercase">PRÓXIMO PAGO</label>
          <span className="text-xl font-extrabold text-warning-gold">---</span>
        </div>
        <div className="flex-1 bg-white p-5 rounded-lg border border-gray-200 text-center shadow-sm min-w-[200px]">
          <label className="block text-[0.75em] font-bold text-gray-500 uppercase">ESTADO</label>
          <span className="bg-success text-white px-3 py-1 rounded-xl text-xs font-extrabold uppercase mt-1 inline-block">Activo</span>
        </div>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-md w-full">
        <div className="bg-warning-gold p-2 font-bold text-center text-sm">HISTORIAL DE PAGOS</div>
        <div className="w-full overflow-x-auto mt-2">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['FECHA DE PAGO', 'PERIODO CUBIERTO', 'PLAN', 'MÉTODO', 'RECIBO'].map(h => (
                  <th key={h} className="bg-gray-50 border-b-2 border-gray-200 py-3 px-2 text-center text-[0.85em] font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">No hay pagos registrados aún</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
