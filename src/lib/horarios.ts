/**
 * src/lib/horarios.ts
 *
 * Las cuentas de los horarios (Fase 3b), sin base de datos ni pantalla: solo
 * funciones que reciben datos y devuelven resultados. Las usa el servidor
 * (qué horarios ofrecer) y el navegador (hasta qué día se puede elegir).
 *
 * Convenciones:
 *  - Una hora del día va como texto "HH:mm" (o "HH:mm:ss", como la devuelve la
 *    base) o como minutos desde las 00:00 (10:30 → 630).
 *  - Una fecha va como "AAAA-MM-DD", sin hora ni zona: un día del calendario.
 *  - Días de la semana: 0 = domingo, 1 = lunes ... 6 = sábado (como JavaScript
 *    y como la tabla `horarios`).
 */

export type Tramo = { desde: string; hasta: string }

export const NOMBRES_DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

/** Orden de la semana para mostrar: de lunes a domingo. */
export const SEMANA = [1, 2, 3, 4, 5, 6, 0]

/** "10:30" o "10:30:00" → 630 */
export function aMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

/** 630 → "10:30" */
export function aHora(minutos: number): string {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Qué día y qué hora es AHORA en la zona horaria del local
 * (por ejemplo "America/Argentina/Buenos_Aires"). El servidor puede estar en
 * otra zona: la hora que importa para "¿ya pasó?" es la del local.
 */
export function ahoraEnZona(zona: string, ahora: Date = new Date()): { fecha: string; minutos: number } {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(ahora)
  const p = (tipo: string) => partes.find((x) => x.type === tipo)?.value ?? '00'
  return { fecha: `${p('year')}-${p('month')}-${p('day')}`, minutos: Number(p('hour')) * 60 + Number(p('minute')) }
}

/** "2026-10-25" + 3 → "2026-10-28" (cuenta días del calendario, sin zonas). */
export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

/** "2026-10-25" → 0 (domingo) */
export function diaDeLaSemana(fecha: string): number {
  return new Date(`${fecha}T12:00:00Z`).getUTCDay()
}

/** Lo que tienen en común dos listas de tramos (el local abierto Y el profesional trabajando). */
export function interseccion(a: Tramo[], b: Tramo[]): Tramo[] {
  const resultado: Tramo[] = []
  for (const x of a) {
    for (const y of b) {
      const desde = Math.max(aMinutos(x.desde), aMinutos(y.desde))
      const hasta = Math.min(aMinutos(x.hasta), aMinutos(y.hasta))
      if (desde < hasta) resultado.push({ desde: aHora(desde), hasta: aHora(hasta) })
    }
  }
  return resultado.sort((p, q) => aMinutos(p.desde) - aMinutos(q.desde))
}

/**
 * Los horarios que se pueden ofrecer en un día.
 *  - tramos: cuándo está abierto (y trabaja el profesional);
 *  - ocupados: los turnos ya tomados, con su inicio y su fin;
 *  - duracion: lo que dura el servicio, en minutos;
 *  - desdeMinuto: el primer minuto permitido (para hoy: ahora + anticipación);
 *  - paso: cada cuánto se ofrece un horario (cada 15 minutos).
 * Un horario sirve si el servicio entra completo en un tramo (no se mete en
 * el hueco del mediodía) y no se pisa con ningún turno tomado.
 */
export function horariosLibres(opciones: {
  tramos: Tramo[]
  ocupados: { inicio: string; fin: string }[]
  duracion: number
  desdeMinuto?: number
  paso?: number
}): string[] {
  const { tramos, ocupados, duracion, desdeMinuto = 0, paso = 15 } = opciones
  const tomados = ocupados.map((o) => ({ inicio: aMinutos(o.inicio), fin: aMinutos(o.fin) }))
  const libres: string[] = []
  for (const tramo of tramos) {
    const fin = aMinutos(tramo.hasta)
    for (let inicio = aMinutos(tramo.desde); inicio + duracion <= fin; inicio += paso) {
      if (inicio < desdeMinuto) continue
      const terminaria = inicio + duracion
      // Dos turnos se pisan si uno empieza antes de que el otro termine, y al revés.
      const sePisa = tomados.some((o) => inicio < o.fin && terminaria > o.inicio)
      if (!sePisa) libres.push(aHora(inicio))
    }
  }
  return [...new Set(libres)].sort()
}

/**
 * El resumen de la semana para mostrar en la web: junta los días seguidos que
 * tienen el mismo horario.
 *   [{dia: "Lunes a Sábado", horas: "10:00 – 20:00"}, {dia: "Domingo", horas: "Cerrado"}]
 */
export function resumenSemanal(filas: { dia_semana: number; desde: string; hasta: string }[]): { dia: string; horas: string }[] {
  const textoDe = (dia: number) => {
    const delDia = filas
      .filter((f) => f.dia_semana === dia)
      .sort((a, b) => aMinutos(a.desde) - aMinutos(b.desde))
      .map((f) => `${aHora(aMinutos(f.desde))} – ${aHora(aMinutos(f.hasta))}`)
    return delDia.length ? delDia.join(' y ') : 'Cerrado'
  }
  const grupos: { dias: number[]; horas: string }[] = []
  for (const dia of SEMANA) {
    const horas = textoDe(dia)
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.horas === horas) ultimo.dias.push(dia)
    else grupos.push({ dias: [dia], horas })
  }
  return grupos.map((g) => ({
    dia: g.dias.length === 1
      ? NOMBRES_DIA[g.dias[0]]
      : g.dias.length === 2
        ? `${NOMBRES_DIA[g.dias[0]]} y ${NOMBRES_DIA[g.dias[1]]}`
        : `${NOMBRES_DIA[g.dias[0]]} a ${NOMBRES_DIA[g.dias[g.dias.length - 1]]}`,
    horas: g.horas,
  }))
}

/** Por qué no hay horarios para ofrecer un día (para explicarlo en pantalla). */
export type MotivoSinHorarios = 'cerrado' | 'no_atiende' | 'ausente' | 'pasado' | 'muy_adelante' | 'sin_lugar'

export const MENSAJE_SIN_HORARIOS: Record<MotivoSinHorarios, string> = {
  cerrado: 'Ese día el local está cerrado.',
  no_atiende: 'Ese día no atiende. Probá con otro día o con otra persona.',
  ausente: 'Ese día está de licencia. Probá con otro día o con otra persona.',
  pasado: 'Esa fecha ya pasó.',
  muy_adelante: 'Todavía no se puede reservar para esa fecha.',
  sin_lugar: 'No quedan horarios libres ese día.',
}
