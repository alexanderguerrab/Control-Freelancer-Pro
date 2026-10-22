import Link from 'next/link'

/** Marco común de las páginas públicas de Términos y Privacidad. */
export default function PaginaLegal({
  titulo,
  children,
  otroHref,
  otroTexto,
}: {
  titulo: string
  children: React.ReactNode
  otroHref: string
  otroTexto: string
}) {
  return (
    <main className="min-h-screen bg-bg-dark text-gray-200 px-4 py-8">
      <div className="max-w-[760px] mx-auto">
        <Link href="/login" className="inline-block mb-4 text-sm text-login-cyan hover:underline">
          ← Volver a Control Freelancer Pro
        </Link>
        <article className="bg-bg-card-dark border border-border-dark rounded-2xl p-7 max-md:p-5 leading-relaxed">
          <h1 className="text-[1.7rem] font-bold text-white leading-tight">{titulo}</h1>
          <p className="text-sm text-text-muted mt-1 mb-5">Control Freelancer Pro · Última actualización: 21 de octubre de 2026</p>
          <div className="space-y-2 [&_h2]:text-login-cyan [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-7 [&_h2]:mb-1 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_a]:text-login-cyan [&_a]:underline">
            {children}
          </div>
        </article>
        <p className="text-center text-sm text-text-muted mt-6">
          <Link href={otroHref} className="text-login-cyan hover:underline">{otroTexto}</Link>
          {' · '}
          <Link href="/login" className="text-login-cyan hover:underline">Inicio</Link>
        </p>
      </div>
    </main>
  )
}
