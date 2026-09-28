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

## Configuración en el panel de Supabase

- **Authentication → URL Configuration**: añade tu dominio (y `http://localhost:3000`)
  a *Site URL* / *Redirect URLs*, incluyendo `/auth/callback`.
- **Authentication → Providers → Google**: actívalo si quieres el botón
  "Iniciar sesión con Google".

## Despliegue en Vercel

Importa el repositorio en Vercel y define las mismas variables de `.env.local`
en *Settings → Environment Variables*.
