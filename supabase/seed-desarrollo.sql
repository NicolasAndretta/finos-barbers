-- ============================================================================
-- Datos de ejemplo para el proyecto de DESARROLLO
--
-- Generado por scripts/exportar-esquema.mjs el 2026-10-10
-- desde proyecto mcfgvxgcdnhgjbagrirr — entorno: produccion.
--
-- Copia el catálogo de Roble, el local de demostración (categorias, servicios, barberos, productos, resenas):
-- lo mismo que ya muestra la web pública. NO incluye cuentas, turnos, pedidos,
-- movimientos de caja ni tokens de Mercado Pago.
--
-- Se carga solo en desarrollo, con: node scripts/preparar-desarrollo.mjs
-- ============================================================================
-- barberos: 3 fila(s)
insert into public.barberos (id, nombre, apellido, activo, created_at, bio, foto_url, especialidad, dias)
select id, nombre, apellido, activo, created_at, bio, foto_url, especialidad, dias
  from jsonb_populate_recordset(null::public.barberos, $seed$
[
  {
    "id": "66c58170-c502-4716-b49f-480e8123f784",
    "bio": "Fades, texturizados y tendencias modernas. Atiende los sábados con turnos limitados.",
    "dias": [
      "Sábado"
    ],
    "activo": true,
    "nombre": "Facundo",
    "apellido": "",
    "foto_url": null,
    "created_at": "2026-06-04T07:54:54.41442+00:00",
    "especialidad": "Barber · Sábados"
  },
  {
    "id": "aa57ec58-0d22-4729-927a-d402ad20a7eb",
    "bio": "Color global, corte y diseño de barba. Trato cercano y atención al detalle en cada cliente.",
    "dias": [
      "Lunes",
      "Martes",
      "Jueves",
      "Sábado"
    ],
    "activo": true,
    "nombre": "Cristopher",
    "apellido": "",
    "foto_url": null,
    "created_at": "2026-07-01T19:57:32.938392+00:00",
    "especialidad": "Barber · Color y barba"
  },
  {
    "id": "f4076d20-94e7-417c-9eb7-71ec768944a5",
    "bio": "Más de una década detrás de la silla. Especialista en cortes clásicos y diseño de barba.",
    "dias": [
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado"
    ],
    "activo": true,
    "nombre": "Leandro",
    "apellido": "",
    "foto_url": null,
    "created_at": "2026-06-04T07:54:54.41442+00:00",
    "especialidad": "Master Barber · Fundador"
  }
]
$seed$::jsonb)
on conflict do nothing;

-- categorias: 5 fila(s). Se cargan vacías: parent_id (apuntan a datos que no se copian).
insert into public.categorias (id, nombre, slug, tipo, parent_id, orden, activo, created_at)
select id, nombre, slug, tipo, parent_id, orden, activo, created_at
  from jsonb_populate_recordset(null::public.categorias, $seed$
[
  {
    "id": "3666be4e-0c39-472f-82e3-a3ac9d10b0f2",
    "slug": "combos",
    "tipo": "servicio",
    "orden": 3,
    "activo": true,
    "nombre": "Combos",
    "parent_id": null,
    "created_at": "2026-06-30T05:02:51.127395+00:00"
  },
  {
    "id": "649a51a8-afc1-4667-bcc0-a73dd0ab26ec",
    "slug": "polvos",
    "tipo": "producto",
    "orden": 2,
    "activo": true,
    "nombre": "Polvos",
    "parent_id": null,
    "created_at": "2026-06-30T05:02:51.127395+00:00"
  },
  {
    "id": "9102ca38-fb35-41d4-b185-90c175b48e6b",
    "slug": "pomadas",
    "tipo": "producto",
    "orden": 1,
    "activo": true,
    "nombre": "Pomadas",
    "parent_id": null,
    "created_at": "2026-06-30T05:02:51.127395+00:00"
  },
  {
    "id": "a315d843-b784-4ba1-add1-08e74fbeb396",
    "slug": "cortes",
    "tipo": "servicio",
    "orden": 1,
    "activo": true,
    "nombre": "Cortes",
    "parent_id": null,
    "created_at": "2026-06-30T05:02:51.127395+00:00"
  },
  {
    "id": "e237bddb-d94c-4bf0-a409-437aea9d9112",
    "slug": "barba",
    "tipo": "servicio",
    "orden": 2,
    "activo": true,
    "nombre": "Barba",
    "parent_id": null,
    "created_at": "2026-06-30T05:02:51.127395+00:00"
  }
]
$seed$::jsonb)
on conflict do nothing;

