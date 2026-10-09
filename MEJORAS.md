# Mejoras de la auditoría — cómo aplicarlas

1. **Copia de seguridad** de la base de datos (Supabase → Database → Backups).
2. Aplica los archivos de este paquete sobre tu repo (o `git apply mejoras.patch`).
3. Ejecuta la migración nueva:
   `npx supabase db push`
   (o pega `supabase/migrations/20261008000000_correcciones_auditoria.sql` en el Editor SQL).
4. Cambia los ajustes de Auth en el panel de Supabase (ver README → «Configuración en el panel»).
5. `npm install && npm run lint && npm run build`, prueba en local y despliega.
6. Prueba: crear/renovar un curso, cambiarlo a Anual, marcarlo Cobrado, ejecutar un cobro
   dos veces seguidas (la segunda no debe reenviar) y reconectar tu Gmail.
