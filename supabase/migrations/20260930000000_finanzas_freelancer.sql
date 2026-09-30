-- =====================================================================
-- MIGRACIÓN 3: FINANZAS PROPIAS DE CADA FREELANCER
--
-- Replica para los freelancers lo que el admin ya tiene con sus usuarios
-- (suscripciones_saas + pagos_saas), pero sobre SUS clientes:
--   * suscripciones_clientes: plan y próximo pago de cada cliente.
--   * pagos_clientes: historial de pagos que el freelancer registra.
-- RLS: cada freelancer solo ve y escribe lo suyo (owner_id) y solo si
-- está autorizado, igual que clientes/proyectos/cursos.
-- =====================================================================

create table public.suscripciones_clientes (
  cliente_id uuid primary key references public.clientes(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plan text not null default 'Mensual' check (plan in ('Mensual', 'Anual')),
  proximo_pago date,
  estado text not null default 'Al día',
  updated_at timestamptz not null default now()
);
create index suscripciones_clientes_owner_idx on public.suscripciones_clientes (owner_id);

create table public.pagos_clientes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  fecha_pago date not null,
  fecha_suscripcion date,
  periodo text,
  plan text not null check (plan in ('Mensual', 'Anual')),
  metodo text,
  monto numeric not null default 0,
  recibo_url text,
  created_at timestamptz not null default now()
);
create index pagos_clientes_owner_idx on public.pagos_clientes (owner_id);
create index pagos_clientes_cliente_idx on public.pagos_clientes (cliente_id);

do $$
declare
  t text;
begin
  foreach t in array array['suscripciones_clientes', 'pagos_clientes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "Datos propios de usuarios autorizados" on public.%I for all to authenticated
         using (owner_id = auth.uid() and public.esta_autorizado())
         with check (owner_id = auth.uid() and public.esta_autorizado())', t);
  end loop;
end $$;

-- Registra el pago de un cliente y adelanta su próximo cobro un ciclo
-- desde la fecha de suscripción (misma regla que registrar_pago_saas).
-- Corre con los permisos de quien llama: RLS aplica y además se
-- comprueba que el cliente sea del freelancer.
create or replace function public.registrar_pago_cliente(
  p_cliente uuid,
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
  if not exists (
    select 1 from public.clientes where id = p_cliente and owner_id = auth.uid()
  ) then
    raise exception 'El cliente no existe o no te pertenece.';
  end if;

  insert into public.pagos_clientes (cliente_id, fecha_pago, fecha_suscripcion, periodo, plan, metodo, monto, recibo_url)
  values (p_cliente, p_fecha_pago, p_fecha_suscripcion, p_periodo, p_plan, p_metodo, p_monto, p_recibo);

  siguiente := (p_fecha_suscripcion + case when p_plan = 'Anual' then interval '1 year' else interval '1 month' end)::date;

  insert into public.suscripciones_clientes (cliente_id, plan, proximo_pago, estado, updated_at)
  values (p_cliente, p_plan, siguiente, 'Al día', now())
  on conflict (cliente_id) do update
    set plan = excluded.plan, proximo_pago = excluded.proximo_pago, estado = 'Al día', updated_at = now();

  return siguiente;
end $$;
