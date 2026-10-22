import type { Metadata } from 'next'
import Link from 'next/link'
import PaginaLegal from '@/components/PaginaLegal'

export const metadata: Metadata = {
  title: 'Términos y condiciones · Control Freelancer Pro',
  description: 'Condiciones de uso de Control Freelancer Pro.',
}

export default function TerminosPage() {
  return (
    <PaginaLegal titulo="Términos y condiciones" otroHref="/privacidad" otroTexto="Política de privacidad">
      <p>
        Estas condiciones regulan el uso de <b>Control Freelancer Pro</b> (la «app»), operada por <b>Alexander Guerra</b>.
        Al crear una cuenta o usar la app aceptas estas condiciones. Si no estás de acuerdo, no la uses.
      </p>

      <h2>1. Qué es la app</h2>
      <p>
        Control Freelancer Pro es un panel de gestión para freelancers: te permite registrar clientes, proyectos, cursos y suscripciones,
        controlar tus cobros e ingresos, ver reportes y enviar recordatorios de cobro por correo.
      </p>

      <h2>2. No es asesoría contable, legal ni fiscal</h2>
      <p>
        La app es una herramienta de organización. Los totales, reportes y estados se calculan con los datos que tú escribes y pueden contener
        errores si están incompletos o mal ingresados. No sustituyen a un contador ni a un asesor legal o tributario.
      </p>

      <h2>3. Tu cuenta</h2>
      <ul>
        <li>Debes ser mayor de 18 años y darnos información veraz.</li>
        <li>Eres responsable de mantener segura tu contraseña y de lo que se haga con tu cuenta.</li>
        <li>Avísanos de inmediato si crees que alguien accedió a tu cuenta sin permiso.</li>
        <li>Las cuentas nuevas quedan pendientes hasta que el administrador las autorice, y podemos bloquear cuentas que incumplan estas condiciones.</li>
      </ul>

      <h2>4. Tus clientes y tus datos</h2>
      <p>
        La información que registras (clientes, proyectos, cobros) es tuya. Eres responsable de que sea correcta y de tener derecho a usar
        los datos de tus clientes, incluidos sus correos y teléfonos, para contactarlos y cobrarles. Nos autorizas únicamente a almacenarla y
        procesarla para prestarte el servicio.
      </p>

      <h2>5. Recordatorios de cobro por correo</h2>
      <ul>
        <li>Para enviar recordatorios, conectas tu propio Gmail con una contraseña de aplicación. Los correos salen desde tu dirección y son responsabilidad tuya.</li>
        <li>Solo se envían cuando tú ejecutas el cobro. Úsalos únicamente para cobros legítimos y con mensajes verídicos; no está permitido el envío de spam ni de contenido abusivo o engañoso.</li>
        <li>Puedes desconectar tu Gmail cuando quieras desde la app y revocar la contraseña de aplicación en tu cuenta de Google.</li>
      </ul>

      <h2>6. Uso permitido</h2>
      <p>
        Te comprometes a usar la app de forma lícita. No está permitido intentar acceder a datos de otros usuarios, vulnerar la seguridad del
        servicio, ni usarlo para actividades ilegales o fraudulentas.
      </p>

      <h2>7. Planes y pagos</h2>
      <p>
        El acceso puede requerir una suscripción mensual o anual. El plan, el monto, el método de pago y las fechas se acuerdan contigo antes
        de contratar. Los pagos se confirman manualmente por el administrador; si la suscripción vence sin renovarse, el acceso puede
        suspenderse. Podemos enviarte recordatorios de pago por correo.
      </p>

      <h2>8. Disponibilidad y respaldo</h2>
      <p>
        Hacemos lo posible por que la app funcione de forma continua, pero no garantizamos que esté libre de interrupciones o errores. Puedes
        descargar una copia de tus datos desde «Respaldo de Datos»; te recomendamos hacerlo con regularidad.
      </p>

      <h2>9. Límite de responsabilidad</h2>
      <p>
        En la medida permitida por la ley, no somos responsables por pérdidas de ingresos, cobros no realizados, daños derivados de correos
        enviados desde tu cuenta, de decisiones tomadas con base en los reportes de la app, ni de la imposibilidad temporal de usarla.
      </p>

      <h2>10. Cierre de la cuenta</h2>
      <p>
        Puedes dejar de usar la app y pedir la eliminación de tu cuenta y tus datos cuando quieras escribiendo al correo de contacto. Podemos
        suspender o cerrar cuentas que incumplan estas condiciones.
      </p>

      <h2>11. Privacidad</h2>
      <p>
        El tratamiento de tus datos se explica en nuestra <Link href="/privacidad">Política de privacidad</Link>.
      </p>

      <h2>12. Cambios en las condiciones</h2>
      <p>
        Podemos actualizar estas condiciones. Publicaremos la nueva versión en esta página con su fecha; si sigues usando la app después del
        cambio, se entiende que la aceptas.
      </p>

      <h2>13. Ley aplicable y contacto</h2>
      <p>
        Estas condiciones se rigen por las leyes de la República Bolivariana de Venezuela. Para cualquier consulta escribe a
        alexanderguerra1129@gmail.com.
      </p>
    </PaginaLegal>
  )
}
