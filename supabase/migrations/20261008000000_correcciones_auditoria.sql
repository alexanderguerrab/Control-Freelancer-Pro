-- =====================================================================
-- MIGRACIÓN 8: CORRECCIONES DE LA AUDITORÍA
--
--   1. Columnas que la app ya usaba y no estaban en las migraciones
--      (tipo_suscripcion, usuarios.cliente).
--   2. fecha_cobro: día real en que se cobró (antes se confundía con la
--      fecha de vencimiento fecha_pago y los cobrados sin fecha no
--      aparecían en reportes).
--   3. El plan Mensual/Anual de cada servicio ahora llega a
--      suscripciones_clientes / suscripciones_saas.
--   4. Deshacer "Cobrado" ya no borra pagos registrados a mano.
--   5. Las funciones registrar_pago_* (sin uso y con fórmula errónea)
--      se eliminan.
--   6. Administrador: carrera del primer registro, toma de control
--      cuando no queda admin y protección del último administrador.
--   7. correo_envio: el navegador ya no puede leer password_cifrada.
--   8. RLS: no se puede enlazar un cliente ajeno; montos no negativos.
--
-- Es idempotente salvo los CREATE TRIGGER, que se recrean con DROP.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. COLUMNAS FALTANTES
-- ---------------------------------------------------------------------
alter table public.cursos
  add column if not exists tipo_suscripcion text not null default 'Mensual'
    check (tipo_suscripcion in ('Mensual', 'Anual'));
alter table public.control_saas
  add column if not exists tipo_suscripcion text not null default 'Mensual'
    check (tipo_suscripcion in ('Mensual', 'Anual'));

-- usuarios.cliente = nombre (o marca) que el usuario puso en su perfil.
-- El admin no puede leer perfil de otros (RLS), por eso se copia aquí.
alter table public.usuarios add column if not exists cliente text;

create or replace function public.sincronizar_nombre_usuario() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.usuarios
     set cliente = coalesce(nullif(trim(new.nombre), ''), nullif(trim(new.marca), ''))
   where id = new.owner_id;
  return new;
end $$;

drop trigger if exists perfil_sincronizar_nombre on public.perfil;
create trigger perfil_sincronizar_nombre
  after insert or update of nombre, marca on public.perfil
  for each row execute function public.sincronizar_nombre_usuario();

update public.usuarios u
   set cliente = coalesce(nullif(trim(p.nombre), ''), nullif(trim(p.marca), ''))
  from public.perfil p
 where p.owner_id = u.id;

-- ---------------------------------------------------------------------
-- 2. FECHA REAL DE COBRO
-- ---------------------------------------------------------------------
alter table public.proyectos add column if not exists fecha_cobro date;
alter table public.cursos add column if not exists fecha_cobro date;
alter table public.control_saas add column if not exists fecha_cobro date;

update public.proyectos set fecha_cobro = coalesce(fecha_pago, created_at::date)
 where cobrado and fecha_cobro is null;
update public.cursos set fecha_cobro = coalesce(fecha_pago, created_at::date)
 where cobrado and fecha_cobro is null;
update public.control_saas set fecha_cobro = coalesce(fecha_pago, created_at::date)
 where cobrado and fecha_cobro is null;

-- Al marcar cobrado se fija el día; al desmarcar se borra.
create or replace function public.fijar_fecha_cobro() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.cobrado then
    if new.fecha_cobro is null then
      new.fecha_cobro := current_date;
    end if;
  else
    new.fecha_cobro := null;
  end if;
  return new;
end $$;

drop trigger if exists proyectos_fecha_cobro on public.proyectos;
create trigger proyectos_fecha_cobro before insert or update on public.proyectos
  for each row execute function public.fijar_fecha_cobro();
drop trigger if exists cursos_fecha_cobro on public.cursos;
create trigger cursos_fecha_cobro before insert or update on public.cursos
  for each row execute function public.fijar_fecha_cobro();
drop trigger if exists control_saas_fecha_cobro on public.control_saas;
create trigger control_saas_fecha_cobro before insert or update on public.control_saas
  for each row execute function public.fijar_fecha_cobro();

-- ---------------------------------------------------------------------
-- 3 y 4. PAGOS AUTOMÁTICOS vs MANUALES + PLAN POR SERVICIO
-- ---------------------------------------------------------------------
-- auto = true: pago creado por el trigger al marcar "Cobrado". Solo esos
-- se borran al desmarcar; los registrados a mano se conservan.
alter table public.pagos_clientes add column if not exists auto boolean not null default false;
alter table public.pagos_saas add column if not exists auto boolean not null default false;
update public.pagos_clientes set auto = true where curso_id is not null;
update public.pagos_saas set auto = true where control_id is not null;

