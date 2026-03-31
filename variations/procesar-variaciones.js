const fs = require('fs');
const path = require('path');

/**
 * Procesa el CSV de variaciones y expande cada fila según sus variaciones
 */
function procesarVariaciones() {
  // Leer siempre el CSV de la misma carpeta del script
  const inputFile = path.join(__dirname, 'variaciones.csv');
  const outputFile = path.join(__dirname, 'variaciones_expandido.csv');
  const erroresFile = path.join(__dirname, 'variaciones_errores.csv');

  console.log('📖 Leyendo archivo:', inputFile);
  
  // Leer el archivo completo con codificación UTF-8 para conservar caracteres especiales
  const contenido = fs.readFileSync(inputFile, { encoding: 'utf8' });
  const lineas = contenido.split('\n');
  
  if (lineas.length === 0) {
    console.error('❌ El archivo está vacío');
    return;
  }

  // Leer header
  const header = lineas[0];
  const columnas = parseCSVLine(header);
  
  // Encontrar el índice de la columna VARIACIONES
  const indiceVariaciones = columnas.findIndex(col => col === 'VARIACIONES');
  
  if (indiceVariaciones === -1) {
    console.error('❌ No se encontró la columna VARIACIONES');
    return;
  }

  console.log(`✅ Columna VARIACIONES encontrada en posición ${indiceVariaciones}`);

  // Crear nuevo header reemplazando VARIACIONES por VARIANTE, PRECIO, STOCK
  const nuevoHeader = [...columnas];
  nuevoHeader.splice(indiceVariaciones, 1, 'VARIANTE', 'PRECIO', 'STOCK');
  
  // Calcular el número esperado de columnas (original - 1 + 3)
  const numColumnasEsperadas = columnas.length - 1 + 3;
  
  const filasExpandidas = [nuevoHeader.map(col => escapeCSVValue(col)).join(',')];
  const headerErrores = [...columnas, 'MOTIVO_ERROR'];
  const filasErroresCsv = [headerErrores.map(col => escapeCSVValue(col)).join(',')];
  
  let totalFilasOriginales = 0;
  let totalFilasExpandidas = 0;
  let totalFilasOmitidasPorJsonInvalido = 0;

  // Procesar cada fila (empezar desde 1 para saltar el header)
  for (let i = 1; i < lineas.length; i++) {
    const linea = lineas[i].trim();
    if (!linea) continue; // Saltar líneas vacías

    try {
      const valores = parseCSVLine(linea);
      
      if (valores.length !== columnas.length) {
        console.warn(`⚠️  Línea ${i + 1}: número de columnas no coincide, saltando...`);
        continue;
      }

      totalFilasOriginales++;
      
      // Obtener el valor de VARIACIONES
      const variacionesStr = valores[indiceVariaciones];
      
      // Parsear el JSON de variaciones
      let variaciones = [];
      try {
        // El CSV tiene comillas dobles escapadas (""), necesitamos limpiarlas
        let cleanedStr = variacionesStr;
        
        // Si el string está envuelto en comillas externas, quitarlas
        if (cleanedStr.startsWith('"') && cleanedStr.endsWith('"')) {
          cleanedStr = cleanedStr.slice(1, -1);
        }
        
        // Reemplazar comillas dobles escapadas por comillas simples
        cleanedStr = cleanedStr.replace(/""/g, '"');
        
        variaciones = JSON.parse(cleanedStr);
        
        // Verificar que sea un array
        if (!Array.isArray(variaciones)) {
          console.warn(`⚠️  Línea ${i + 1}: VARIACIONES no es un array, convirtiendo...`);
          variaciones = [variaciones];
        }
      } catch (parseError) {
        console.warn(`⚠️  Línea ${i + 1}: Error parseando JSON de variaciones:`, parseError.message);
        // Si no se puede parsear, omitir este registro completo
        totalFilasOmitidasPorJsonInvalido++;
        const filaError = [...valores.map(v => escapeCSVValue(v)), escapeCSVValue(parseError.message)];
        filasErroresCsv.push(filaError.join(','));
        continue;
      }

      // Si no hay variaciones o está vacío, crear una fila con valores vacíos
      if (!Array.isArray(variaciones) || variaciones.length === 0) {
        const nuevaFila = valores.map(v => escapeCSVValue(v));
        nuevaFila.splice(indiceVariaciones, 1, '', '', '');
        
        // Validar número de columnas
        if (nuevaFila.length !== numColumnasEsperadas) {
          console.warn(`⚠️  Línea ${i + 1}: Número de columnas incorrecto (${nuevaFila.length} vs ${numColumnasEsperadas}), ajustando...`);
          // Ajustar columnas si es necesario
          while (nuevaFila.length < numColumnasEsperadas) {
            nuevaFila.push('');
          }
          nuevaFila.splice(numColumnasEsperadas);
        }
        
        filasExpandidas.push(nuevaFila.join(','));
        totalFilasExpandidas++;
        continue;
      }

      // Crear una fila por cada variación
      // IMPORTANTE: Si hay 3 variaciones, se crearán 3 filas (una por cada variación)
      for (const variacion of variaciones) {
        // Crear copia de valores y escapar todos los valores
        const nuevaFila = valores.map(v => escapeCSVValue(v));
        
        // Extraer valores de la variación
        const variante = variacion.variation || variacion.variante || '';
        const precio = variacion.price || variacion.precio || '';
        const stock = variacion.availability || variacion.stock || '';
        
        // Reemplazar VARIACIONES por los 3 nuevos valores (VARIANTE, PRECIO, STOCK)
        nuevaFila.splice(indiceVariaciones, 1, 
          escapeCSVValue(variante),
          escapeCSVValue(String(precio)),
          escapeCSVValue(stock)
        );
        
        // Validar número de columnas
        if (nuevaFila.length !== numColumnasEsperadas) {
          console.warn(`⚠️  Línea ${i + 1}: Número de columnas incorrecto (${nuevaFila.length} vs ${numColumnasEsperadas}), ajustando...`);
          // Ajustar columnas si es necesario
          while (nuevaFila.length < numColumnasEsperadas) {
            nuevaFila.push('');
          }
          nuevaFila.splice(numColumnasEsperadas);
        }
        
        // Agregar esta fila al resultado (cada variación = una nueva fila)
        filasExpandidas.push(nuevaFila.join(','));
        totalFilasExpandidas++;
      }

    } catch (error) {
      console.error(`❌ Error procesando línea ${i + 1}:`, error.message);
    }
  }

  // Validar todas las filas antes de escribir
  console.log('\n🔍 Validando filas generadas...');
  let filasConError = 0;
  const filasValidadas = filasExpandidas.map((fila, idx) => {
    if (idx === 0) return fila; // Header
    
    const columnas = fila.split(',').filter((_, i, arr) => {
      // Contar comillas para determinar si estamos dentro de un campo
      let comillas = 0;
      for (let j = 0; j < i; j++) {
        const segmento = arr[j];
        comillas += (segmento.match(/"/g) || []).length;
      }
      return comillas % 2 === 0; // Solo contar si estamos fuera de comillas
    });
    
    // Usar parseCSVLine para contar correctamente
    const valores = parseCSVLine(fila);
    if (valores.length !== numColumnasEsperadas) {
      filasConError++;
      if (filasConError <= 5) { // Solo mostrar los primeros 5 errores
        console.warn(`⚠️  Fila ${idx}: ${valores.length} columnas (esperadas: ${numColumnasEsperadas})`);
      }
    }
    return fila;
  });

  if (filasConError > 0) {
    console.warn(`⚠️  Total de filas con número de columnas incorrecto: ${filasConError}`);
  } else {
    console.log('✅ Todas las filas tienen el número correcto de columnas');
  }

  // Escribir el archivo resultante con codificación UTF-8 para conservar caracteres especiales
  const contenidoFinal = filasValidadas.join('\n');
  // Usar UTF-8 con BOM para mejor compatibilidad con Excel
  const BOM = '\uFEFF';
  fs.writeFileSync(outputFile, BOM + contenidoFinal, { encoding: 'utf8' });
  
  // Escribir archivo de errores (registros omitidos por JSON inválido)
  const contenidoErrores = filasErroresCsv.join('\n');
  fs.writeFileSync(erroresFile, BOM + contenidoErrores, { encoding: 'utf8' });

  console.log('\n✅ Procesamiento completado:');
  console.log(`   📊 Filas originales: ${totalFilasOriginales}`);
  console.log(`   📊 Filas expandidas: ${totalFilasExpandidas}`);
  console.log(`   ⚠️  Filas omitidas por JSON inválido: ${totalFilasOmitidasPorJsonInvalido}`);
  console.log(`   💾 Archivo guardado en: ${outputFile}`);
  console.log(`   🧾 Archivo de errores: ${erroresFile}`);
}

/**
 * Parsea una línea CSV respetando comillas
 */
function parseCSVLine(linea) {
  const valores = [];
  let valorActual = '';
  let dentroComillas = false;
  
  for (let i = 0; i < linea.length; i++) {
    const char = linea[i];
    const siguienteChar = linea[i + 1];
    
    if (char === '"') {
      if (dentroComillas && siguienteChar === '"') {
        // Comilla escapada
        valorActual += '"';
        i++; // Saltar la siguiente comilla
      } else {
        // Toggle de comillas
        dentroComillas = !dentroComillas;
      }
    } else if (char === ',' && !dentroComillas) {
      // Fin del campo
      valores.push(valorActual);
      valorActual = '';
    } else {
      valorActual += char;
    }
  }
  
  // Agregar el último valor
  valores.push(valorActual);
  
  return valores;
}

/**
 * Escapa un valor para CSV
 * Conserva todos los caracteres especiales (ñ, á, é, í, ó, ú, ü, etc.)
 * Solo escapa lo necesario para formato CSV válido
 */
function escapeCSVValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  
  // Convertir a string sin hacer trim para conservar espacios importantes
  let stringValue = String(value);
  
  // Si está vacío, retornar vacío sin comillas
  if (stringValue === '') {
    return '';
  }
  
  // Conservar todos los caracteres especiales (ñ, á, é, í, ó, ú, ü, etc.)
  // Solo necesitamos escapar comillas dobles y envolver en comillas si:
  // - Contiene comillas
  // - Contiene comas
  // - Contiene saltos de línea
  
  const tieneComillas = stringValue.includes('"');
  const tieneComas = stringValue.includes(',');
  const tieneSaltosLinea = stringValue.includes('\n') || stringValue.includes('\r');
  
  // Si tiene caracteres que requieren escape, envolver en comillas
  if (tieneComillas || tieneComas || tieneSaltosLinea) {
    // Escapar comillas dobles (duplicarlas)
    const escaped = stringValue.replace(/"/g, '""');
    return '"' + escaped + '"';
  }
  
  // Si no tiene caracteres especiales que requieran escape, retornar tal cual
  // Esto conserva todos los caracteres especiales como ñ, á, é, í, ó, ú, ü, etc.
  return stringValue;
}

// Ejecutar
console.log('🚀 Iniciando procesamiento de variaciones...\n');
procesarVariaciones();
