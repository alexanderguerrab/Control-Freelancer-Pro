-- =====================================================================
-- MIGRACIÓN 7: MÉTODO DE PAGO EN PROYECTOS Y FINANZAS
-- Columna nueva para el desplegable "Método de Pago" de la tabla de
-- proyectos (la lista sale de Mi Perfil, igual que en Cursos).
-- =====================================================================
alter table public.proyectos add column if not exists metodo_pago text;
