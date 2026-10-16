-- =====================================================================
-- MIGRACIÓN 10: MÉTODOS DE PAGO COMO LISTA (con datos para pagar y QR)
--
-- Hasta ahora "Mi Perfil" guardaba 6 pares fijos nombre/enlace en las
-- columnas perfil.pasarela_N_*. Ahora cada usuario tiene una lista libre
-- de métodos de pago, cada uno con:
--   * nombre  -> es el texto que aparece en el desplegable «Método de Pago»
--                de Proyectos y Finanzas, Cursos y Suscripciones y Control
--                Suscripciones Admin (y el que viaja a los historiales de
--                pagos al cobrar).
--   * datos   -> cuenta, banco, teléfono, cédula… para compartir al cliente.
--   * enlace  -> enlace de pago (opcional).
--   * qr      -> imagen del QR como data URL, ya reducida en el navegador
--                (opcional). Se guarda en la propia fila para no depender de
--                un bucket de Storage.
--
-- Las columnas perfil.pasarela_* NO se borran (por seguridad y para poder
-- revertir): solo se copian a la tabla nueva una vez.
-- =====================================================================

create table if not exists public.metodos_pago (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre text not null check (char_length(btrim(nombre)) between 1 and 80),
  datos text not null default '' check (char_length(datos) <= 2000),
  enlace text check (enlace is null or char_length(enlace) <= 500),
  qr text check (qr is null or (char_length(qr) <= 700000 and qr like 'data:image/%')),
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists metodos_pago_owner_idx on public.metodos_pago (owner_id, orden);

-- Un mismo usuario no puede tener dos métodos con el mismo nombre (sin
-- distinguir mayúsculas): el nombre es lo que se guarda en cada cobro.
create unique index if not exists metodos_pago_nombre_unico
  on public.metodos_pago (owner_id, lower(btrim(nombre)));

alter table public.metodos_pago enable row level security;

drop policy if exists "Datos propios de usuarios autorizados" on public.metodos_pago;
create policy "Datos propios de usuarios autorizados" on public.metodos_pago for all to authenticated
  using (owner_id = auth.uid() and public.esta_autorizado())
  with check (owner_id = auth.uid() and public.esta_autorizado());

-- ---------------------------------------------------------------------
-- Copia única de lo que cada usuario ya tenía en Mi Perfil (hasta 6).
-- Solo para usuarios que todavía no tienen ningún método en la tabla
-- nueva, así que volver a ejecutar la migración no duplica nada.
-- ---------------------------------------------------------------------
insert into public.metodos_pago (owner_id, nombre, enlace, orden)
select distinct on (p.owner_id, lower(btrim(m.nombre)))
       p.owner_id, btrim(m.nombre), nullif(btrim(m.url), ''), m.orden
  from public.perfil p
  cross join lateral (values
    (1, p.pasarela_1_nombre, p.pasarela_1_url),
    (2, p.pasarela_2_nombre, p.pasarela_2_url),
    (3, p.pasarela_3_nombre, p.pasarela_3_url),
    (4, p.pasarela_4_nombre, p.pasarela_4_url),
    (5, p.pasarela_5_nombre, p.pasarela_5_url),
    (6, p.pasarela_6_nombre, p.pasarela_6_url)
  ) as m(orden, nombre, url)
 where btrim(coalesce(m.nombre, '')) <> ''
   and not exists (select 1 from public.metodos_pago x where x.owner_id = p.owner_id)
 order by p.owner_id, lower(btrim(m.nombre)), m.orden;
