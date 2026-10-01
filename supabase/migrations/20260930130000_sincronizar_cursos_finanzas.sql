-- =====================================================================
-- MIGRACIÓN 5: SINCRONIZAR "CURSOS Y SUSCRIPCIONES" CON "FINANZAS Y COBROS"
--
-- Todo se hace en la base de datos con triggers, así que no depende de
-- qué página use el usuario ni hay que tocar el código de la app:
--
--   * Al crear, editar o borrar un servicio en `cursos`, se recalcula el
--     plan / próximo pago / estado del cliente en `suscripciones_clientes`.
--   * Al marcar un servicio como cobrado se crea su pago en
--     `pagos_clientes` (historial). Al desmarcarlo, ese pago se elimina.
--   * Al registrar un pago desde Finanzas y Cobros, el servicio pendiente
--     más próximo del cliente se marca como cobrado, para que el sistema
--     de cobro no le siga enviando recordatorios.
--   * Los clientes nuevos ya aparecen en Finanzas ("Sin plan") porque esa
--     pantalla lista la tabla `clientes`; al agregarles un servicio pasan
--     a tener plan y próximo pago.
-- =====================================================================

-- 1. Vínculo entre un pago y el servicio (fila de cursos) que lo originó.
--    on delete set null: si se borra la fila del servicio, el historial de
--    lo cobrado se conserva.
alter table public.pagos_clientes
  add column if not exists curso_id uuid references public.cursos(id) on delete set null;
create unique index if not exists pagos_clientes_curso_unico on public.pagos_clientes (curso_id);

-- 2. "Septiembre 2026" a partir de una fecha (los nombres de mes de
--    to_char dependen de la configuración del servidor, por eso a mano).
create or replace function public.periodo_texto(d date) returns text
language sql immutable set search_path = '' as $$
  select (array['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto',
                'Septiembre','Octubre','Noviembre','Diciembre'])[extract(month from d)::int]
         || ' ' || extract(year from d)::int::text;
$$;

-- 3. Recalcula la suscripción de un cliente a partir de sus servicios.
--    Próximo pago = la fecha de pago pendiente más cercana; si todo está
--    cobrado, un ciclo (según el plan) después del último pago.
create or replace function public.recalcular_suscripcion_cliente(p_cliente uuid) returns void
language plpgsql set search_path = '' as $$
declare
  v_owner uuid;
  v_plan text;
  v_pendiente date;
  v_ultimo date;
  v_proximo date;
begin
  if p_cliente is null then
    return;
  end if;

  select owner_id into v_owner from public.clientes where id = p_cliente;
  if v_owner is null then
    return; -- cliente borrado o que no es del usuario
  end if;

  -- Sin servicios ni pagos no queda nada que mostrar.
  if not exists (select 1 from public.cursos where cliente_id = p_cliente)
     and not exists (select 1 from public.pagos_clientes where cliente_id = p_cliente) then
    delete from public.suscripciones_clientes where cliente_id = p_cliente;
    return;
  end if;

  select min(fecha_pago) into v_pendiente
    from public.cursos where cliente_id = p_cliente and not cobrado and fecha_pago is not null;
  select max(fecha_pago) into v_ultimo
    from public.cursos where cliente_id = p_cliente and cobrado and fecha_pago is not null;
  select plan into v_plan from public.suscripciones_clientes where cliente_id = p_cliente;
  v_plan := coalesce(v_plan, 'Mensual');

  v_proximo := coalesce(
    v_pendiente,
    (v_ultimo + case when v_plan = 'Anual' then interval '1 year' else interval '1 month' end)::date
  );

  insert into public.suscripciones_clientes (cliente_id, owner_id, plan, proximo_pago, estado, updated_at)
  values (p_cliente, v_owner, v_plan, v_proximo,
          case when v_proximo is null then 'Pendiente' else 'Al día' end, now())
  on conflict (cliente_id) do update
    set proximo_pago = excluded.proximo_pago,
        estado = excluded.estado,
        updated_at = now();
end $$;

-- 4. Trigger sobre cursos.
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

  -- Cambió el cliente del servicio: se recalcula también el anterior y el
  -- pago (si lo hay) pasa al cliente nuevo.
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
         public.periodo_texto(v_fecha), coalesce(v_plan, 'Mensual'), null, new.monto, new.comprobante_url);
    elsif tg_op = 'UPDATE' then
      -- Ya cobrado y se corrigió el monto o el comprobante: el historial lo sigue.
      if old.cobrado
         and (old.monto is distinct from new.monto or old.comprobante_url is distinct from new.comprobante_url) then
        update public.pagos_clientes
           set monto = new.monto,
               recibo_url = coalesce(nullif(new.comprobante_url, ''), recibo_url)
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
  after insert or delete or update of cobrado, fecha_pago, fecha_suscripcion, cliente_id, monto, comprobante_url
  on public.cursos
  for each row execute function public.sincronizar_curso_con_finanzas();

-- 5. Registrar un pago desde Finanzas y Cobros ahora también cierra el
--    servicio pendiente del cliente en Cursos y Suscripciones.
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

  -- Servicio pendiente más próximo del cliente (si tiene alguno).
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
    -- El pago ya existe (se creó arriba), así que el trigger solo recalcula
    -- la suscripción a partir de los servicios.
    update public.cursos
       set cobrado = true,
           comprobante_url = coalesce(nullif(p_recibo, ''), comprobante_url)
     where id = v_curso;
    select proximo_pago into siguiente from public.suscripciones_clientes where cliente_id = p_cliente;
  end if;

  return siguiente;
end $$;

-- 6. Datos que ya existen: pagos de los servicios ya cobrados y
--    suscripción de cada cliente que ya tiene servicios.
insert into public.pagos_clientes
  (owner_id, curso_id, cliente_id, fecha_pago, fecha_suscripcion, periodo, plan, metodo, monto, recibo_url)
select c.owner_id, c.id, c.cliente_id, coalesce(c.fecha_pago, current_date), c.fecha_suscripcion,
       public.periodo_texto(coalesce(c.fecha_pago, current_date)), 'Mensual', null, c.monto, c.comprobante_url
  from public.cursos c
 where c.cobrado and c.cliente_id is not null
   and not exists (select 1 from public.pagos_clientes p where p.curso_id = c.id);

do $$
declare
  r record;
begin
  for r in select distinct cliente_id from public.cursos where cliente_id is not null loop
    perform public.recalcular_suscripcion_cliente(r.cliente_id);
  end loop;
end $$;
