# BUGS — Finos Barbers

## ✅ Bug 1 — Selector de fecha sin límite (RESUELTO)
Archivo: src/components/client/ReservaForm.tsx
El input `type="date"` ya tiene `min={today}` y `max={maxDateStr}` (hoy + 60 días).
Pendiente menor: reforzar la validación también en el Server Action de reservas.

## ✅ Bug 2 — Registro sin nombre y apellido (RESUELTO)
Archivos: src/components/ui/AuthForm.tsx · src/app/(auth)/register/actions.ts
El formulario de registro pide nombre y apellido (requeridos) y los pasa en
`options.data` (raw_user_meta_data) al `supabase.auth.signUp()`.

---

## Pendientes (próxima tanda funcional)
- [ ] Guest checkout: comprar sin cuenta (hoy el checkout exige login).
- [ ] Categorías + subcategorías de productos y servicios (cargables desde admin).
- [ ] Sistema de stock con alertas de stock bajo.
- [ ] Barberos con bio/foto/especialidad y días de atención (ej. Facundo: sábados).
- [ ] Reseñas de clientes administrables.
