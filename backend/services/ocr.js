const fs = require('fs');
const axios = require('axios');

// Función auxiliar para reducir tamaño de base64 si es muy grande
function optimizeBase64(base64String, maxSize = 20 * 1024 * 1024) {
  // Si el base64 es menor a 20MB, retornar tal cual
  if (Buffer.from(base64String, 'base64').length < maxSize) {
    return base64String;
  }
  
  // Si es muy grande, simplemente truncar (no ideal pero funciona)
  console.warn('[OCR] Image too large, may cause issues');
  return base64String;
}

// PASO 1: Extraer TODO el texto (OCR puro)
async function extractTextFromImage(imagePath) {
  try {
    console.log('[OCR STEP 1] Extracting text...');
    const startTime = Date.now();

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Leer imagen directamente sin comprimir
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const imageSizeKB = (imageBuffer.length / 1024).toFixed(2);
    console.log(`[OCR STEP 1] Image: ${imageSizeKB}KB`);

    // Advertir si la imagen es muy grande
    if (imageBuffer.length > 5 * 1024 * 1024) {
      console.warn('[OCR STEP 1] Warning: Image larger than 5MB, processing may be slow');
    }

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Eres un sistema OCR profesional que extrae texto de documentos comerciales (facturas, tickets, recibos). Tu única tarea es transcribir TODO el texto visible sin juzgar ni rechazar ninguna imagen de documento comercial.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extrae TODO el texto visible en este documento comercial (factura/ticket/recibo).

Incluye absolutamente todo:
- Números, cantidades, montos
- Palabras, nombres de productos/servicios
- Fechas, horas
- Nombre del comercio/empresa
- CUIT, RUT, DNI
- Cualquier otro texto visible

Transcribe línea por línea, exactamente como aparece.
NO interpretes, solo transcribe el texto.`
              },
              {
                type: 'image_url',
                image_url: { 
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: 'high' // Alta calidad para mejor OCR
                }
              }
            ]
          }
        ],
        max_tokens: 1500,
        temperature: 0
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 45000 // 45 segundos
      }
    );

    const text = response.data.choices[0].message.content.trim();
    
    // Detectar si OpenAI rechazó la imagen
    if (text.toLowerCase().includes('lo siento') || 
        text.toLowerCase().includes('no puedo') ||
        text.toLowerCase().includes('cannot') ||
        text.length < 50) {
      console.warn('[OCR STEP 1] OpenAI refused or failed to extract text');
      console.warn('[OCR STEP 1] Response:', text);
      throw new Error('OpenAI could not process this image');
    }
    
    console.log(`[OCR STEP 1] Done in ${Date.now() - startTime}ms (${text.length} chars)`);
    console.log('--- EXTRACTED TEXT ---');
    console.log(text);
    console.log('--- END TEXT ---');
    return text;
  } catch (error) {
    console.error('[OCR STEP 1] Error:', error.message);
    if (error.response) {
      console.error('[OCR STEP 1] API Error:', error.response.status, error.response.data);
    }
    throw error;
  }
}

// PASO 2: Interpretar el texto con contexto
async function interpretInvoiceText(text) {
  try {
    console.log('[OCR STEP 2] Interpreting...');
    const startTime = Date.now();

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Eres experto en facturas argentinas/uruguayas.

REGLAS PARA MONTOS:
- Busca: "TOTAL", "Total a Pagar", "IMPORTE TOTAL", "Neto"
- Formato AR: $1.234,56 (punto=miles, coma=decimal)
- Ignora subtotales e IVA separado
- Devuelve solo número sin símbolos

CATEGORÍAS:
- hairdresser: peluquerías, salones, barberías
- food: supermercados, almacenes, restaurantes, delivery, comida
- services: luz, gas, agua, internet, seguros, telefonía
- mobility: combustible, Uber, taxi, peajes, transporte
- residence: alquiler, expensas, mantenimiento hogar
- diapers: pañales, productos bebé, farmacia bebés
- entertainment: cine, teatro, streaming, juegos, hobbies
- health: médicos, medicamentos, clínica, hospital, salud

Responde SOLO JSON.`
          },
          {
            role: 'user',
            content: `Analiza y extrae JSON:
{
  "amount": número_total,
  "date": "YYYY-MM-DD",
  "cuit": "XX-XXXXXXXX-X" o null,
  "items": "resumen breve",
  "category": "categoría",
  "vendor": "comercio",
  "confidence": {"amount": 0-100, "date": 0-100, "category": 0-100}
}

TEXTO:
${text}`
          }
        ],
        max_tokens: 500,
        temperature: 0.1
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const content = response.data.choices[0].message.content.trim();
    console.log(`[OCR STEP 2] Done in ${Date.now() - startTime}ms`);
    console.log('[OCR STEP 2] Response:', content);

    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('[OCR STEP 2] Error:', error.message);
    if (error.response) {
      console.error('[OCR STEP 2] API Error:', error.response.status, error.response.data);
    }
    throw error;
  }
}

