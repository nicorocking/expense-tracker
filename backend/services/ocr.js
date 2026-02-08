const Tesseract = require('tesseract.js');
const sharp = require('sharp');

async function processInvoiceImage(imagePath) {
  try {
    // Preprocesar imagen para mejor OCR
    const processedImagePath = imagePath.replace(/\.[^.]+$/, '_processed.jpg');
    await sharp(imagePath)
      .greyscale()
      .normalize()
      .sharpen()
      .toFile(processedImagePath);

    // Realizar OCR
    const { data: { text } } = await Tesseract.recognize(
      processedImagePath,
      'spa', // Español
      {
        logger: m => console.log(m)
      }
    );

    // Extraer información relevante
    const extractedData = extractInvoiceData(text);
    
    return extractedData;
  } catch (error) {
    console.error('Error procesando imagen:', error);
    return null;
  }
}

function extractInvoiceData(text) {
  const data = {
    amount: null,
    date: null,
    cuit: null,
    items: []
  };

  // Buscar monto (formatos comunes: $1.234,56 o 1234.56)
  const amountRegex = /\$?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/g;
  const amounts = text.match(amountRegex);
  if (amounts && amounts.length > 0) {
    // Tomar el monto más grande encontrado
    const cleanedAmounts = amounts.map(a => 
      parseFloat(a.replace(/\$/g, '').replace(/\./g, '').replace(/,/g, '.'))
    );
    data.amount = Math.max(...cleanedAmounts);
  }

  // Buscar fecha (formatos: DD/MM/YYYY, DD-MM-YYYY)
  const dateRegex = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/;
  const dateMatch = text.match(dateRegex);
  if (dateMatch) {
    const day = dateMatch[1].padStart(2, '0');
    const month = dateMatch[2].padStart(2, '0');
    let year = dateMatch[3];
    if (year.length === 2) {
      year = '20' + year;
    }
    data.date = `${year}-${month}-${day}`;
  }

  // Buscar CUIT (formato: XX-XXXXXXXX-X)
  const cuitRegex = /(\d{2})[- ]?(\d{8})[- ]?(\d{1})/;
  const cuitMatch = text.match(cuitRegex);
  if (cuitMatch) {
    data.cuit = `${cuitMatch[1]}-${cuitMatch[2]}-${cuitMatch[3]}`;
  }

  // Extraer posibles ítems (líneas con descripción y precio)
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  data.items = lines.slice(0, 10).join('; '); // Primeras 10 líneas como items

  return data;
}

module.exports = {
  processInvoiceImage,
  extractInvoiceData
};
