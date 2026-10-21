const URL_CSV = 'https://raw.githubusercontent.com/OrellanoL/ProductosCatalogo/main/catalogo_consumo.csv';
const URL_CONSUMO_IMAGEN = 'https://raw.githubusercontent.com/OrellanoL/ProductosCatalogo/main/consumoinmediato.png';

let catalogoProductos = [];
let colaDeImpresion = [];

// Cargar el CSV al iniciar la página
async function cargarCatalogo() {
    try {
        const response = await fetch(URL_CSV);
        const data = await response.text();
        parsearCSV(data);
    } catch (error) {
        console.error("Error al cargar el catálogo de consumo:", error);
    }
}

function parsearCSV(texto) {
    const lineas = texto.split('\n');
    catalogoProductos = [];
    
    for (let i = 1; i < lineas.length; i++) {
        let linea = lineas[i].trim();
        if (!linea) continue;
        
        let columnas = linea.split(',');
        if (columnas.length >= 2) {
            let ean = columnas[0].trim().replace(/"/g, '');
            let descripcion = columnas[1].trim().replace(/"/g, '');
            catalogoProductos.push({ ean, descripcion });
        }
    }
}

// ==========================================
// PERSISTENCIA (LOCALSTORAGE)
// ==========================================
function cargarListaGuardada() {
    const guardado = localStorage.getItem('colaConsumoInmediato');
    if (guardado) {
        try {
            colaDeImpresion = JSON.parse(guardado);
            actualizarListaYVisualizacion();
        } catch (e) {
            console.error("Error al recuperar los datos guardados", e);
        }
    }
}

function guardarEnMemoria() {
    localStorage.setItem('colaConsumoInmediato', JSON.stringify(colaDeImpresion));
}

// Control del acordeón / desplegable del formulario
const formContainer = document.getElementById('formularioContainer');

document.getElementById('btnToggleForm').addEventListener('click', () => {
    formContainer.style.display = 'block';
    document.getElementById('btnToggleForm').style.display = 'none';
    document.getElementById('inputEan').focus();
});

document.getElementById('btnCancelar').addEventListener('click', () => {
    formContainer.style.display = 'none';
    document.getElementById('btnToggleForm').style.display = 'block';
    limpiarFormulario();
});

function limpiarFormulario() {
    document.getElementById('inputEan').value = '';
    document.getElementById('inputDescripcion').value = '';
    document.getElementById('inputPrecioAnterior').value = '';
    document.getElementById('inputDescuento').value = '';
}

// Buscar EAN al escribir o escanear
document.getElementById('inputEan').addEventListener('input', (e) => {
    const eanIngresado = e.target.value.trim();
    const encontrado = catalogoProductos.find(p => p.ean === eanIngresado);
    
    if (encontrado) {
        document.getElementById('inputDescripcion').value = encontrado.descripcion.toUpperCase();
    }
});

let html5QrcodeScanner = null;
let escanerActivo = false;

function alternarCamaraConsumo() {
    const readerDiv = document.getElementById("reader");
    if (escanerActivo) {
        detenerCamaraConsumo();
        return;
    }

    readerDiv.style.display = "block";
    html5QrcodeScanner = new Html5Qrcode("reader");

    html5QrcodeScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
            // Éxito al escanear
            const eanLimpio = decodedText.trim();
            document.getElementById('inputEan').value = eanLimpio;
            
            // Buscar automáticamente en el catálogo cargado
            const encontrado = catalogoProductos.find(p => p.ean === eanLimpio);
            if (encontrado) {
                document.getElementById('inputDescripcion').value = encontrado.descripcion.toUpperCase();
            }
            
            detenerCamaraConsumo();
        },
        (errorMessage) => {
            // Ignorar errores de frame mientras busca el código
        }
    ).catch(err => {
        alert("No se pudo iniciar la cámara: " + err);
        readerDiv.style.display = "none";
        escanerActivo = false;
    });

    escanerActivo = true;
}

function detenerCamaraConsumo() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().then(() => {
            document.getElementById("reader").style.display = "none";
            escanerActivo = false;
            html5QrcodeScanner = null;
        }).catch(err => {
            console.error("Error al detener la cámara", err);
        });
    }
}

// Manejar cambios en el selector de tipo de cartel
document.getElementById('tipoCartel').addEventListener('change', (e) => {
    const tipo = e.target.value;
    const grupoDescuento = document.getElementById('grupoDescuento');
    const labelPrecio = document.getElementById('labelPrecio');

    if (tipo === '2x1') {
        grupoDescuento.style.display = 'none';
        labelPrecio.textContent = "Precio Regular (Unitario) ($):";
    } else {
        grupoDescuento.style.display = 'block';
        labelPrecio.textContent = "Precio Regular / Anterior ($):";
    }
});

