/**
 * tools/demo/edicion/espec-reels.js
 *
 * Guion de cada reel. Los tiempos se resuelven contra las marcas que deja el
 * grabador (archivo .json junto a cada bruto), asi que no hay que ajustar
 * segundos a mano si se vuelve a grabar.
 *
 * Regla: solo se afirma lo que el sistema hace de verdad.
 * Finos Barbers es un PROYECTO DESARROLLADO / DEMO FUNCIONAL, no un cliente
 * activo ni un sistema en produccion.
 */

const CIERRE_GENERAL = {
  titulo: 'Sistemas<br>a medida',
  lineas: ['Sistemas de turnos', 'Tiendas online', 'Paneles administrativos'],
  cta: 'Escribinos por DM',
  dur: 3.0,
}

module.exports = [
  /* ── 1 · Sistema de turnos (pieza principal) ─────────────────────────── */
  {
    id: 'reel-01-sistema-de-turnos',
    fuente: 'turnos',
    apertura: {
      etiqueta: 'Sistema de turnos',
      titulo: 'Reservar<br>un turno<br>en <em class="violeta">3 pasos</em>',
      subtitulo: 'Sin llamados, sin WhatsApp, sin agenda de papel.',
      pie: 'Proyecto desarrollado · demo funcional',
      dur: 2.6,
    },
    tramos: [
      { desde: 'paso1', hasta: 'paso2', capa: { indice: '01', titulo: 'Elegís el servicio', detalle: 'Precio y duración a la vista' } },
      { desde: 'paso2', hasta: 'paso3', capa: { indice: '02', titulo: 'Elegís tu barbero', detalle: 'El equipo se carga desde el panel' } },
      { desde: 'paso3', hasta: 'paso4', capa: { indice: '03', titulo: 'Elegís día y hora', detalle: 'Solo aparecen los horarios libres' } },
      { desde: 'paso4', hasta: 'fin', capa: { indice: '04', titulo: 'Confirmás con la seña', detalle: 'Mercado Pago o transferencia' } },
    ],
    cierre: {
      titulo: 'Turnos online,<br>hechos a medida',
      lineas: ['Disponibilidad real', 'Seña para confirmar', 'Todo desde el panel'],
      cta: 'Escribinos por DM',
      dur: 3.0,
    },
  },

  /* ── 2 · El proyecto (hero) ──────────────────────────────────────────── */
  {
    id: 'reel-02-el-proyecto',
    fuente: 'hero',
    apertura: {
      etiqueta: 'Proyecto desarrollado',
      titulo: 'Una barbería<br>con <em class="violeta">sistema</em><br>propio',
      subtitulo: 'Web, turnos, tienda y panel de gestión. Todo en un mismo lugar.',
      pie: 'Demo funcional',
      dur: 2.6,
    },
    tramos: [
      { desde: 'hero', hasta: 'servicios', capa: { titulo: 'La web', detalle: 'Diseño propio, no una plantilla' } },
      { desde: 'servicios', hasta: 'equipo', capa: { titulo: 'Servicios', detalle: 'Precio, duración y descripción de cada uno' } },
      { desde: 'equipo', hasta: 'pasos', capa: { titulo: 'El equipo', detalle: 'Cada barbero con su perfil y sus días' } },
      { desde: 'pasos', hasta: 'resenas', capa: { titulo: 'Cómo se reserva', detalle: 'Tres pasos, sin fricción' } },
      { desde: 'resenas', hasta: 'fin', capa: { titulo: 'Reseñas', detalle: 'Se cargan y se publican desde el panel' } },
    ],
    cierre: CIERRE_GENERAL,
  },

  /* ── 3 · Selección de barbero ────────────────────────────────────────── */
  {
    id: 'reel-03-eleccion-de-barbero',
    fuente: 'barberos',
    apertura: {
      etiqueta: 'Turnos por barbero',
      titulo: 'Cada cliente<br>elige <em class="violeta">con quién</em><br>se atiende',
      subtitulo: 'Y cada barbero tiene su propia agenda.',
      pie: 'Demo funcional',
      dur: 2.4,
    },
    tramos: [
      { desde: 0, hasta: 'equipo', capa: { titulo: 'Elegís el servicio', detalle: 'La duración define los horarios' } },
      { desde: 'equipo', hasta: 'fin', capa: { titulo: 'Elegís el barbero', detalle: 'El equipo sale de la base de datos' } },
    ],
    cierre: {
      titulo: 'Agenda por<br>profesional',
      lineas: ['Sin turnos superpuestos', 'Cada uno con sus días', 'Alta y baja desde el panel'],
      cta: 'Escribinos por DM',
      dur: 2.8,
    },
  },

  /* ── 4 · Servicios (alta real en el panel) ──────────────────────────── */
  {
    id: 'reel-04-servicios',
    fuente: 'servicios',
    apertura: {
      etiqueta: 'Catálogo de servicios',
      titulo: 'Un servicio<br>nuevo, sin<br><em class="violeta">tocar código</em>',
      subtitulo: 'Se carga en el panel y queda disponible para reservar.',
      pie: 'Demo funcional',
      dur: 2.5,
    },
    tramos: [
      { desde: 'panel', hasta: 'formulario', capa: { titulo: 'Servicios en el panel', detalle: 'Alta, edición, baja y activar o desactivar' } },
      { desde: 'formulario', hasta: 'creado', vel: 1.4, capa: { titulo: 'Nombre, precio y duración', detalle: 'La duración define después la grilla de horarios' } },
      { desde: 'creado', hasta: 'corte', capa: { titulo: 'Guardado', detalle: 'Ya está en el catálogo' } },
      { desde: 'reserva', hasta: 'fin', capa: { titulo: 'Y aparece en la reserva', detalle: 'El cliente ya lo puede elegir' } },
    ],
    cierre: {
      titulo: 'Vos cargás,<br>el sistema<br>lo publica',
      lineas: ['Alta, edición y baja', 'Activar o desactivar', 'Sin tocar una línea de código'],
      cta: 'Escribinos por DM',
      dur: 2.8,
    },
  },

  /* ── 5 · Tienda online ───────────────────────────────────────────────── */
  {
    id: 'reel-05-tienda-online',
    fuente: 'ecommerce',
    apertura: {
      etiqueta: 'Ecommerce',
      titulo: 'Una barbería<br>que también<br><em class="violeta">vende online</em>',
      subtitulo: 'Catálogo, buscador, filtros y control de stock.',
      pie: 'Demo funcional',
      dur: 2.5,
    },
    tramos: [
      { desde: 'catalogo', hasta: 'filtros', capa: { titulo: 'Catálogo de productos', detalle: 'Con stock real y aviso de últimas unidades' } },
      { desde: 'filtros', hasta: 'fin', capa: { titulo: 'Buscador y categorías', detalle: 'Encontrar un producto lleva segundos' } },
    ],
    cierre: {
      titulo: 'Tienda propia,<br>sin comisiones<br>de terceros',
      lineas: ['Catálogo y stock', 'Carrito y checkout', 'Todo en tu web'],
      cta: 'Escribinos por DM',
      dur: 3.0,
    },
  },

  /* ── 6 · Carrito y checkout ──────────────────────────────────────────── */
  {
    id: 'reel-06-carrito-y-checkout',
    fuente: 'carrito',
    apertura: {
      etiqueta: 'Checkout',
      titulo: 'Comprar<br>sin crear<br><em class="violeta">una cuenta</em>',
      subtitulo: 'Del carrito al pago, en la misma pantalla.',
      pie: 'Demo funcional',
      dur: 2.4,
    },
    tramos: [
      { desde: 'agregar', hasta: 'checkout', capa: { titulo: 'Carrito', detalle: 'Se guarda aunque cierres la pestaña' } },
      { desde: 'checkout', hasta: 'entrega', capa: { titulo: 'Datos del comprador', detalle: 'Sin registro obligatorio' } },
      { desde: 'entrega', hasta: 'fin', capa: { titulo: 'Retiro o envío', detalle: 'Y pago con Mercado Pago' } },
    ],
    cierre: CIERRE_GENERAL,
  },

  /* ── 7 · Panel administrativo ────────────────────────────────────────── */
  {
    id: 'reel-07-panel-administrativo',
    fuente: 'panel',
    apertura: {
      etiqueta: 'Panel administrativo',
      titulo: 'Todo el<br>negocio<br><em class="violeta">en un panel</em>',
      subtitulo: 'Turnos, productos, categorías y reseñas. Sin depender de nadie.',
      pie: 'Demo funcional',
      dur: 2.6,
    },
    tramos: [
      { desde: 'dashboard', hasta: 'turnos', capa: { titulo: 'Dashboard', detalle: 'Turnos de hoy, servicios y clientes' } },
      { desde: 'turnos', hasta: 'productos', capa: { titulo: 'Agenda de turnos', detalle: 'Confirmar, cancelar y controlar la seña' } },
      { desde: 'productos', hasta: 'categorias', capa: { titulo: 'Productos', detalle: 'Precio, stock y foto desde la PC' } },
      { desde: 'categorias', hasta: 'resenas', capa: { titulo: 'Categorías', detalle: 'Para ordenar el catálogo' } },
      { desde: 'resenas', hasta: 'fin', capa: { titulo: 'Reseñas', detalle: 'Se publican en la web al activarlas' } },
    ],
    cierre: CIERRE_GENERAL,
  },

  /* ── 8 · Gestión de barberos ─────────────────────────────────────────── */
  {
    id: 'reel-08-gestion-de-barberos',
    fuente: 'gestionBarberos',
    apertura: {
      etiqueta: 'Gestión del equipo',
      titulo: 'Sumar un<br>barbero:<br><em class="violeta">30 segundos</em>',
      subtitulo: 'Se carga en el panel y aparece solo en la web y en la reserva.',
      pie: 'Demo funcional',
      dur: 2.5,
    },
    tramos: [
      { desde: 'equipo', hasta: 'formulario', capa: { titulo: 'El equipo actual', detalle: 'Editar, ocultar o dar de alta' } },
      { desde: 'formulario', hasta: 'alta', vel: 1.35, capa: { titulo: 'Nombre, especialidad y días', detalle: 'Con foto y bio opcionales' } },
      { desde: 'alta', hasta: 'fin', capa: { titulo: 'Listo', detalle: 'Ya se puede reservar con él' } },
    ],
    cierre: {
      titulo: 'El panel manda,<br>la web obedece',
      lineas: ['Alta y baja del equipo', 'Cuenta propia para cada barbero', 'Sin tocar el código'],
      cta: 'Escribinos por DM',
      dur: 3.0,
    },
  },

  /* ── 9 · Agenda y calendario ─────────────────────────────────────────── */
  {
    id: 'reel-09-agenda-y-calendario',
    fuente: 'agenda',
    apertura: {
      etiqueta: 'Agenda',
      titulo: 'La semana<br>entera<br><em class="violeta">de un vistazo</em>',
      subtitulo: 'Lista de turnos y calendario semanal por barbero.',
      pie: 'Demo funcional',
      dur: 2.4,
    },
    tramos: [
      { desde: 'lista', hasta: 'calendario', capa: { titulo: 'Lista de turnos', detalle: 'Filtros por estado y por fecha' } },
      { desde: 'calendario', hasta: 'fin', capa: { titulo: 'Calendario semanal', detalle: 'Un color por barbero' } },
    ],
    cierre: CIERRE_GENERAL,
  },

  /* ── 10 · Finanzas ───────────────────────────────────────────────────── */
  {
    id: 'reel-10-finanzas',
    fuente: 'finanzas',
    apertura: {
      etiqueta: 'Panel financiero',
      titulo: 'Cuánto<br>entra y<br><em class="violeta">cuánto sale</em>',
      subtitulo: 'Ingresos, egresos y balance, mes a mes.',
      pie: 'Demo funcional · datos de ejemplo',
      dur: 2.6,
    },
    tramos: [
      { desde: 'kpis', hasta: 'grafico', capa: { titulo: 'Ingresos, egresos y balance', detalle: 'Del mes y acumulado' } },
      { desde: 'grafico', hasta: 'categorias', capa: { titulo: 'Últimos 6 meses', detalle: 'Comparación mes a mes' } },
      { desde: 'categorias', hasta: 'transacciones', capa: { titulo: 'En qué se va la plata', detalle: 'Egresos por categoría' } },
      { desde: 'transacciones', hasta: 'fin', capa: { titulo: 'Cada movimiento', detalle: 'Los turnos y pedidos se registran solos' } },
    ],
    cierre: {
      titulo: 'Números claros,<br>decisiones claras',
      lineas: ['Ingresos y egresos', 'Gráficos por mes y categoría', 'Registro automático'],
      cta: 'Escribinos por DM',
      dur: 3.0,
    },
  },

  /* ── 11 · Experiencia del cliente ────────────────────────────────────── */
  {
    id: 'reel-11-experiencia-del-cliente',
    fuente: 'cliente',
    apertura: {
      etiqueta: 'Del lado del cliente',
      titulo: 'El cliente<br>también<br><em class="violeta">tiene panel</em>',
      subtitulo: 'Ve sus turnos, el estado de cada uno y puede cancelar.',
      pie: 'Demo funcional',
      dur: 2.4,
    },
    tramos: [
      { desde: 'panel', hasta: 'misTurnos', capa: { titulo: 'Su cuenta', detalle: 'Reservar, ver turnos y comprar' } },
      { desde: 'misTurnos', hasta: 'fin', capa: { titulo: 'Mis turnos', detalle: 'Estado, barbero, servicio y cancelación' } },
    ],
    cierre: CIERRE_GENERAL,
  },

  /* ── 12 · Cobros y seña ──────────────────────────────────────────────── */
  {
    id: 'reel-12-cobros-y-sena',
    fuente: 'cobros',
    apertura: {
      etiqueta: 'Cobros',
      titulo: 'Menos<br>turnos<br><em class="violeta">caídos</em>',
      subtitulo: 'El turno se confirma con una seña pagada por adelantado.',
      pie: 'Demo funcional',
      dur: 2.5,
    },
    tramos: [
      { desde: 'cobros', hasta: 'senas', capa: { titulo: 'Mercado Pago integrado', detalle: 'Se conecta a la cuenta del propio negocio' } },
      { desde: 'senas', hasta: 'fin', capa: { titulo: 'Seña por turno', detalle: 'Con su método y su estado' } },
    ],
    cierre: {
      titulo: 'Cobrás la seña<br>al reservar',
      lineas: ['Mercado Pago o transferencia', 'Estado de cada seña', 'Se registra en finanzas'],
      cta: 'Escribinos por DM',
      dur: 3.0,
    },
  },

  /* ── 13 · Panel del barbero ──────────────────────────────────────────── */
  {
    id: 'reel-13-acceso-por-rol',
    fuente: 'barberoPanel',
    apertura: {
      etiqueta: 'Permisos',
      titulo: 'Cada uno<br>ve <em class="violeta">lo suyo</em>',
      subtitulo: 'El barbero entra a su agenda. No al stock, ni a los cobros, ni a las finanzas.',
      pie: 'Demo funcional',
      dur: 2.6,
    },
    tramos: [
      { desde: 'agenda', hasta: 'clientes', capa: { titulo: 'Mi agenda', detalle: 'Solo los turnos de ese barbero' } },
      { desde: 'clientes', hasta: 'fin', capa: { titulo: 'Clientes', detalle: 'Solo lectura' } },
    ],
    cierre: CIERRE_GENERAL,
  },
]