-- Las funciones nunca se llamaron desde la app y calculaban el próximo
-- pago desde la fecha de suscripción (podía quedar en el pasado).
drop function if exists public.registrar_pago_cliente(uuid, text, date, date, text, text, numeric, text);
drop function if exists public.registrar_pago_saas(uuid, text, date, date, text, text, numeric, text);

-- Plan del cliente = tipo de la cuota pendiente más próxima; si no hay,
-- el de la última cuota; si no hay cuotas, el que ya tenía.
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
    return;
  end if;

  if not exists (select 1 from public.cursos where cliente_id = p_cliente)
     and not exists (select 1 from public.pagos_clientes where cliente_id = p_cliente) then
    delete from public.suscripciones_clientes where cliente_id = p_cliente;
    return;
  end if;

  select min(fecha_pago) into v_pendiente
    from public.cursos where cliente_id = p_cliente and not cobrado and fecha_pago is not null;
  select max(fecha_pago) into v_ultimo
    from public.cursos where cliente_id = p_cliente and cobrado and fecha_pago is not null;

  select tipo_suscripcion into v_plan from public.cursos
   where cliente_id = p_cliente and not cobrado
   order by fecha_pago nulls last, created_at limit 1;
  if v_plan is null then
    select tipo_suscripcion into v_plan from public.cursos
     where cliente_id = p_cliente
     order by fecha_pago desc nulls last, created_at desc limit 1;
  end if;
  if v_plan is null then
    select plan into v_plan from public.suscripciones_clientes where cliente_id = p_cliente;
  end if;
  v_plan := coalesce(v_plan, 'Mensual');

  v_proximo := coalesce(
    v_pendiente,
    (v_ultimo + case when v_plan = 'Anual' then interval '1 year' else interval '1 month' end)::date
  );

  insert into public.suscripciones_clientes (cliente_id, owner_id, plan, proximo_pago, estado, updated_at)
  values (p_cliente, v_owner, v_plan, v_proximo,
          case when v_proximo is null then 'Pendiente' else 'Al día' end, now())
  on conflict (cliente_id) do update
    set plan = excluded.plan,
        proximo_pago = excluded.proximo_pago,
        estado = excluded.estado,
        updated_at = now();
end $$;

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

  select tipo_suscripcion into v_plan from public.control_saas
   where usuario_id = p_usuario and not cobrado
   order by fecha_pago nulls last, created_at limit 1;
  if v_plan is null then
    select tipo_suscripcion into v_plan from public.control_saas
     where usuario_id = p_usuario
     order by fecha_pago desc nulls last, created_at desc limit 1;
  end if;
  if v_plan is null then
    select plan into v_plan from public.suscripciones_saas where usuario_id = p_usuario;
  end if;
  v_plan := coalesce(v_plan, 'Mensual');

  v_proximo := coalesce(
    v_pendiente,
    (v_ultimo + case when v_plan = 'Anual' then interval '1 year' else interval '1 month' end)::date
  );

  insert into public.suscripciones_saas (usuario_id, plan, proximo_pago, estado, updated_at)
  values (p_usuario, v_plan, v_proximo, case when v_proximo is null then 'Pendiente' else 'Al día' end, now())
  on conflict (usuario_id) do update
    set plan = excluded.plan,
        proximo_pago = excluded.proximo_pago,
        estado = excluded.estado,
        updated_at = now();
end $$;

create or replace function public.sincronizar_curso_con_finanzas() returns trigger
language plpgsql set search_path = '' as $$
declare
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
      v_fecha := coalesce(new.fecha_cobro, new.fecha_pago, current_date);
      insert into public.pagos_clientes
        (owner_id, curso_id, cliente_id, fecha_pago, fecha_suscripcion, periodo, plan, metodo, monto, recibo_url, auto)
      values
        (new.owner_id, new.id, new.cliente_id, v_fecha, new.fecha_suscripcion,
         public.periodo_texto(v_fecha), new.tipo_suscripcion, nullif(new.metodo_pago, ''),
         new.monto, new.comprobante_url, true);
    elsif tg_op = 'UPDATE' then
      if old.cobrado
         and (old.monto is distinct from new.monto
              or old.comprobante_url is distinct from new.comprobante_url
              or old.metodo_pago is distinct from new.metodo_pago
              or old.tipo_suscripcion is distinct from new.tipo_suscripcion) then
        update public.pagos_clientes
           set monto = new.monto,
               plan = new.tipo_suscripcion,
               recibo_url = coalesce(nullif(new.comprobante_url, ''), recibo_url),
               metodo = coalesce(nullif(new.metodo_pago, ''), metodo)
         where curso_id = new.id;
      end if;
    end if;
  elsif tg_op = 'UPDATE' then
    if old.cobrado and not new.cobrado then
      -- Solo se retira el pago que creó este mismo trigger; si el usuario
      -- lo registró o corrigió a mano se conserva (desvinculado del servicio).
      delete from public.pagos_clientes where curso_id = new.id and auto;
      update public.pagos_clientes set curso_id = null where curso_id = new.id;
    end if;
  end if;

  perform public.recalcular_suscripcion_cliente(new.cliente_id);
  return new;
