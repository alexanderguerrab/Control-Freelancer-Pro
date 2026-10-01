-- =====================================================================
-- MIGRACIÓN 6: MÉTODOS DE PAGO CONFIGURABLES + SINCRONIZACIÓN DEL PANEL ADMIN
--
--   1. perfil: de 3 a 6 pasarelas / métodos de pago configurables.
--   2. cursos y control_saas: nueva columna metodo_pago.
--   3. El método elegido en Cursos / Control SaaS viaja al historial de
--      pagos (pagos_clientes / pagos_saas) al cobrar.
--   4. Panel admin: "Control Suscripciones Admin" (control_saas) queda
--      entrelazado con "Panel de Finanzas" (suscripciones_saas y
--      pagos_saas) con la misma lógica que ya tienen Cursos y Finanzas
--      y Cobros del panel de usuarios (migración 5).
--
-- Requiere la migración 5 (pagos_clientes.curso_id y las funciones de
-- sincronización de cursos).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PERFIL: 6 MÉTODOS DE PAGO
-- ---------------------------------------------------------------------
alter table public.perfil
  add column if not exists pasarela_4_nombre text,
  add column if not exists pasarela_4_url text,
  add column if not exists pasarela_5_nombre text,
  add column if not exists pasarela_5_url text,
  add column if not exists pasarela_6_nombre text,
  add column if not exists pasarela_6_url text;

-- ---------------------------------------------------------------------
-- 2. COLUMNA MÉTODO DE PAGO
-- ---------------------------------------------------------------------
alter table public.cursos add column if not exists metodo_pago text;
alter table public.control_saas add column if not exists metodo_pago text;

-- Por si la migración 5 no la creó.
create or replace function public.periodo_texto(d date) returns text
language sql immutable set search_path = '' as $$
  select (array['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto',
                'Septiembre','Octubre','Noviembre','Diciembre'])[extract(month from d)::int]
         || ' ' || extract(year from d)::int::text;
$$;

-- ---------------------------------------------------------------------
-- 3. CURSOS -> FINANZAS Y COBROS: el trigger ahora lleva el método de pago
-- ---------------------------------------------------------------------
create or replace function public.sincronizar_curso_con_finanzas() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_plan text;
  v_fecha date;
begin
  if tg_op = 'DELETE' then
    perform public.recalcular_suscripcion_cliente(old.cliente_id);
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if old.cliente_id is distinct from new.cliente_id then
      if new.cliente_id is not null then
        update public.pagos_clientes set cliente_id = new.cliente_id where curso_id = new.id;
      end if;
      perform public.recalcular_suscripcion_cliente(old.cliente_id);
    end if;
  end if;

  if new.cobrado and new.cliente_id is not null then
    if not exists (select 1 from public.pagos_clientes where curso_id = new.id) then
      select plan into v_plan from public.suscripciones_clientes where cliente_id = new.cliente_id;
      v_fecha := coalesce(new.fecha_pago, current_date);
      insert into public.pagos_clientes
        (owner_id, curso_id, cliente_id, fecha_pago, fecha_suscripcion, periodo, plan, metodo, monto, recibo_url)
      values
        (new.owner_id, new.id, new.cliente_id, v_fecha, new.fecha_suscripcion,
         public.periodo_texto(v_fecha), coalesce(v_plan, 'Mensual'), nullif(new.metodo_pago, ''),
         new.monto, new.comprobante_url);
    elsif tg_op = 'UPDATE' then
      -- Ya cobrado y se corrigió monto, comprobante o método: el historial lo sigue.
      if old.cobrado
         and (old.monto is distinct from new.monto
              or old.comprobante_url is distinct from new.comprobante_url
              or old.metodo_pago is distinct from new.metodo_pago) then
        update public.pagos_clientes
           set monto = new.monto,
               recibo_url = coalesce(nullif(new.comprobante_url, ''), recibo_url),
               metodo = coalesce(nullif(new.metodo_pago, ''), metodo)
         where curso_id = new.id;
      end if;
    end if;
  elsif tg_op = 'UPDATE' then
    if old.cobrado and not new.cobrado then
      delete from public.pagos_clientes where curso_id = new.id;
    end if;
  end if;

  perform public.recalcular_suscripcion_cliente(new.cliente_id);
  return new;
end $$;

drop trigger if exists cursos_sincronizar_finanzas on public.cursos;
create trigger cursos_sincronizar_finanzas
  after insert or delete
     or update of cobrado, fecha_pago, fecha_suscripcion, cliente_id, monto, comprobante_url, metodo_pago
  on public.cursos
  for each row execute function public.sincronizar_curso_con_finanzas();

-- Registrar un pago desde Finanzas y Cobros también deja el método en el servicio.
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
  v_curso uuid;
