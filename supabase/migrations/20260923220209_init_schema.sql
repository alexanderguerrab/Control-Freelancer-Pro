-- Habilitar extensión para UUIDs (si no está habilitada por defecto)
create extension if not exists "uuid-ossp";

-- 1. TABLA PERFIL (Configuraciones globales del administrador)
create table perfil_admin (
  id uuid primary key default uuid_generate_v4(),
  nombre text,
  marca text,
  especialidad text,
  logo_url text,
  moneda varchar(10) default 'USD',
  meta_mensual numeric default 0,
  red_social_1_nombre text,
  red_social_1_url text,
  red_social_2_nombre text,
  red_social_2_url text,
  red_social_3_nombre text,
  red_social_3_url text,
  pasarela_1_nombre text,
  pasarela_1_url text,
  pasarela_2_nombre text,
  pasarela_2_url text,
  pasarela_3_nombre text,
  pasarela_3_url text,
  updated_at timestamp with time zone default now()
);

-- 2. TABLA CLIENTES (Directorio principal de clientes)
create table clientes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id), -- Referencia al usuario en Supabase Auth si inician sesión
  dni text unique not null,
  nombre text not null,
  email text,
  telefono text,
  pais text,
  fecha_registro date default CURRENT_DATE,
  drive_link text,
  notas text,
  created_at timestamp with time zone default now()
);

-- 3. TABLA PROYECTOS (Trabajos freelance)
create table proyectos (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid references clientes(id) on delete cascade,
  nombre_proyecto text not null,
  monto numeric not null default 0,
  cobrado boolean default false,
  fecha_recepcion date,
  fecha_entrega date,
  fecha_pago date,
  estado_proceso varchar(50) default 'En Proceso', -- 'En Proceso', 'Terminado', 'Pausado'
  comprobante_url text,
  created_at timestamp with time zone default now()
);

-- 4. TABLA CURSOS Y SUSCRIPCIONES (SaaS / Alumnos)
create table cursos_suscripciones (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid references clientes(id) on delete cascade,
  nombre_curso text not null,
  monto numeric not null default 0,
  cobrado boolean default false,
  fecha_suscripcion date,
  fecha_proximo_pago date,
  comprobante_url text,
  created_at timestamp with time zone default now()
);

-- 5. TABLA PAGOS / FINANZAS (Historial de todos los pagos recibidos)
create table historial_pagos (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid references clientes(id) on delete cascade,
  tipo_servicio varchar(50), -- 'Proyecto', 'Curso', 'SaaS'
  referencia_id uuid, -- ID del proyecto o curso
  monto numeric not null,
  metodo_pago varchar(50),
  periodo_abonado text,
  fecha_pago timestamp with time zone default now(),
  comprobante_url text
);

-- Políticas de Seguridad RLS (Row Level Security) - Solo autenticados pueden ver/editar
alter table perfil_admin enable row level security;
alter table clientes enable row level security;
alter table proyectos enable row level security;
alter table cursos_suscripciones enable row level security;
alter table historial_pagos enable row level security;

create policy "Acceso total para usuarios autenticados" on perfil_admin for all to authenticated using (true);
create policy "Acceso total para usuarios autenticados" on clientes for all to authenticated using (true);
create policy "Acceso total para usuarios autenticados" on proyectos for all to authenticated using (true);
create policy "Acceso total para usuarios autenticados" on cursos_suscripciones for all to authenticated using (true);
create policy "Acceso total para usuarios autenticados" on historial_pagos for all to authenticated using (true);