// ==========================================
// NAVEGACIÓN CON TECLA ENTER ENTRE CAMPOS
// ==========================================
const camposFormulario = ['inputEan', 'inputDescripcion', 'tipoCartel', 'inputPrecioAnterior', 'inputDescuento', 'btnGuardar'];

camposFormulario.forEach((id, index) => {
    const elemento = document.getElementById(id);
    if (elemento) {
        elemento.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                
                // Si estamos en el precio y el cartel es 2x1, saltamos directo al botón Guardar
                if (id === 'inputPrecioAnterior' && document.getElementById('tipoCartel').value === '2x1') {
                    document.getElementById('btnGuardar').focus();
                    return;
                }

                let siguienteIndex = index + 1;
                while (siguienteIndex < camposFormulario.length) {
                    const sigId = camposFormulario[siguienteIndex];
                    const sigEl = document.getElementById(sigId);
                    
                    // Si el campo de descuento está oculto por ser 2x1, lo salteamos
                    if (sigId === 'inputDescuento' && document.getElementById('tipoCartel').value === '2x1') {
                        siguienteIndex++;
                        continue;
                    }
                    
                    if (sigEl) {
                        sigEl.focus();
                        break;
                    }
                    siguienteIndex++;
                }
            }
        });
    }
});

function cargarImagen(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
    });
}

function formatearPrecio(num) {
    return Number(num).toLocaleString('es-AR');
}

// Botón Guardar
document.getElementById('btnGuardar').addEventListener('click', async () => {
    const producto = document.getElementById('inputDescripcion').value.trim() || "PRODUCTO SIN NOMBRE";
    const ean = document.getElementById('inputEan').value.trim();
    const tipo = document.getElementById('tipoCartel').value;
    const precioBase = parseFloat(document.getElementById('inputPrecioAnterior').value) || 0;
    
    let precioFinal = precioBase;
    let descuento = 0;

    if (tipo === 'cupon') {
        descuento = parseFloat(document.getElementById('inputDescuento').value) || 0;
        precioFinal = Math.max(0, precioBase - descuento);
    }

    colaDeImpresion.push({
        producto,
        ean,
        tipo,
        precioAnt: precioBase,
        precioFin: precioFinal
    });

    guardarEnMemoria();
    await actualizarListaYVisualizacion();

    // ✔️ NUEVO COMPORTAMIENTO: Mantiene el formulario abierto y limpia solo los campos
    document.getElementById('inputEan').value = '';
    document.getElementById('inputDescripcion').value = '';
    document.getElementById('inputPrecioAnterior').value = '';
    document.getElementById('inputDescuento').value = '';
    document.getElementById('inputEan').focus(); // Deja el cursor listo para escanear el siguiente producto
});

async function actualizarListaYVisualizacion() {
    const listaUI = document.getElementById('listaProductosUI');
    const contador = document.getElementById('contadorProductos');
    
    contador.textContent = colaDeImpresion.length;

    if (colaDeImpresion.length === 0) {
        listaUI.innerHTML = '<li style="color: #666;">No hay productos agregados todavía.</li>';
        document.getElementById('hojasImpresionContainer').innerHTML = '';
        document.getElementById('botonesAccion').style.display = 'none';
        return;
    }

    let html = '';
    colaDeImpresion.forEach((item, index) => {
        html += `<li style="margin-bottom: 8px; display: flex; align-items: center; background: #fff; padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
                 <button onclick="eliminarItem(${index})" style="background:#d32f2f; color:white; border:none; width: 24px; height: 24px; border-radius: 50%; cursor:pointer; margin-right: 10px; font-weight: bold; display: flex; align-items: center; justify-content: center; flex-shrink: 0;" title="Eliminar producto">✕</button>
                 <span style="text-align: left; font-size: 14px;"><b>${item.producto}</b> (${item.tipo.toUpperCase()}) - EAN: ${item.ean}</span>
                 </li>`;
    });
    listaUI.innerHTML = html;

    await generarVistaPreviaIndividuales();
}

window.eliminarItem = async function(index) {
    colaDeImpresion.splice(index, 1);
    guardarEnMemoria();
    await actualizarListaYVisualizacion();
};

document.getElementById('btnLimpiarLista').addEventListener('click', async () => {
    colaDeImpresion = [];
    guardarEnMemoria();
    await actualizarListaYVisualizacion();
});

