# Control Freelancer Pro

Panel para freelancers: clientes, proyectos, cursos/suscripciones, cobros
automáticos por correo, reportes y un panel de administrador SaaS.

Stack: **Next.js 16** (App Router) + **Supabase** (PostgreSQL, Auth, RLS) + Tailwind CSS 4.

La versión anterior (Google Apps Script + Google Sheets + Firebase Auth) está
en [`legacy/`](legacy/) como referencia.

## Puesta en marcha

1. Instala dependencias: `npm install`
2. Crea `.env.local` a partir de [`.env.example`](.env.example).
3. Aplica las migraciones de la base de datos:
   ```bash
   npx supabase db push
   ```
   (o pega los archivos de `supabase/migrations/` en el Editor SQL de Supabase, en orden).
4. Arranca en local: `npm run dev` → http://localhost:3000

## Usuarios y roles

- Al registrarse, cada usuario queda **Pendiente** hasta que el administrador lo
  autorice en *Gestión Usuarios Admin*.
- El **primer usuario** del sistema se convierte en Administrador automáticamente.
  Para asignar otro administrador desde el Editor SQL:
  ```sql
  update usuarios set rol = 'Administrador', estado = 'Autorizado' where email = 'correo@ejemplo.com';
  ```
- Cada usuario solo ve sus propios datos; lo impone Row Level Security en la base de datos.
- Solo el **primer usuario de una base vacía** es administrador. Si te quedas sin admin,
  recupéralo con el SQL de arriba. La base de datos impide quitar, bloquear o eliminar al
  único administrador activo.

## Envío de recordatorios de cobro

Los botones "🚀 Ejecutar Cobro" envían correos por SMTP. Con Gmail usa una
[contraseña de aplicación](https://myaccount.google.com/apppasswords):

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=tucorreo@gmail.com
SMTP_PASS=la-contraseña-de-aplicación
```

Como en el sistema anterior, cada ejecución manda como máximo un recordatorio
por registro vencido, en orden: vence hoy → 7 días → 15 días.

Cada recordatorio se reserva en la base de datos antes de enviarse, así que un doble clic
o dos pestañas no duplican correos; si el envío falla, la reserva se revierte. Cada
ejecución envía como máximo 40 correos (si quedan más, vuelve a ejecutarla). Los proyectos
«Pausado» y los usuarios SaaS no autorizados se omiten. Si un registro lleva tiempo vencido,
se envía la plantilla de la etapa más avanzada (a 16 días, la de 15 días).

**Rotar `CORREO_CLAVE_CIFRADO`:** pon la clave vieja en `CORREO_CLAVE_CIFRADO_ANTERIOR` y
una nueva en `CORREO_CLAVE_CIFRADO`; los Gmail ya conectados siguen funcionando.

## Recordatorios por WhatsApp

Cada fila de **Proyectos y Finanzas**, **Cursos y Suscripciones** y **Control Suscripciones
Admin** tiene un botón **💬 WhatsApp**. Abre WhatsApp (app o web) con el chat del cliente y el
mensaje ya escrito con la plantilla que corresponde al atraso (hoy / 7 días / 15 días), las
mismas de *Scripts de Cobro*. La persona solo pulsa «Enviar», así que no requiere cuenta ni
configuración y no afecta a los avisos por correo.

- El teléfono sale de *Registro de Clientes* (o de *Gestión Usuarios Admin* en el cobro SaaS).
- Si los teléfonos están en formato local (`0412-1234567`), define tu **código de país**
  (p. ej. `58`) en *Mi Perfil → Configuración negocio*.

## Contacto de soporte editable

El correo y el WhatsApp de soporte (menú lateral, login y pantalla de acceso restringido) se
cambian en **Configuración Admin** (solo administradores); se guardan en la tabla `config_app`.
No hace falta tocar el código ni volver a desplegar.

## Correo de envío de cada usuario

Cada usuario envía desde **su propio Gmail**; ninguno usa el correo del sistema. Solo el
administrador cae al SMTP del `.env` si no conectó uno. Al conectar, el formulario ya viene con
el Gmail con el que el usuario se registró y solo falta pegar la contraseña de aplicación.

## Configuración en el panel de Supabase

- **Authentication → Sign In / Providers → Email**: exige confirmación de correo, longitud
  mínima 8 y requisitos «mayúsculas, minúsculas, números y símbolos» (igual que `config.toml`,
  que solo afecta al entorno local). La validación del formulario es solo cosmética.

- **Authentication → URL Configuration**: añade tu dominio (y `http://localhost:3000`)
  a *Site URL* / *Redirect URLs*, incluyendo `/auth/callback`.
- **Authentication → Providers → Google**: actívalo si quieres el botón
  "Iniciar sesión con Google".

## Despliegue en Vercel

Importa el repositorio en Vercel y define las mismas variables de `.env.local`
en *Settings → Environment Variables*.