begin
  if not exists (
    select 1 from public.clientes where id = p_cliente and owner_id = auth.uid()
  ) then
    raise exception 'El cliente no existe o no te pertenece.';
  end if;

  select id into v_curso
    from public.cursos
   where cliente_id = p_cliente and not cobrado
   order by fecha_pago nulls last, created_at
   limit 1;

  insert into public.pagos_clientes
    (curso_id, cliente_id, fecha_pago, fecha_suscripcion, periodo, plan, metodo, monto, recibo_url)
  values
    (v_curso, p_cliente, p_fecha_pago, p_fecha_suscripcion, p_periodo, p_plan, p_metodo, p_monto, p_recibo);

  siguiente := (p_fecha_suscripcion + case when p_plan = 'Anual' then interval '1 year' else interval '1 month' end)::date;

  insert into public.suscripciones_clientes (cliente_id, plan, proximo_pago, estado, updated_at)
  values (p_cliente, p_plan, siguiente, 'Al día', now())
  on conflict (cliente_id) do update
    set plan = excluded.plan, proximo_pago = excluded.proximo_pago, estado = 'Al día', updated_at = now();

  if v_curso is not null then
    update public.cursos
       set cobrado = true,
           comprobante_url = coalesce(nullif(p_recibo, ''), comprobante_url),
           metodo_pago = coalesce(nullif(p_metodo, ''), metodo_pago)
     where id = v_curso;
    select proximo_pago into siguiente from public.suscripciones_clientes where cliente_id = p_cliente;
  end if;

  return siguiente;
end $$;

-- ---------------------------------------------------------------------
-- 4. PANEL ADMIN: control_saas <-> suscripciones_saas / pagos_saas
--    (control_saas.plan es el nombre del servicio; el ciclo Mensual/Anual
--    vive en suscripciones_saas.plan y por defecto es Mensual).
-- ---------------------------------------------------------------------
alter table public.pagos_saas
  add column if not exists control_id uuid references public.control_saas(id) on delete set null;
create unique index if not exists pagos_saas_control_unico on public.pagos_saas (control_id);

-- Próximo pago = fecha de pago pendiente más cercana; si todo está cobrado,
-- un ciclo después del último pago.
create or replace function public.recalcular_suscripcion_saas(p_usuario uuid) returns void
language plpgsql set search_path = '' as $$
declare
  v_plan text;
  v_pendiente date;
  v_ultimo date;
  v_proximo date;
begin
  if p_usuario is null then
    return;
  end if;

  if not exists (select 1 from public.control_saas where usuario_id = p_usuario)
     and not exists (select 1 from public.pagos_saas where usuario_id = p_usuario) then
    delete from public.suscripciones_saas where usuario_id = p_usuario;
    return;
  end if;

  select min(fecha_pago) into v_pendiente
    from public.control_saas where usuario_id = p_usuario and not cobrado and fecha_pago is not null;
  select max(fecha_pago) into v_ultimo
    from public.control_saas where usuario_id = p_usuario and cobrado and fecha_pago is not null;
  select plan into v_plan from public.suscripciones_saas where usuario_id = p_usuario;
  v_plan := coalesce(v_plan, 'Mensual');

  v_proximo := coalesce(
    v_pendiente,
    (v_ultimo + case when v_plan = 'Anual' then interval '1 year' else interval '1 month' end)::date
  );

  insert into public.suscripciones_saas (usuario_id, plan, proximo_pago, estado, updated_at)
  values (p_usuario, v_plan, v_proximo, case when v_proximo is null then 'Pendiente' else 'Al día' end, now())
  on conflict (usuario_id) do update
    set proximo_pago = excluded.proximo_pago,
        estado = excluded.estado,
        updated_at = now();
end $$;

create or replace function public.sincronizar_control_con_finanzas() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_plan text;
  v_fecha date;
begin
  if tg_op = 'DELETE' then
    perform public.recalcular_suscripcion_saas(old.usuario_id);
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if old.usuario_id is distinct from new.usuario_id then
      if new.usuario_id is not null then
        update public.pagos_saas set usuario_id = new.usuario_id where control_id = new.id;
      end if;
      perform public.recalcular_suscripcion_saas(old.usuario_id);
    end if;
  end if;

  if new.cobrado and new.usuario_id is not null then
    if not exists (select 1 from public.pagos_saas where control_id = new.id) then
      select plan into v_plan from public.suscripciones_saas where usuario_id = new.usuario_id;
      v_fecha := coalesce(new.fecha_pago, current_date);
      insert into public.pagos_saas
        (control_id, usuario_id, fecha_pago, fecha_suscripcion, periodo, plan, metodo, monto, recibo_url)
      values
        (new.id, new.usuario_id, v_fecha, new.fecha_suscripcion,
         public.periodo_texto(v_fecha), coalesce(v_plan, 'Mensual'), nullif(new.metodo_pago, ''),
         new.monto, new.comprobante_url);
    elsif tg_op = 'UPDATE' then
      if old.cobrado
         and (old.monto is distinct from new.monto
              or old.comprobante_url is distinct from new.comprobante_url
              or old.metodo_pago is distinct from new.metodo_pago) then
        update public.pagos_saas
           set monto = new.monto,
               recibo_url = coalesce(nullif(new.comprobante_url, ''), recibo_url),
               metodo = coalesce(nullif(new.metodo_pago, ''), metodo)
         where control_id = new.id;
      end if;
    end if;
  elsif tg_op = 'UPDATE' then
    if old.cobrado and not new.cobrado then
      delete from public.pagos_saas where control_id = new.id;
    end if;
  end if;

  perform public.recalcular_suscripcion_saas(new.usuario_id);
  return new;