-- productos: 5 fila(s)
-- Editado a mano el 10/10/2026: la exportación traía 8. Se sacaron 3 productos
-- de prueba que estaban inactivos (cargados en junio para probar el panel; la
-- tienda nunca los mostró). Siguen en producción: si este archivo se vuelve a
-- generar, vuelven a aparecer hasta que se borren de ahí.
insert into public.productos (id, nombre, descripcion, precio, stock, imagen_url, categoria, activo, created_at, categoria_id, stock_minimo)
select id, nombre, descripcion, precio, stock, imagen_url, categoria, activo, created_at, categoria_id, stock_minimo
  from jsonb_populate_recordset(null::public.productos, $seed$
[
  {
    "id": "0a762969-37a8-4262-a4e4-a934fb455303",
    "stock": 12,
    "activo": true,
    "nombre": "Pomada Fighters Matte",
    "precio": 8500,
    "categoria": "cuidado-cabello",
    "created_at": "2026-06-30T01:43:46.848662+00:00",
    "imagen_url": "/images/productos/matte.jpg",
    "descripcion": "Acabado mate sin brillo y fijación fuerte. Ideal para peinados con textura y looks naturales que duran todo el día.",
    "categoria_id": "9102ca38-fb35-41d4-b185-90c175b48e6b",
    "stock_minimo": 3
  },
  {
    "id": "0f2f9233-dcf5-4218-92f1-1bb17d60e4cb",
    "stock": 9,
    "activo": true,
    "nombre": "Pomada Fighters Glory",
    "precio": 8500,
    "categoria": "cuidado-cabello",
    "created_at": "2026-06-30T01:43:46.848662+00:00",
    "imagen_url": "/images/productos/glory.jpg",
    "descripcion": "Brillo medio y control prolongado. Perfecta para peinados clásicos prolijos con definición y movimiento.",
    "categoria_id": "9102ca38-fb35-41d4-b185-90c175b48e6b",
    "stock_minimo": 3
  },
  {
    "id": "23a5ed68-dc26-45ce-a4ac-8c7d67982a27",
    "stock": 7,
    "activo": true,
    "nombre": "Pomada Fighters Twist Versatile",
    "precio": 9000,
    "categoria": "cuidado-cabello",
    "created_at": "2026-06-30T01:43:46.848662+00:00",
    "imagen_url": "/images/productos/twist-versatile.jpg",
    "descripcion": "Versátil y reactivable con agua. Reformá tu peinado durante el día sin volver a cargar producto.",
    "categoria_id": "9102ca38-fb35-41d4-b185-90c175b48e6b",
    "stock_minimo": 3
  },
  {
    "id": "7b7a79e0-02c8-4981-bf31-4d77bb1f41b6",
    "stock": 15,
    "activo": true,
    "nombre": "Polvo Texturizador Fighters",
    "precio": 6500,
    "categoria": "cuidado-cabello",
    "created_at": "2026-06-30T01:43:46.848662+00:00",
    "imagen_url": "/images/productos/texturizador.jpg",
    "descripcion": "Volumen y textura al instante. Unos toques en seco y el pelo levanta con un acabado natural y liviano.",
    "categoria_id": "649a51a8-afc1-4667-bcc0-a73dd0ab26ec",
    "stock_minimo": 3
  },
  {
    "id": "9e543964-08fa-40ef-ae5c-8b8f83b7f6a3",
    "stock": 10,
    "activo": true,
    "nombre": "Polvo Fighters Carv Strong",
    "precio": 7000,
    "categoria": "cuidado-cabello",
    "created_at": "2026-06-30T01:43:46.848662+00:00",
    "imagen_url": "/images/productos/carv-strong.jpg",
    "descripcion": "Definición fuerte para diseños y delineados. La elección del barbero para que cada trazo quede marcado.",
    "categoria_id": "649a51a8-afc1-4667-bcc0-a73dd0ab26ec",
    "stock_minimo": 3
  }
]
$seed$::jsonb)
on conflict do nothing;

