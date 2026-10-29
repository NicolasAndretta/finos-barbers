"use client";

// ============================================================
// Preparación de fotos EN EL CELULAR, antes de subirlas (Fase 4b).
// Traído de Código Rojo y 369, donde ya anda en producción.
//
// Por qué existe: una foto de celular moderno pesa 5-12 MB y mide
// 4000×3000. Subida tal cual:
//   · con datos móviles tarda una eternidad y se corta sola;
//   · el servidor la rebota por tamaño (hasta la Fase 4b, cualquier foto de
//     más de 1 MB fallaba con un error genérico: era el tope de Next).
//
// Achicando acá, sube ~300 KB en vez de 8 MB: entra rápido, no se corta, y
// al servidor le queda un trabajo liviano (que igual hace: ver lib/imagenes.ts).
// ============================================================

/**
 * Lado máximo que se sube: el mismo al que el servidor la va a reducir igual
 * (LADO_MAX en `lib/imagenes.ts`). Mandar más grande es pagar datos móviles
 * por píxeles que se tiran del otro lado.
 */
const LADO_MAX = 1600;
/** Calidad del JPEG que viaja. No es la final: el servidor la pasa a WebP. */
const CALIDAD = 0.85;
/** Techo del archivo original: más que esto es un video o un error. */
const MAX_ORIGINAL = 30 * 1024 * 1024;
/** Debajo de esto y ya chica, se sube tal cual (no vale la pena recomprimir). */
const YA_ESTA_BIEN = 900 * 1024;

/** Error con mensaje listo para mostrarle al usuario. */
export class ImagenInvalida extends Error {}

function esHeic(file: File): boolean {
  return /image\/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

/**
 * Decodifica el archivo respetando la orientación de la cámara.
 *
 * IMPORTANTE — por qué se pide el achique acá y no después: la cámara trasera
 * de un celular moderno saca fotos de 48 MP o más. Decodificar eso completo son
 * ~200 MB de RAM, y el navegador del celular se queda sin memoria: la pestaña
 * muere y la subida aparece como "se cortó la conexión". Pasándole
 * `resizeWidth`/`resizeHeight`, el navegador achica MIENTRAS decodifica y nunca
 * arma la imagen entera en memoria (la lección de 369).
 */
async function decodificar(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      let bmp = await createImageBitmap(file, {
        imageOrientation: "from-image",
        resizeWidth: LADO_MAX,
        resizeQuality: "high",
      });
      // Vertical: el lado largo es el alto, así que hay que limitar por ahí.
      if (bmp.height > LADO_MAX) {
        bmp.close();
        bmp = await createImageBitmap(file, {
          imageOrientation: "from-image",
          resizeHeight: LADO_MAX,
          resizeQuality: "high",
        });
      }
      return bmp;
    } catch {
      // Plan B: sin las opciones de achique (navegador viejo).
      try {
        return await createImageBitmap(file, { imageOrientation: "from-image" });
      } catch {
        // Plan C abajo.
      }
    }
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("no se pudo decodificar"));
    };
    img.src = url;
  });
}

function medidas(src: ImageBitmap | HTMLImageElement): { w: number; h: number } {
  return src instanceof HTMLImageElement
    ? { w: src.naturalWidth, h: src.naturalHeight }
    : { w: src.width, h: src.height };
}

/**
 * Valida y achica una foto elegida en el panel. Devuelve el archivo listo para
 * subir, o tira `ImagenInvalida` con un mensaje que se puede mostrar tal cual.
 *
 * `transparencia` (para los logos, 0017): se achica en WebP (o PNG, si el
 * navegador no sabe WebP), que guardan lo transparente. En JPEG, un logo con
 * fondo transparente quedaría sobre un fondo negro.
 */
export async function prepararFoto(original: File, { transparencia = false }: { transparencia?: boolean } = {}): Promise<File> {
  if (original.size === 0) {
    throw new ImagenInvalida("El archivo está vacío. Probá elegirlo de nuevo.");
  }
  if (!original.type.startsWith("image/") && !esHeic(original)) {
    throw new ImagenInvalida("Eso no es una foto. Elegí una imagen de la galería.");
  }
  if (original.size > MAX_ORIGINAL) {
    const mb = Math.round(original.size / 1024 / 1024);
    throw new ImagenInvalida(`La foto pesa ${mb} MB y es demasiado. ¿Seguro que no elegiste un video?`);
  }

  let fuente: ImageBitmap | HTMLImageElement;
  try {
    fuente = await decodificar(original);
  } catch {
    if (esHeic(original)) {
      throw new ImagenInvalida(
        "La foto está en formato HEIC y este navegador no la puede leer. " +
          "En el iPhone: Ajustes → Cámara → Formatos → 'Más compatible', y sacala de nuevo."
      );
    }
    throw new ImagenInvalida("No se pudo abrir esa foto. Puede estar dañada o a medio descargar.");
  }

  const { w, h } = medidas(fuente);
  if (!w || !h) {
    throw new ImagenInvalida("No se pudo leer el tamaño de la foto.");
  }

  const escala = Math.min(1, LADO_MAX / Math.max(w, h));

  // Ya es chica y liviana: no tiene sentido recomprimirla y perder calidad.
  if (escala === 1 && original.size <= YA_ESTA_BIEN) {
    if (fuente instanceof ImageBitmap) fuente.close();
    return original;
  }

  const destinoW = Math.round(w * escala);
  const destinoH = Math.round(h * escala);
  const canvas = document.createElement("canvas");
  canvas.width = destinoW;
  canvas.height = destinoH;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    if (fuente instanceof ImageBitmap) fuente.close();
    throw new ImagenInvalida("El navegador no pudo procesar la foto.");
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(fuente, 0, 0, destinoW, destinoH);
  if (fuente instanceof ImageBitmap) fuente.close();

  const aBlob = (calidad: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, transparencia ? "image/webp" : "image/jpeg", calidad));

  let blob = await aBlob(CALIDAD);
  // Red de seguridad: si aun achicada sigue pesando (fotos con mucho detalle),
  // se recomprime más fuerte. Vale más que entre a que se vea un 2% mejor.
  if (blob && blob.size > 1.5 * 1024 * 1024) {
    const masChica = await aBlob(0.7);
    if (masChica && masChica.size < blob.size) blob = masChica;
  }
  if (!blob) {
    throw new ImagenInvalida("No se pudo preparar la foto para subir.");
  }

  // El canvas ya aplicó la orientación, así que el archivo sale derecho y sin
  // metadatos (también sin la ubicación GPS de la foto). El servidor igual los
  // vuelve a sacar: no confía en que esto haya corrido.
  const tipo = blob.type || "image/jpeg";
  const extension = tipo === "image/webp" ? "webp" : tipo === "image/png" ? "png" : "jpg";
  return new File([blob], `foto-${Date.now()}.${extension}`, { type: tipo, lastModified: Date.now() });
}
