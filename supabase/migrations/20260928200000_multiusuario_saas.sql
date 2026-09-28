-- =====================================================================
-- MIGRACIÓN 2: MODELO MULTIUSUARIO (SaaS) + MÓDULOS FALTANTES
--
-- El sistema legacy daba a cada usuario su propia hoja de cálculo y un
-- administrador autorizaba el acceso (DB_USUARIOS). Aquí se replica eso:
--   * Cada fila de datos pertenece a un usuario (owner_id) y RLS aísla
--     los datos de cada uno.
--   * Solo los usuarios con estado 'Autorizado' pueden leer/escribir.
--   * El administrador gestiona usuarios, pagos y control SaaS.
--
-- Las tablas de init_schema se recrean con la estructura final. Como
-- salvaguarda, la migración aborta si alguna ya contiene datos.
-- =====================================================================

do $$
begin
  if exists (select 1 from public.clientes)
     or exists (select 1 from public.proyectos)
     or exists (select 1 from public.cursos_suscripciones)
     or exists (select 1 from public.historial_pagos)
     or exists (select 1 from public.perfil_admin) then
    raise exception 'Las tablas de init_schema ya contienen datos. Revisa esta migración antes de aplicarla para no perder información.';
  end if;
end $$;

drop table if exists public.historial_pagos, public.cursos_suscripciones,
  public.proyectos, public.clientes, public.perfil_admin cascade;

-- ---------------------------------------------------------------------
-- 1. USUARIOS (equivalente a DB_USUARIOS)
-- ---------------------------------------------------------------------
create table public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  telefono text default '',
  rol text not null default 'Cliente' check (rol in ('Cliente', 'Administrador')),
  estado text not null default 'Pendiente' check (estado in ('Pendiente', 'Autorizado', 'Bloqueado')),
  fecha_registro date not null default current_date,
  created_at timestamptz not null default now()
);

create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.usuarios
    where id = auth.uid() and rol = 'Administrador' and estado = 'Autorizado'
  );
$$;

create or replace function public.esta_autorizado() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.usuarios where id = auth.uid() and estado = 'Autorizado'
  );
$$;

-- Alta automática al registrarse. El primer usuario del sistema queda
-- como Administrador autorizado; el resto entra como Cliente pendiente.
create or replace function public.registrar_usuario_nuevo() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  hay_admin boolean;
begin
  select exists (select 1 from public.usuarios where rol = 'Administrador') into hay_admin;
  insert into public.usuarios (id, email, telefono, rol, estado)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'telefono', ''),
    case when hay_admin then 'Cliente' else 'Administrador' end,
    case when hay_admin then 'Pendiente' else 'Autorizado' end
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.registrar_usuario_nuevo();

-- Si el admin borra la fila de un usuario, al volver a entrar se recrea
-- como Pendiente (mismo comportamiento que verificarAccesoUsuario).
create or replace function public.asegurar_usuario() returns public.usuarios
language plpgsql security definer set search_path = '' as $$
declare
  fila public.usuarios;
begin
  if auth.uid() is null then
    return null;
  end if;
  insert into public.usuarios (id, email, telefono)
  select u.id, u.email, coalesce(u.raw_user_meta_data ->> 'telefono', '')
  from auth.users u where u.id = auth.uid()
  on conflict (id) do nothing;
  select * into fila from public.usuarios where id = auth.uid();
  return fila;
end $$;

-- Usuarios que ya existían en auth antes de esta migración.
insert into public.usuarios (id, email, telefono, fecha_registro)
select id, email, coalesce(raw_user_meta_data ->> 'telefono', ''), created_at::date
from auth.users
on conflict (id) do nothing;

update public.usuarios
set rol = 'Administrador', estado = 'Autorizado'
where id = (select id from auth.users order by created_at limit 1)
  and not exists (select 1 from public.usuarios where rol = 'Administrador');