-- resenas: 4 fila(s)
insert into public.resenas (id, nombre, texto, rating, visible, orden, created_at)
select id, nombre, texto, rating, visible, orden, created_at
  from jsonb_populate_recordset(null::public.resenas, $seed$
[
  {
    "id": "42165960-dfc0-4cdf-97ca-71f975de2e8b",
    "orden": 4,
    "texto": "Atención de primera y un fade impecable. 100% recomendado.",
    "nombre": "Sebastián P.",
    "rating": 5,
    "visible": true,
    "created_at": "2026-06-30T05:02:53.861347+00:00"
  },
  {
    "id": "4af3b63d-47a0-4405-8b6e-3ca39ba7298f",
    "orden": 2,
    "texto": "Ambiente increíble, puntualidad y un trabajo de barba que no encontrás en otro lado.",
    "nombre": "Joaquín R.",
    "rating": 5,
    "visible": true,
    "created_at": "2026-06-30T05:02:53.861347+00:00"
  },
  {
    "id": "64f8b29d-df57-46f0-90a3-cdf713232dd7",
    "orden": 1,
    "texto": "El mejor corte que me hice en años. Te tratan como en casa y el resultado es impecable.",
    "nombre": "Martín G.",
    "rating": 5,
    "visible": true,
    "created_at": "2026-06-30T05:02:53.861347+00:00"
  },
  {
    "id": "95597e80-396c-4921-a412-e214bcf84d90",
    "orden": 3,
    "texto": "Reservé el turno online en un minuto. Profesionales de verdad, ya soy cliente fijo.",
    "nombre": "Diego M.",
    "rating": 5,
    "visible": true,
    "created_at": "2026-06-30T05:02:53.861347+00:00"
  }
]
$seed$::jsonb)
on conflict do nothing;

-- servicios: 3 fila(s)
insert into public.servicios (id, nombre, descripcion, precio, duracion_minutos, activo, created_at, categoria_id)
select id, nombre, descripcion, precio, duracion_minutos, activo, created_at, categoria_id
  from jsonb_populate_recordset(null::public.servicios, $seed$
[
  {
    "id": "9724c158-1291-4e75-8b43-241a2b3925d6",
    "activo": true,
    "nombre": "Barba",
    "precio": 3000,
    "created_at": "2026-06-04T07:54:54.41442+00:00",
    "descripcion": "Perfilado y afeitado tradicional",
    "categoria_id": null,
    "duracion_minutos": 25
  },
  {
    "id": "a4405f86-9d81-4f71-9ed3-2caee9eba3a2",
    "activo": true,
    "nombre": "Corte clásico",
    "precio": 3500,
    "created_at": "2026-06-04T07:54:54.41442+00:00",
    "descripcion": "Corte a tijera o máquina tradicional",
    "categoria_id": null,
    "duracion_minutos": 30
  },
  {
    "id": "ae56a2b2-b3eb-4579-a787-6a2c9fc53401",
    "activo": true,
    "nombre": "Corte + Barba",
    "precio": 5500,
    "created_at": "2026-06-04T07:54:54.41442+00:00",
    "descripcion": "Servicio completo de cabello y barba",
    "categoria_id": null,
    "duracion_minutos": 45
  }
]
$seed$::jsonb)
on conflict do nothing;
