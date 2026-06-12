# BUGS PENDIENTES — Finos Barbers

## Bug 1 — Selector de fecha sin límite
Archivo: src/components/client/ReservaForm.tsx
Problema: el input de tipo date no tiene restricción de fecha mínima ni máxima,
permitiendo seleccionar fechas imposibles como 21/11/3313.
Solución esperada:
- Agregar atributo min con la fecha de hoy (new Date().toISOString().split('T')[0])
- Agregar atributo max con fecha a 60 días desde hoy como máximo razonable
- Validar en el Server Action que la fecha sea futura y no mayor a 60 días

## Bug 2 — Registro sin nombre y apellido
Archivo: src/app/(auth)/register/page.tsx y src/components/ui/AuthForm.tsx
Problema: el formulario de registro no solicita nombre y apellido al usuario,
dejando esos campos vacíos en la tabla profiles.
Solución esperada:
- Agregar campos nombre y apellido en el formulario de registro
- Pasar esos valores en raw_user_meta_data al llamar a supabase.auth.signUp()
- El trigger handle_new_user ya los lee del metadata automáticamente