// VISTA PREVIA: Muestra solo los carteles individuales en el celu
async function generarVistaPreviaIndividuales() {
    const contenedorHojas = document.getElementById('hojasImpresionContainer');
    contenedorHojas.innerHTML = '';

    const imgConsumo = await cargarImagen(URL_CONSUMO_IMAGEN);

    for (let i = 0; i < colaDeImpresion.length; i++) {
        const item = colaDeImpresion[i];

        const canvas = document.createElement('canvas');
        canvas.width = 700;
        canvas.height = 245;
        canvas.style.cssText = "max-width:100%; border:1px solid #ccc; margin-bottom:10px; background: #fff; border-radius: 4px;";
        contenedorHojas.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (item.tipo === 'cupon') {
            dibujarBloqueCuadrupleCupon(ctx, 0, 0, 700, 245, item.producto, item.ean, item.precioAnt, item.precioFin, imgConsumo);
        } else {
            dibujarBloqueCuadruple2x1(ctx, 0, 0, 700, 245, item.producto, item.ean, item.precioAnt, imgConsumo);
        }
    }

    document.getElementById('botonesAccion').style.display = 'block';
}

// Funciones de dibujo
function dibujarBloqueCuadrupleCupon(ctx, x, y, w, h, producto, ean, precioAnt, precioFin, imgConsumo) {
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1.8;
    ctx.strokeRect(x, y, w, h);

    if (imgConsumo) {
        const imgW = 260;
        const imgH = (imgConsumo.height / imgConsumo.width) * imgW;
        ctx.drawImage(imgConsumo, x + 10, y + (h - imgH) / 2, imgW, imgH);
    }

    ctx.fillStyle = "#000000";
    ctx.font = "900 19px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    
    let palabras = producto.split(' ');
    let linea = "";
    let textoY = y + 12;
    let maxWidth = 470;
    let startX = x + 210;

    for (let i = 0; i < palabras.length; i++) {
        let testLinea = linea + palabras[i] + " ";
        if (ctx.measureText(testLinea).width > maxWidth && i > 0) {
            ctx.fillText(linea, startX, textoY);
            linea = palabras[i] + " ";
            textoY += 22;
        } else {
            linea = testLinea;
        }
    }
    ctx.fillText(linea, startX, textoY);

    ctx.font = "bold 12px sans-serif";
    ctx.fillStyle = "#444444";
    ctx.fillText("PRECIO ANTERIOR", startX, y + 62);
    
    ctx.font = "900 20px sans-serif";
    ctx.fillStyle = "#000000";
    ctx.fillText(`$${formatearPrecio(precioAnt)}`, startX + 125, y + 59);
    
    ctx.strokeStyle = "#e50012";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX + 120, y + 70);
    ctx.lineTo(startX + 215, y + 70);
    ctx.stroke();

    ctx.font = "900 62px 'Impact', 'Arial Black', sans-serif";
    ctx.fillStyle = "#000000";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`$${formatearPrecio(precioFin)}`, startX + 135, y + 84);

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
    ctx.strokeRect(startX, y + 165, 470, 48);

    ctx.font = "bold 10px sans-serif";
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(`EAN: ${ean}`, startX + 235, y + 178);

    ctx.font = "900 9px sans-serif";
    ctx.fillText("PRECIO FINAL CON ETIQUETA DE DESCUENTO CONSUMO INMEDIATO", startX + 235, y + 194);
    ctx.fillText("VÁLIDO HASTA AGOTAR PRODUCTO SEÑALIZADO", startX + 235, y + 205);
}

