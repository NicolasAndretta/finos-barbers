/**
 * tools/demo/brand/iconos.js — iconos SVG para las portadas de destacadas.
 */
const trazo = (d) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="#C4B5FD" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`

module.exports = {
  proyectos: trazo('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  sistemas: trazo('<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 20h8M12 18v2M7 9h4M7 12h6"/>'),
  turnos: trazo('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18M8 14h3M8 17h6"/>'),
  tienda: trazo('<path d="M4 8h16l-1 12H5z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'),
  panel: trazo('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 9v11"/>'),
  cobros: trazo('<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M2.5 10h19M6 14.5h3"/>'),
  proceso: trazo('<path d="M12 3a9 9 0 1 1-8.5 6"/><path d="M3 4v5h5"/><path d="M12 8v4l3 2"/>'),
  contacto: trazo('<path d="M4 5h16v14H4z"/><path d="m4 7 8 6 8-6"/>'),
}
