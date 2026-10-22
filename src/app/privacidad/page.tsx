import type { Metadata } from 'next'
import PaginaLegal from '@/components/PaginaLegal'

export const metadata: Metadata = {
  title: 'Política de privacidad · Control Freelancer Pro',
  description: 'Cómo Control Freelancer Pro usa y protege tu información.',
}

export default function PrivacidadPage() {
  return (
    <PaginaLegal titulo="Política de privacidad" otroHref="/terminos" otroTexto="Términos y condiciones">
      <p>
        En Control Freelancer Pro (en adelante, «la app») te explicamos qué información usamos, para qué la usamos y cómo la protegemos.
        Al usar la app aceptas esta política.
      </p>

      <h2>1. Quién es el responsable</h2>
      <p>La app es operada por Alexander Guerra. Para cualquier consulta sobre tus datos escribe a alexanderguerra1129@gmail.com.</p>

      <h2>2. Qué información recopilamos</h2>
      <ul>
        <li>
          <b>Datos de tu cuenta:</b> tu correo electrónico, tu teléfono (que nos das al registrarte) y, si entras con Google, tu nombre y foto de
          perfil. Si te registras con contraseña, esta se guarda cifrada por el servicio de autenticación; nosotros no podemos verla.
        </li>
        <li>
          <b>Tu perfil profesional:</b> nombre, marca, especialidad, enlace a tu logo, moneda, meta mensual y los nombres de tus redes sociales y
          pasarelas de pago.
        </li>
        <li>
          <b>Datos que tú registras en la app:</b> tus clientes (nombre, correo, teléfono, documento de identidad, país, notas y enlaces a
          carpetas), tus proyectos, cursos y suscripciones, los pagos que recibes, tus plantillas de mensajes de cobro y tus métodos de pago.
        </li>
        <li>
          <b>Tu conexión de Gmail (opcional):</b> si la configuras para enviar recordatorios, guardamos tu dirección de Gmail y tu contraseña de
          aplicación. Esta contraseña se guarda <b>cifrada</b> y solo el servidor puede descifrarla para enviar tus correos.
        </li>
        <li>
          <b>Datos de tu suscripción:</b> plan, monto, método de pago, fechas y, si existe, el enlace a tu comprobante de pago.
        </li>
        <li>
          <b>Datos técnicos mínimos:</b> registros de funcionamiento y seguridad necesarios para mantener el servicio.
        </li>
      </ul>
      <p>La app <b>no te pide datos de tarjetas bancarias</b> ni la contraseña normal de tu cuenta de Google.</p>

      <h2>3. Datos de tus clientes</h2>
      <p>
        Los datos de tus clientes los registras tú, y tú decides qué guardar. Nosotros solo los almacenamos para que puedas usar la app; no los
        usamos para ningún otro fin ni los contactamos. Eres responsable de contar con el derecho de usarlos para gestionarlos y cobrarles.
      </p>

      <h2>4. Uso de los datos de Google</h2>
      <p>
        Si eliges «Iniciar sesión con Google», solo recibimos tu correo, nombre y foto de perfil para crear y reconocer tu cuenta. No accedemos a
        tus contactos, archivos, correos, calendario ni a ningún otro dato de tu cuenta de Google. El uso de esa información se ajusta a la
        Política de datos de usuario de los servicios de las API de Google, incluidos sus requisitos de uso limitado.
      </p>

      <h2>5. Para qué usamos tu información</h2>
      <ul>
        <li>Crear tu cuenta y permitirte entrar.</li>
        <li>Guardar y mostrar tus clientes, proyectos y cobros, y calcular tus reportes y dashboards.</li>
        <li>
          Enviar los recordatorios de cobro que tú ordenas: salen desde tu Gmail hacia tus clientes, solo cuando ejecutas el cobro, y puedes
          desconectar tu Gmail cuando quieras.
        </li>
        <li>
          Gestionar tu suscripción y enviarte recordatorios de pago y correos del sistema, como la confirmación de tu correo y la recuperación de
          contraseña.
        </li>
        <li>Mantener la seguridad del servicio y resolver fallos.</li>
      </ul>
      <p>No vendemos tus datos ni los usamos para publicidad.</p>

      <h2>6. Dónde se guardan y con quién se comparten</h2>
      <p>Solo con los proveedores que hacen posible el servicio, que procesan los datos por cuenta nuestra:</p>
      <ul>
        <li><b>Supabase:</b> inicio de sesión y base de datos donde se guarda tu información.</li>
        <li><b>Vercel:</b> alojamiento de la aplicación.</li>
        <li><b>Google:</b> inicio de sesión con Google (si lo eliges) y envío de los correos del sistema; también el de tus recordatorios, desde tu Gmail.</li>
      </ul>
      <p>
        Cada usuario solo puede ver sus propios clientes, proyectos y finanzas: la base de datos aplica reglas de seguridad por usuario, de modo
        que <b>ni siquiera el administrador de la app puede ver esa información</b>. El administrador sí ve los datos de gestión de cuentas:
        correo, teléfono, estado, suscripción y pagos. Como titular del proyecto, el operador tiene acceso técnico de administración a la base
        de datos; lo usa únicamente para mantenimiento, seguridad, el soporte que tú pidas, o si una autoridad competente lo exige conforme a la
        ley. No compartimos tu información con otros terceros.
      </p>

      <h2>7. Cuánto tiempo los conservamos</h2>
      <p>
        Conservamos tu información mientras tu cuenta esté activa. Puedes pedir en cualquier momento que eliminemos tu cuenta y tus datos
        escribiendo al correo de contacto; lo haremos en un plazo razonable, salvo lo que debamos conservar por obligación legal (por ejemplo,
        registros de pagos).
      </p>

      <h2>8. Seguridad</h2>
      <p>
        Usamos conexiones cifradas (HTTPS), reglas de acceso por usuario en la base de datos y cifrado de la contraseña de aplicación de tu Gmail.
        Ningún sistema es infalible, pero trabajamos para proteger tu información. Usa una contraseña única y no la compartas.
      </p>

      <h2>9. Tus derechos</h2>
      <p>
        Puedes acceder a tus datos desde la app, descargar una copia desde «Respaldo de Datos», pedir su corrección o eliminación, desconectar tu
        Gmail, o retirar los permisos que diste a Google. Para cualquiera de estas solicitudes escríbenos al correo de contacto.
      </p>

      <h2>10. Menores de edad</h2>
      <p>La app está dirigida a personas mayores de 18 años y no recopilamos datos de menores de forma intencional.</p>

      <h2>11. Cambios en esta política</h2>
      <p>
        Si actualizamos esta política, publicaremos la nueva versión en esta página con su fecha. Si el cambio es importante, te lo avisaremos en
        la app.
      </p>

      <h2>12. Contacto</h2>
      <p>alexanderguerra1129@gmail.com</p>
    </PaginaLegal>
  )
}