alter table public.usuarios enable row level security;
create policy "Ver propio usuario o admin" on public.usuarios
  for select to authenticated using (id = auth.uid() or public.es_admin());
create policy "Admin actualiza usuarios" on public.usuarios
  for update to authenticated using (public.es_admin()) with check (public.es_admin());
create policy "Admin elimina usuarios" on public.usuarios
  for delete to authenticated using (public.es_admin());

-- ---------------------------------------------------------------------
-- 2. DATOS PROPIOS DE CADA USUARIO
-- ---------------------------------------------------------------------
create table public.perfil (
  owner_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  nombre text,
  marca text,
  especialidad text,
  logo_url text,
  moneda text default 'USD',
  meta_mensual numeric not null default 0,
  red_social_1_nombre text, red_social_1_url text,
  red_social_2_nombre text, red_social_2_url text,
  red_social_3_nombre text, red_social_3_url text,
  pasarela_1_nombre text, pasarela_1_url text,
  pasarela_2_nombre text, pasarela_2_url text,
  pasarela_3_nombre text, pasarela_3_url text,
  updated_at timestamptz not null default now()
);

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre text not null,
  email text,
  telefono text,
  dni text,
  pais text,
  fecha_registro date default current_date,
  drive_link text,
  notas text,
  created_at timestamptz not null default now()
);
create index clientes_owner_idx on public.clientes (owner_id);

-- Los avisos *_enviado_at sustituyen a las marcas "ENVIADO" de las
-- columnas Vence Hoy / 7 Días / 15 Días del sheet.
create table public.proyectos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  nombre text not null default '',
  monto numeric not null default 0,
  cobrado boolean not null default false,
  fecha_recepcion date,
  fecha_entrega date,
  fecha_pago date,
  estado_proceso text check (estado_proceso in ('En Proceso', 'Terminado', 'Pausado')),
  aviso_hoy_enviado_at timestamptz,
  aviso_7d_enviado_at timestamptz,
  aviso_15d_enviado_at timestamptz,
  comprobante_url text,
  created_at timestamptz not null default now()
);
create index proyectos_owner_idx on public.proyectos (owner_id);

create table public.cursos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  nombre text not null default '',
  monto numeric not null default 0,
  cobrado boolean not null default false,
  fecha_suscripcion date,
  fecha_pago date,
  aviso_hoy_enviado_at timestamptz,
  aviso_7d_enviado_at timestamptz,
  aviso_15d_enviado_at timestamptz,
  comprobante_url text,
  created_at timestamptz not null default now()
);
create index cursos_owner_idx on public.cursos (owner_id);

create table public.scripts_cobro (
  owner_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  plantilla_hoy text not null default 'Hola [Nombre], te recordamos que el pago de [Proyecto] por $[Monto] vence hoy. ¡Gracias!',
  plantilla_7d text not null default 'Hola [Nombre], el pago de [Proyecto] por $[Monto] tiene 7 días de vencido. Por favor regulariza tu pago.',
  plantilla_15d text not null default 'Hola [Nombre], el pago de [Proyecto] por $[Monto] tiene 15 días de vencido. Contáctanos para evitar la suspensión del servicio.',
  updated_at timestamptz not null default now()
);

do $$
declare
  t text;
begin
  foreach t in array array['perfil', 'clientes', 'proyectos', 'cursos', 'scripts_cobro'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "Datos propios de usuarios autorizados" on public.%I for all to authenticated
         using (owner_id = auth.uid() and public.esta_autorizado())
         with check (owner_id = auth.uid() and public.esta_autorizado())', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 3. SAAS (ESTADO_SUSCRIPCIONES, HISTORIAL_PAGOS, CONTROL_SAAS)
-- Se enlazan con auth.users para que borrar la fila de "usuarios" no
-- borre el historial de pagos, igual que en el sheet.
-- ---------------------------------------------------------------------
create table public.suscripciones_saas (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'Mensual' check (plan in ('Mensual', 'Anual')),
  proximo_pago date,
  estado text not null default 'Al día',
  updated_at timestamptz not null default now()
);

create table public.pagos_saas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  fecha_pago date not null,
  fecha_suscripcion date,
  periodo text,
  plan text not null check (plan in ('Mensual', 'Anual')),
  metodo text,
  monto numeric not null default 0,
  recibo_url text,
  created_at timestamptz not null default now()
);
create index pagos_saas_usuario_idx on public.pagos_saas (usuario_id);