// Función principal
async function processInvoiceImage(imagePath) {
  const start = Date.now();
  
  try {
    console.log('[OCR] === TWO-STEP PROCESS START ===');
    console.log(`[OCR] File: ${imagePath}`);
    
    if (!fs.existsSync(imagePath)) {
      console.error('[OCR] File not found');
      return getFallbackData();
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('[OCR] OPENAI_API_KEY not configured');
      return getFallbackData();
    }

    // PASO 1: Extraer texto
    const text = await extractTextFromImage(imagePath);
    
    if (!text || text.length < 10) {
      console.error('[OCR] No text extracted');
      return getFallbackData();
    }

    // PASO 2: Interpretar
    const data = await interpretInvoiceText(text);

    // Validar
    const validated = {
      amount: data.amount ? parseFloat(data.amount) : null,
      date: data.date || new Date().toISOString().split('T')[0],
      cuit: data.cuit || null,
      items: data.items || '',
      category: data.category || null,
      vendor: data.vendor || null,
      confidence: data.confidence || {}
    };

    console.log(`[OCR] === COMPLETED in ${Date.now() - start}ms ===`);
    console.log('[OCR] Result:', validated);
    
    return validated;

  } catch (error) {
    console.error(`[OCR] FAILED after ${Date.now() - start}ms:`, error.message);
    return getFallbackData();
  }
}

function getFallbackData() {
  return {
    amount: null,
    date: new Date().toISOString().split('T')[0],
    cuit: null,
    items: '',
    category: null,
    vendor: null,
    confidence: {}
  };
}

function validateExtractedData(data) {
  const validated = { ...data };
  
  if (validated.amount) {
    const amount = parseFloat(validated.amount);
    if (isNaN(amount) || amount <= 0 || amount > 10000000) {
      validated.amount = null;
    } else {
      validated.amount = amount;
    }
  }
  
  if (validated.date) {
    const dateObj = new Date(validated.date);
    if (isNaN(dateObj.getTime())) {
      validated.date = new Date().toISOString().split('T')[0];
    }
  }
  
  if (validated.cuit) {
    const numbers = validated.cuit.replace(/\D/g, '');
    if (numbers.length === 11) {
      validated.cuit = `${numbers.substr(0,2)}-${numbers.substr(2,8)}-${numbers.substr(10,1)}`;
    } else {
      validated.cuit = null;
    }
  }

  const validCategories = ['hairdresser', 'food', 'services', 'mobility', 'residence', 'diapers', 'entertainment', 'health'];
  if (validated.category && !validCategories.includes(validated.category)) {
    validated.category = null;
  }
  
  return validated;
}

module.exports = {
  processInvoiceImage,
  validateExtractedData,
  extractTextFromImage,
  interpretInvoiceText
};
