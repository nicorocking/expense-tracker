const fs = require('fs');
const axios = require('axios');

// Usar OpenAI Vision API para extracción inteligente
async function processInvoiceImage(imagePath) {
  try {
    console.log(`Processing invoice image with OpenAI Vision: ${imagePath}`);
    
    // Verificar que el archivo existe
    if (!fs.existsSync(imagePath)) {
      console.error('Image file not found:', imagePath);
      return getFallbackData();
    }

    // Verificar que existe la API key
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OPENAI_API_KEY not configured, using fallback OCR');
      return getFallbackData();
    }

    // Leer imagen y convertir a base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

    console.log('Calling OpenAI Vision API...');

    // Llamar a OpenAI Vision API
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
                text: `Analiza esta factura o ticket y extrae la siguiente información en formato JSON:
{
  "amount": número del monto total (solo el número, sin símbolos),
  "date": fecha en formato YYYY-MM-DD,
  "cuit": CUIT o CUIL si está presente (formato XX-XXXXXXXX-X),
  "items": descripción breve de los productos o servicios (máximo 200 caracteres),
  "category": categoría sugerida (hairdresser, food, services, mobility, residence, diapers),
  "vendor": nombre del comercio o vendedor
}

IMPORTANTE: 
- Si no encuentras algún dato, usa null
- El monto debe ser solo el número (ejemplo: 1234.56)
- La fecha debe ser YYYY-MM-DD
- Para items, resume lo principal
- Responde SOLO con el JSON, sin texto adicional`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              }
            ]
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

    const content = response.data.choices[0].message.content;
    console.log('OpenAI response:', content);

    // Parsear respuesta JSON
    let extractedData;
    try {
      // Limpiar posibles markdown
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extractedData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      return getFallbackData();
    }

    // Validar y formatear datos
    const validatedData = {
      amount: extractedData.amount ? parseFloat(extractedData.amount) : null,
      date: extractedData.date || new Date().toISOString().split('T')[0],
      cuit: extractedData.cuit || null,
      items: extractedData.items || '',
      category: extractedData.category || null,
      vendor: extractedData.vendor || null
    };

    console.log('Validated data:', validatedData);
    
    return validatedData;

  } catch (error) {
    console.error('Error processing image with OpenAI:', error.message);
    
    // Si falla OpenAI, usar fallback
    if (error.response?.status === 401) {
      console.error('Invalid OpenAI API key');
    } else if (error.response?.status === 429) {
      console.error('OpenAI rate limit exceeded');
    }
    
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
    vendor: null
  };
}


// Función auxiliar para validar datos extraídos
function validateExtractedData(data) {
  const validated = { ...data };
  
  // Validar monto
  if (validated.amount) {
    const amount = parseFloat(validated.amount);
    if (isNaN(amount) || amount <= 0 || amount > 10000000) {
      validated.amount = null;
    } else {
      validated.amount = amount;
    }
  }
  
  // Validar fecha
  if (validated.date) {
    const dateObj = new Date(validated.date);
    if (isNaN(dateObj.getTime())) {
      validated.date = new Date().toISOString().split('T')[0];
    }
  }
  
  // Validar CUIT
  if (validated.cuit && !validated.cuit.match(/^\d{2}-\d{8}-\d{1}$/)) {
    validated.cuit = null;
  }
  
  return validated;
}

module.exports = {
  processInvoiceImage,
  validateExtractedData
};