create table public.control_saas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references auth.users(id) on delete set null,
  plan text not null default '',
  monto numeric not null default 0,
  cobrado boolean not null default false,
  fecha_suscripcion date,
  fecha_pago date,
  aviso_hoy_enviado_at timestamptz,
  aviso_7d_enviado_at timestamptz,
  aviso_15d_enviado_at timestamptz,
  comprobante_url text,
  created_at timestamptz not null default now()
);

alter table public.suscripciones_saas enable row level security;
alter table public.pagos_saas enable row level security;
alter table public.control_saas enable row level security;

create policy "Ver propia suscripción o admin" on public.suscripciones_saas
  for select to authenticated using (usuario_id = auth.uid() or public.es_admin());
create policy "Admin gestiona suscripciones" on public.suscripciones_saas
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

create policy "Ver propios pagos o admin" on public.pagos_saas
  for select to authenticated using (usuario_id = auth.uid() or public.es_admin());
create policy "Admin gestiona pagos" on public.pagos_saas
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

create policy "Solo admin" on public.control_saas
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- Registra el pago y adelanta el próximo cobro un ciclo desde la fecha
-- de suscripción (misma regla que registrarPagoSaaS). Corre con los
-- permisos del que llama, así que RLS exige que sea admin.
create or replace function public.registrar_pago_saas(
  p_usuario uuid,
  p_plan text,
  p_fecha_suscripcion date,
  p_fecha_pago date,
  p_periodo text,
  p_metodo text,
  p_monto numeric,
  p_recibo text
) returns date
language plpgsql set search_path = '' as $$
declare
  siguiente date;
begin
  insert into public.pagos_saas (usuario_id, fecha_pago, fecha_suscripcion, periodo, plan, metodo, monto, recibo_url)
  values (p_usuario, p_fecha_pago, p_fecha_suscripcion, p_periodo, p_plan, p_metodo, p_monto, p_recibo);

  siguiente := (p_fecha_suscripcion + case when p_plan = 'Anual' then interval '1 year' else interval '1 month' end)::date;

  insert into public.suscripciones_saas (usuario_id, plan, proximo_pago, estado, updated_at)
  values (p_usuario, p_plan, siguiente, 'Al día', now())
  on conflict (usuario_id) do update
    set plan = excluded.plan, proximo_pago = excluded.proximo_pago, estado = 'Al día', updated_at = now();

  return siguiente;
end $$;

-- ---------------------------------------------------------------------
-- 4. REINICIO DE AVISOS DE COBRO
-- Al marcar como cobrado o cambiar la fecha de pago se limpian las marcas
-- de recordatorio enviado (en el sheet se borraban las columnas K:M).
-- ---------------------------------------------------------------------
create or replace function public.reiniciar_avisos() returns trigger
language plpgsql as $$
begin
  if new.cobrado or new.fecha_pago is distinct from old.fecha_pago then
    new.aviso_hoy_enviado_at := null;
    new.aviso_7d_enviado_at := null;
    new.aviso_15d_enviado_at := null;
  end if;
  return new;
end $$;

create trigger proyectos_reiniciar_avisos before update of cobrado, fecha_pago on public.proyectos
  for each row execute function public.reiniciar_avisos();
create trigger cursos_reiniciar_avisos before update of cobrado, fecha_pago on public.cursos
  for each row execute function public.reiniciar_avisos();
create trigger control_saas_reiniciar_avisos before update of cobrado, fecha_pago on public.control_saas
  for each row execute function public.reiniciar_avisos();