end $$;

drop trigger if exists cursos_sincronizar_finanzas on public.cursos;
create trigger cursos_sincronizar_finanzas
  after insert or delete
     or update of cobrado, fecha_pago, fecha_suscripcion, cliente_id, monto, comprobante_url, metodo_pago, tipo_suscripcion
  on public.cursos
  for each row execute function public.sincronizar_curso_con_finanzas();

create or replace function public.sincronizar_control_con_finanzas() returns trigger
language plpgsql set search_path = '' as $$
declare
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
      v_fecha := coalesce(new.fecha_cobro, new.fecha_pago, current_date);
      insert into public.pagos_saas
        (control_id, usuario_id, fecha_pago, fecha_suscripcion, periodo, plan, metodo, monto, recibo_url, auto)
      values
        (new.id, new.usuario_id, v_fecha, new.fecha_suscripcion,
         public.periodo_texto(v_fecha), new.tipo_suscripcion, nullif(new.metodo_pago, ''),
         new.monto, new.comprobante_url, true);
    elsif tg_op = 'UPDATE' then
      if old.cobrado
         and (old.monto is distinct from new.monto
              or old.comprobante_url is distinct from new.comprobante_url
              or old.metodo_pago is distinct from new.metodo_pago
              or old.tipo_suscripcion is distinct from new.tipo_suscripcion) then
        update public.pagos_saas
           set monto = new.monto,
               plan = new.tipo_suscripcion,
               recibo_url = coalesce(nullif(new.comprobante_url, ''), recibo_url),
               metodo = coalesce(nullif(new.metodo_pago, ''), metodo)
         where control_id = new.id;
      end if;
    end if;
  elsif tg_op = 'UPDATE' then
    if old.cobrado and not new.cobrado then
      delete from public.pagos_saas where control_id = new.id and auto;
      update public.pagos_saas set control_id = null where control_id = new.id;
    end if;
  end if;

  perform public.recalcular_suscripcion_saas(new.usuario_id);
  return new;
end $$;

drop trigger if exists control_saas_sincronizar_finanzas on public.control_saas;
create trigger control_saas_sincronizar_finanzas
  after insert or delete
     or update of cobrado, fecha_pago, fecha_suscripcion, usuario_id, monto, comprobante_url, metodo_pago, tipo_suscripcion
  on public.control_saas
  for each row execute function public.sincronizar_control_con_finanzas();

-- Recalcula con la nueva regla de plan lo que ya existe.
do $$
declare
  r record;
begin
  for r in select distinct cliente_id from public.cursos where cliente_id is not null loop
    perform public.recalcular_suscripcion_cliente(r.cliente_id);
  end loop;
  for r in select distinct usuario_id from public.control_saas where usuario_id is not null loop
    perform public.recalcular_suscripcion_saas(r.usuario_id);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 6. ADMINISTRADOR
-- ---------------------------------------------------------------------
-- Solo el PRIMER usuario de una base vacía es admin (antes bastaba con
-- que no hubiera ningún admin, lo que permitía tomar el control si el
-- admin era eliminado). El bloqueo serializa registros simultáneos.
-- Si te quedas sin admin: update public.usuarios set rol='Administrador',
-- estado='Autorizado' where email='tu@correo.com';
create or replace function public.registrar_usuario_nuevo() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  es_primero boolean;
begin
  perform pg_advisory_xact_lock(hashtext('registrar_usuario_nuevo'));
  select not exists (select 1 from public.usuarios) into es_primero;
  insert into public.usuarios (id, email, telefono, rol, estado)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'telefono', ''),
    case when es_primero then 'Administrador' else 'Cliente' end,
    case when es_primero then 'Autorizado' else 'Pendiente' end
  )
  on conflict (id) do nothing;
  return new;
end $$;

