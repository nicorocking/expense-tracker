const fs = require('fs');
const axios = require('axios');
const sharp = require('sharp');

// Comprimir imagen para optimizar
async function compressImage(imagePath) {
  try {
    const compressedPath = imagePath.replace(/\.[^.]+$/, '_compressed.jpg');
    
    await sharp(imagePath)
      .resize(2000, 2000, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .jpeg({ quality: 90 })
      .toFile(compressedPath);
    
    return compressedPath;
  } catch (error) {
    console.error('[OCR] Error compressing:', error.message);
    return imagePath;
  }
}

// PASO 1: Extraer TODO el texto (OCR puro)
async function extractTextFromImage(imagePath) {
  try {
    console.log('[OCR STEP 1] Extracting text...');
    const startTime = Date.now();

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const compressedPath = await compressImage(imagePath);
    const imageBuffer = fs.readFileSync(compressedPath);
    const base64Image = imageBuffer.toString('base64');
    console.log(`[OCR STEP 1] Image: ${(imageBuffer.length / 1024).toFixed(2)}KB`);

    if (compressedPath !== imagePath) {
      try { fs.unlinkSync(compressedPath); } catch (e) {}
    }

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extrae TODO el texto de esta factura/ticket, línea por línea.
Incluye: números, palabras, fechas, montos, productos, comercio, CUIT, todo.
Solo transcribe, no interpretes.`
              },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${base64Image}` }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const text = response.data.choices[0].message.content.trim();
    console.log(`[OCR STEP 1] Done in ${Date.now() - startTime}ms (${text.length} chars)`);
    console.log('--- EXTRACTED TEXT ---');
    console.log(text);
    console.log('--- END TEXT ---');
    return text;
  } catch (error) {
    console.error('[OCR STEP 1] Error:', error.message);
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
- food: supermercados, restaurantes, delivery
- services: luz, gas, agua, internet, seguros
- mobility: combustible, Uber, taxi, peajes
- residence: alquiler, expensas
- diapers: pañales, productos bebé

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
    throw error;
  }
}

// Función principal
async function processInvoiceImage(imagePath) {
  const start = Date.now();
  
  try {
    console.log('[OCR] === TWO-STEP PROCESS START ===');
    
    if (!fs.existsSync(imagePath)) {
      console.error('[OCR] File not found');
      return getFallbackData();
    }

    if (!process.env.OPENAI_API_KEY) {
      console.warn('[OCR] No API key');
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

  const validCategories = ['hairdresser', 'food', 'services', 'mobility', 'residence', 'diapers'];
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