end $$;

drop trigger if exists control_saas_sincronizar_finanzas on public.control_saas;
create trigger control_saas_sincronizar_finanzas
  after insert or delete
     or update of cobrado, fecha_pago, fecha_suscripcion, usuario_id, monto, comprobante_url, metodo_pago
  on public.control_saas
  for each row execute function public.sincronizar_control_con_finanzas();

-- Registrar un pago en el Panel de Finanzas cierra el cobro pendiente del
-- usuario en Control Suscripciones Admin (mismo cuerpo que antes más eso).
-- Corre con los permisos de quien llama: RLS exige que sea admin.
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
  v_control uuid;
begin
  select id into v_control
    from public.control_saas
   where usuario_id = p_usuario and not cobrado
   order by fecha_pago nulls last, created_at
   limit 1;

  insert into public.pagos_saas
    (control_id, usuario_id, fecha_pago, fecha_suscripcion, periodo, plan, metodo, monto, recibo_url)
  values
    (v_control, p_usuario, p_fecha_pago, p_fecha_suscripcion, p_periodo, p_plan, p_metodo, p_monto, p_recibo);

  siguiente := (p_fecha_suscripcion + case when p_plan = 'Anual' then interval '1 year' else interval '1 month' end)::date;

  insert into public.suscripciones_saas (usuario_id, plan, proximo_pago, estado, updated_at)
  values (p_usuario, p_plan, siguiente, 'Al día', now())
  on conflict (usuario_id) do update
    set plan = excluded.plan, proximo_pago = excluded.proximo_pago, estado = 'Al día', updated_at = now();

  if v_control is not null then
    update public.control_saas
       set cobrado = true,
           comprobante_url = coalesce(nullif(p_recibo, ''), comprobante_url),
           metodo_pago = coalesce(nullif(p_metodo, ''), metodo_pago)
     where id = v_control;
    select proximo_pago into siguiente from public.suscripciones_saas where usuario_id = p_usuario;
  end if;

  return siguiente;
end $$;

-- ---------------------------------------------------------------------
-- 5. DATOS QUE YA EXISTEN EN EL PANEL ADMIN
--    Cada cuota ya cobrada de Control SaaS necesita su pago en el
--    historial. Si ya hay un pago registrado a mano para ese mismo ciclo
--    (mismo usuario y misma fecha de suscripción), se vincula en lugar de
--    duplicarlo.
-- ---------------------------------------------------------------------
do $$
declare
  c record;
  v_pago uuid;
  v_fecha date;
begin
  for c in
    select cs.* from public.control_saas cs
     where cs.cobrado and cs.usuario_id is not null
       and not exists (select 1 from public.pagos_saas p where p.control_id = cs.id)
     order by cs.fecha_pago nulls last, cs.created_at
  loop
    v_pago := null;
    if c.fecha_suscripcion is not null then
      select p.id into v_pago
        from public.pagos_saas p
       where p.usuario_id = c.usuario_id
         and p.control_id is null
         and p.fecha_suscripcion = c.fecha_suscripcion
       order by p.created_at
       limit 1;
    end if;

    if v_pago is not null then
      update public.pagos_saas set control_id = c.id where id = v_pago;
    else
      v_fecha := coalesce(c.fecha_pago, current_date);
      insert into public.pagos_saas
        (control_id, usuario_id, fecha_pago, fecha_suscripcion, periodo, plan, metodo, monto, recibo_url)
      values
        (c.id, c.usuario_id, v_fecha, c.fecha_suscripcion, public.periodo_texto(v_fecha),
         coalesce((select s.plan from public.suscripciones_saas s where s.usuario_id = c.usuario_id), 'Mensual'),
         nullif(c.metodo_pago, ''), c.monto, c.comprobante_url);
    end if;
  end loop;
end $$;

do $$
declare
  r record;
begin
  for r in select distinct usuario_id from public.control_saas where usuario_id is not null loop
    perform public.recalcular_suscripcion_saas(r.usuario_id);
  end loop;
end $$;
