
# Inventory Insights Analyzer

Herramienta especializada para el análisis de reportes **MB51** de SAP enriquecidos con factores de valoración. Permite identificar mermas, vencimientos y diferencias técnicas de inventario de forma automática.

## Cómo descargar el código (PASO A PASO)
1. En tu panel de la izquierda (**EXPLORER**), haz clic en la carpeta **`src`** para ver su contenido.
2. Adentro de `src`, haz clic en **`app`**.
3. Allí encontrarás el archivo principal **`page.tsx`**. Haz clic en él para copiar su código.

**Para descargar el proyecto completo (.zip):**
1. Mira la **barra superior** de esta ventana.
2. Busca el icono de una **nube con una flecha hacia abajo** justo a la izquierda del botón azul "Publish".
3. Haz clic allí para descargar todo el proyecto.

## Despliegue en Vercel (Paso a Paso)
1. **Sube a GitHub**: Crea un repositorio en tu cuenta de GitHub y sube los archivos que descargaste.
2. **Conecta con Vercel**:
   - Ve a [Vercel](https://vercel.com/new).
   - Haz clic en **"Continue with GitHub"** y selecciona tu repositorio.
3. **Configura la IA (Crucial)**:
   - En el paso "Configure Project", despliega la sección **Environment Variables**.
   - Agrega una variable llamada `GEMINI_API_KEY`.
   - Pega tu clave: `AIzaSyBZQaJlZLxXI3Larf_CSJX-6CgPKo5jWnM`.
4. **Deploy**: Haz clic en el botón azul. Vercel te entregará una URL pública.

## Integración con Google Sites
1. Abre tu **Google Site**.
2. En el panel "Insertar", selecciona la opción **"URL"**.
3. Pega la URL que te dio Vercel.

## Funcionalidades Principales
- **Análisis de Diferencias**: Consolidado automático de movimientos Z59, Z60, Z65 y Z66.
- **Detalle Técnico**: Tabla filtrada para diferencias de inventario con la **Cantidad Consolidada** de SAP (Ctd.en UM entrada).
- **Visualización Estratégica**: Gráficos por centro para Mermas, Vencimientos y Diferencias.
- **Recomendaciones IA**: Análisis automático de patrones logísticos con Gemini.