create or replace function public.proteger_ultimo_admin() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.rol = 'Administrador' and old.estado = 'Autorizado'
     and (tg_op = 'DELETE' or new.rol <> 'Administrador' or new.estado <> 'Autorizado') then
    if not exists (
      select 1 from public.usuarios
       where rol = 'Administrador' and estado = 'Autorizado' and id <> old.id
    ) then
      raise exception 'No puedes quitar, bloquear ni eliminar al único administrador activo.';
    end if;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end $$;

drop trigger if exists usuarios_proteger_admin on public.usuarios;
create trigger usuarios_proteger_admin before update or delete on public.usuarios
  for each row execute function public.proteger_ultimo_admin();

-- ---------------------------------------------------------------------
-- 7. CORREO: la contraseña cifrada ya no es legible desde el navegador
-- ---------------------------------------------------------------------
drop policy if exists "Datos propios de usuarios autorizados" on public.correo_envio;
revoke all on public.correo_envio from anon, authenticated;
grant select (owner_id, email, updated_at) on public.correo_envio to authenticated;
create policy "Ver propio correo conectado" on public.correo_envio
  for select to authenticated
  using (owner_id = auth.uid() and public.esta_autorizado());

-- El servidor (con la sesión del usuario) lee el secreto solo por aquí.
create or replace function public.correo_envio_secreto()
returns table (email text, password_cifrada text)
language sql stable security definer set search_path = '' as $$
  select c.email, c.password_cifrada
    from public.correo_envio c
   where c.owner_id = auth.uid() and public.esta_autorizado();
$$;

create or replace function public.guardar_correo_envio(p_email text, p_password_cifrada text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.esta_autorizado() then
    raise exception 'No autorizado.';
  end if;
  insert into public.correo_envio (owner_id, email, password_cifrada, updated_at)
  values (auth.uid(), lower(trim(p_email)), p_password_cifrada, now())
  on conflict (owner_id) do update
    set email = excluded.email,
        password_cifrada = excluded.password_cifrada,
        updated_at = now();
end $$;

create or replace function public.borrar_correo_envio()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.esta_autorizado() then
    raise exception 'No autorizado.';
  end if;
  delete from public.correo_envio where owner_id = auth.uid();
end $$;

revoke execute on function public.correo_envio_secreto() from public, anon;
revoke execute on function public.guardar_correo_envio(text, text) from public, anon;
revoke execute on function public.borrar_correo_envio() from public, anon;
grant execute on function public.correo_envio_secreto() to authenticated;
grant execute on function public.guardar_correo_envio(text, text) to authenticated;
grant execute on function public.borrar_correo_envio() to authenticated;

-- ---------------------------------------------------------------------
-- 8. INTEGRIDAD
-- ---------------------------------------------------------------------
-- Un cliente solo puede enlazarse a datos de su propio dueño (la FK no
-- pasa por RLS, así que antes se podía apuntar a un UUID ajeno).
drop policy if exists "Datos propios de usuarios autorizados" on public.proyectos;
create policy "Datos propios de usuarios autorizados" on public.proyectos
  for all to authenticated
  using (owner_id = auth.uid() and public.esta_autorizado())
  with check (
    owner_id = auth.uid() and public.esta_autorizado()
    and (cliente_id is null or exists (
      select 1 from public.clientes c where c.id = cliente_id and c.owner_id = auth.uid()))
  );

drop policy if exists "Datos propios de usuarios autorizados" on public.cursos;
create policy "Datos propios de usuarios autorizados" on public.cursos
  for all to authenticated
  using (owner_id = auth.uid() and public.esta_autorizado())
  with check (
    owner_id = auth.uid() and public.esta_autorizado()
    and (cliente_id is null or exists (
      select 1 from public.clientes c where c.id = cliente_id and c.owner_id = auth.uid()))
  );

drop policy if exists "Datos propios de usuarios autorizados" on public.pagos_clientes;
create policy "Datos propios de usuarios autorizados" on public.pagos_clientes
  for all to authenticated
  using (owner_id = auth.uid() and public.esta_autorizado())
  with check (
    owner_id = auth.uid() and public.esta_autorizado()
    and exists (select 1 from public.clientes c where c.id = cliente_id and c.owner_id = auth.uid())
  );

-- NOT VALID: no revisa filas viejas, pero sí las nuevas.
alter table public.proyectos drop constraint if exists proyectos_monto_no_negativo;
alter table public.proyectos add constraint proyectos_monto_no_negativo check (monto >= 0) not valid;
alter table public.cursos drop constraint if exists cursos_monto_no_negativo;
alter table public.cursos add constraint cursos_monto_no_negativo check (monto >= 0) not valid;
alter table public.control_saas drop constraint if exists control_saas_monto_no_negativo;
alter table public.control_saas add constraint control_saas_monto_no_negativo check (monto >= 0) not valid;
