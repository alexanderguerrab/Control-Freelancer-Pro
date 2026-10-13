-- ---------------------------------------------------------------------
-- 1. CONFIGURACIÓN DE LA APP (contacto de soporte editable desde el panel)
-- Una sola fila (id = true). Es pública para lectura porque el login
-- muestra los botones de soporte antes de iniciar sesión; solo el
-- administrador puede modificarla.
-- ---------------------------------------------------------------------
create table if not exists public.config_app (
  id boolean primary key default true check (id),
  soporte_email text not null default 'alexanderguerra1129@gmail.com'
    check (soporte_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  -- Solo dígitos con código de país, sin "+" (formato de wa.me). Ej: 584124231008
  soporte_whatsapp text not null default '584124231008'
    check (soporte_whatsapp ~ '^[0-9]{8,15}$'),
  updated_at timestamptz not null default now()
);

insert into public.config_app (id) values (true) on conflict (id) do nothing;

alter table public.config_app enable row level security;

revoke all on public.config_app from anon, authenticated;
grant select on public.config_app to anon, authenticated;
grant insert, update on public.config_app to authenticated;

drop policy if exists "Ver contacto de soporte" on public.config_app;
create policy "Ver contacto de soporte" on public.config_app
  for select to anon, authenticated using (true);

drop policy if exists "Admin crea configuracion" on public.config_app;
create policy "Admin crea configuracion" on public.config_app
  for insert to authenticated with check (public.es_admin());

drop policy if exists "Admin edita configuracion" on public.config_app;
create policy "Admin edita configuracion" on public.config_app
  for update to authenticated using (public.es_admin()) with check (public.es_admin());

-- ---------------------------------------------------------------------
-- 2. WHATSAPP: código de país por defecto de cada usuario
-- Sirve para completar teléfonos de clientes escritos en formato local
-- (p. ej. 0412-1234567 con código 58 -> 584121234567).
-- ---------------------------------------------------------------------
alter table public.perfil
  add column if not exists codigo_pais_whatsapp text
    check (codigo_pais_whatsapp is null or codigo_pais_whatsapp ~ '^[0-9]{1,4}$');
