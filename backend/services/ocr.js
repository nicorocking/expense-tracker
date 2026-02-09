const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const fs = require('fs');

// Pool de workers para OCR más rápido
let ocrWorker = null;

async function initOCRWorker() {
  if (!ocrWorker) {
    try {
      ocrWorker = await Tesseract.createWorker('spa', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });
      console.log('OCR Worker initialized');
    } catch (error) {
      console.error('Error initializing OCR worker:', error);
      ocrWorker = null;
    }
  }
  return ocrWorker;
}

async function processInvoiceImage(imagePath) {
  try {
    console.log(`Processing invoice image: ${imagePath}`);
    
    // Verificar que el archivo existe
    if (!fs.existsSync(imagePath)) {
      console.error('Image file not found:', imagePath);
      return null;
    }

    // Preprocesar imagen para mejor OCR
    const processedImagePath = imagePath.replace(/\.[^.]+$/, '_processed.jpg');
    
    await sharp(imagePath)
      .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
      .greyscale()
      .normalize()
      .sharpen()
      .toFile(processedImagePath);

    console.log('Image preprocessed, starting OCR...');

    // Inicializar worker si no existe
    const worker = await initOCRWorker();
    
    if (!worker) {
      console.error('OCR worker not available, using fallback');
      return getFallbackData();
    }

    // Realizar OCR con timeout
    const ocrPromise = worker.recognize(processedImagePath);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('OCR timeout')), 30000)
    );

    const { data: { text } } = await Promise.race([ocrPromise, timeoutPromise]);

    console.log('OCR completed, extracted text length:', text.length);

    // Limpiar archivo procesado
    try {
      fs.unlinkSync(processedImagePath);
    } catch (e) {
      console.error('Error deleting processed image:', e.message);
    }

    // Extraer información relevante
    const extractedData = extractInvoiceData(text);
    
    console.log('Extracted data:', extractedData);
    
    return extractedData;
  } catch (error) {
    console.error('Error procesando imagen:', error.message);
    return getFallbackData();
  }
}

function getFallbackData() {
  return {
    amount: null,
    date: new Date().toISOString().split('T')[0],
    cuit: null,
    items: ''
  };
}

function extractInvoiceData(text) {
  console.log('Extracting data from OCR text...');
  
  const data = {
    amount: null,
    date: null,
    cuit: null,
    items: ''
  };

  // Buscar monto - Mejorado para Argentina
  // Formatos: $1.234,56 | $ 1234.56 | 1234,56 | TOTAL: 1234
  const amountPatterns = [
    /(?:total|importe|monto|suma|pagar)[\s:$]*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/gi,
    /\$\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/g,
    /(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/g
  ];

  let amounts = [];
  for (const pattern of amountPatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      amounts = amounts.concat(matches);
      break;
    }
  }

  if (amounts.length > 0) {
    const cleanedAmounts = amounts.map(a => {
      // Extraer solo los números
      const numStr = a.match(/(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/);
      if (numStr) {
        // Convertir formato argentino (1.234,56) a decimal (1234.56)
        return parseFloat(
          numStr[1]
            .replace(/\./g, '')  // quitar puntos de miles
            .replace(/,/g, '.')  // coma decimal a punto
        );
      }
      return 0;
    }).filter(n => n > 0 && n < 1000000); // filtrar valores razonables

    if (cleanedAmounts.length > 0) {
      data.amount = Math.max(...cleanedAmounts);
      console.log('Amount found:', data.amount);
    }
  }

  // Buscar fecha - Mejorado
  // Formatos: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const datePatterns = [
    /(?:fecha|date)[\s:]*(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})/i,
    /(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})/,
    /(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2})/
  ];

  for (const pattern of datePatterns) {
    const dateMatch = text.match(pattern);
    if (dateMatch) {
      const day = dateMatch[1].padStart(2, '0');
      const month = dateMatch[2].padStart(2, '0');
      let year = dateMatch[3];
      
      if (year.length === 2) {
        year = '20' + year;
      }
      
      // Validar fecha
      const dateObj = new Date(`${year}-${month}-${day}`);
      if (!isNaN(dateObj.getTime())) {
        data.date = `${year}-${month}-${day}`;
        console.log('Date found:', data.date);
        break;
      }
    }
  }

  // Si no se encontró fecha, usar hoy
  if (!data.date) {
    data.date = new Date().toISOString().split('T')[0];
  }

  // Buscar CUIT/CUIL - Mejorado
  // Formato: XX-XXXXXXXX-X o variaciones
  const cuitPatterns = [
    /(?:cuit|cuil|dni)[\s:]*(\d{2})[- ]?(\d{8})[- ]?(\d{1})/i,
    /(\d{2})[- ](\d{8})[- ](\d{1})/
  ];

  for (const pattern of cuitPatterns) {
    const cuitMatch = text.match(pattern);
    if (cuitMatch) {
      data.cuit = `${cuitMatch[1]}-${cuitMatch[2]}-${cuitMatch[3]}`;
      console.log('CUIT found:', data.cuit);
      break;
    }
  }

  // Extraer items - líneas relevantes
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => {
      // Filtrar líneas que parecen productos/servicios
      return line.length > 3 && 
             line.length < 100 &&
             !line.match(/^[\d\s\-\.\,\/]+$/) && // no solo números
             !line.toLowerCase().includes('cuit') &&
             !line.toLowerCase().includes('total');
    });

  // Tomar las líneas más probables (máximo 5)
  const relevantLines = lines.slice(0, 5);
  if (relevantLines.length > 0) {
    data.items = relevantLines.join('; ');
    console.log('Items found:', data.items.substring(0, 100));
  }

  return data;
}

module.exports = {
  processInvoiceImage,
  extractInvoiceData,
  initOCRWorker,
  terminateOCR: async () => {
    if (ocrWorker) {
      await ocrWorker.terminate();
      ocrWorker = null;
    }
  }
};