function dibujarBloqueCuadruple2x1(ctx, x, y, w, h, producto, ean, precioUnitario, imgConsumo) {
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1.8;
    ctx.strokeRect(x, y, w, h);

    if (imgConsumo) {
        const imgW = 260;
        const imgH = (imgConsumo.height / imgConsumo.width) * imgW;
        ctx.drawImage(imgConsumo, x + 10, y + (h - imgH) / 2, imgW, imgH);
    }

    ctx.fillStyle = "#000000";
    ctx.font = "900 19px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    
    let palabras = producto.split(' ');
    let linea = "";
    let textoY = y + 12;
    let maxWidth = 470;
    let startX = x + 210;

    for (let i = 0; i < palabras.length; i++) {
        let testLinea = linea + palabras[i] + " ";
        if (ctx.measureText(testLinea).width > maxWidth && i > 0) {
            ctx.fillText(linea, startX, textoY);
            linea = palabras[i] + " ";
            textoY += 22;
        } else {
            linea = testLinea;
        }
    }
    ctx.fillText(linea, startX, textoY);

    ctx.font = "bold 15px sans-serif";
    ctx.fillStyle = "#e50012";
    ctx.fillText("¡LLEVANDO 2, PAGÁS 1!", startX, y + 58);

    ctx.font = "900 55px 'Impact', 'Arial Black', sans-serif";
    ctx.fillStyle = "#000000";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`$${formatearPrecio(precioUnitario)}`, startX + 75, y + 84);

    ctx.font = "bold 13px sans-serif";
    ctx.fillStyle = "#444444";
    ctx.fillText("PRECIO FINAL", startX + 245, y + 115);

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
    ctx.strokeRect(startX, y + 165, 470, 48);

    ctx.font = "bold 10px sans-serif";
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(`EAN: ${ean}`, startX + 235, y + 180);

    ctx.font = "900 9px sans-serif";
    ctx.fillText("PROMOCIÓN 2X1 - CONSUMO INMEDIATO", startX + 235, y + 194);
    ctx.fillText("VÁLIDO HASTA AGOTAR PRODUCTO SEÑALIZADO", startX + 235, y + 205);
}

// Generador de hojas A4 ocultas para Impresión / PDF
async function generarCanvasA4Ocultos() {
    const imgConsumo = await cargarImagen(URL_CONSUMO_IMAGEN);
    const paginasCanvas = [];

    const paginasItems = [];
    for (let i = 0; i < colaDeImpresion.length; i += 4) {
        paginasItems.push(colaDeImpresion.slice(i, i + 4));
    }

    for (let pIndex = 0; pIndex < paginasItems.length; pIndex++) {
        const canvasA4 = document.createElement('canvas');
        canvasA4.width = 800;
        canvasA4.height = 1130;
        const ctx = canvasA4.getContext('2d');

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvasA4.width, canvasA4.height);

        const itemsHoja = paginasItems[pIndex];
        const coordenadas = [
            { x: 50, y: 25 },
            { x: 50, y: 285 },
            { x: 50, y: 545 },
            { x: 50, y: 805 }
        ];

        for (let i = 0; i < itemsHoja.length; i++) {
            const item = itemsHoja[i];
            const coord = coordenadas[i];
            const w = 700;
            const h = 245;

            if (item.tipo === 'cupon') {
                dibujarBloqueCuadrupleCupon(ctx, coord.x, coord.y, w, h, item.producto, item.ean, item.precioAnt, item.precioFin, imgConsumo);
            } else {
                dibujarBloqueCuadruple2x1(ctx, coord.x, coord.y, w, h, item.producto, item.ean, item.precioAnt, imgConsumo);
            }
        }
        paginasCanvas.push(canvasA4);
    }
    return paginasCanvas;
}

// Botón 1: Imprimir PC
document.getElementById('btnImprimirPC').addEventListener('click', async () => {
    await ejecutarImpresionOExportacion();
});

// Botón 2: Descargar PDF (Descarga directa)
document.getElementById('btnDescargarPDF').addEventListener('click', async () => {
    if (colaDeImpresion.length === 0) return;

    const canvasA4List = await generarCanvasA4Ocultos();

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < canvasA4List.length; i++) {
        const canvas = canvasA4List[i];
        const imgData = canvas.toDataURL('image/png');

        if (i > 0) {
            pdf.addPage();
        }

        pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
    }

    pdf.save('Carteles_Consumo_Inmediato.pdf');
});

async function ejecutarImpresionOExportacion() {
    if (colaDeImpresion.length === 0) return;

    const canvasA4List = await generarCanvasA4Ocultos();

    const ventanaImpresion = window.open('', '_blank');
    ventanaImpresion.document.write(`
        <html>
            <head>
                <title>Carteles Consumo Inmediato - A4</title>
                <style>
                    body { margin: 0; text-align: center; background: white; }
                    @page { size: A4; margin: 0; }
                    img { display: block; margin: 0 auto; width: 100%; max-width: 800px; page-break-after: always; break-after: page; }
                </style>
            </head>
            <body>
    `);

    canvasA4List.forEach(canvas => {
        const dataUrl = canvas.toDataURL('image/png');
        ventanaImpresion.document.write(`<img src="dataUrl"/>`.replace('dataUrl', dataUrl));
    });

    ventanaImpresion.document.write(`
                <script>
                    window.onload = function() { 
                        window.print(); 
                    }
                </script>
            </body>
        </html>
    `);
    ventanaImpresion.document.close();
}

// Inicializar cargando el CSV y recuperando la memoria local
cargarCatalogo();
cargarListaGuardada();
