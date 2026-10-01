-- =====================================================================
-- MIGRACIÓN 4: GMAIL PROPIO PARA ENVIAR LOS COBROS
--
-- Cada usuario puede conectar su Gmail (contraseña de aplicación) para que
-- sus recordatorios salgan desde su dirección. La contraseña se guarda
-- cifrada con AES-256-GCM por el servidor (clave CORREO_CLAVE_CIFRADO, que
-- nunca llega a la base de datos ni al navegador). Sin fila aquí no se
-- envían cobros (solo el administrador usa el SMTP del sistema).
-- =====================================================================

create table public.correo_envio (
  owner_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  email text not null,
  password_cifrada text not null,
  updated_at timestamptz not null default now()
);

alter table public.correo_envio enable row level security;
create policy "Datos propios de usuarios autorizados" on public.correo_envio for all to authenticated
  using (owner_id = auth.uid() and public.esta_autorizado())
  with check (owner_id = auth.uid() and public.esta_autorizado());
