const axios = require('axios');
const db = require('../database');

// Obtener tasas de cambio actualizadas
async function fetchExchangeRates() {
  try {
    // Usando una API pública para tasas de cambio
    // Alternativa: https://api.exchangerate-api.com/v4/latest/USD
    const response = await axios.get('https://api.exchangerate-api.com/v4/latest/ARS');
    
    const usdToArs = 1 / response.data.rates.USD;
    const uyuToArs = response.data.rates.UYU;

    const today = new Date().toISOString().split('T')[0];

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT OR REPLACE INTO exchange_rates (date, usd_to_ars, uyu_to_ars) VALUES (?, ?, ?)`,
        [today, usdToArs, uyuToArs],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ usdToArs, uyuToArs });
          }
        }
      );
    });
  } catch (error) {
    console.error('Error obteniendo tasas de cambio:', error.message);
    // Retornar tasas por defecto en caso de error
    return { usdToArs: 1000, uyuToArs: 25 };
  }
}

// Obtener tasas de cambio de una fecha específica
function getExchangeRatesByDate(date) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT usd_to_ars, uyu_to_ars FROM exchange_rates WHERE date = ? ORDER BY created_at DESC LIMIT 1`,
      [date],
      (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          resolve({ usdToArs: row.usd_to_ars, uyuToArs: row.uyu_to_ars });
        } else {
          // Si no hay datos para esa fecha, obtener los más recientes
          db.get(
            `SELECT usd_to_ars, uyu_to_ars FROM exchange_rates ORDER BY date DESC LIMIT 1`,
            [],
            (err, row) => {
              if (err) reject(err);
              else if (row) resolve({ usdToArs: row.usd_to_ars, uyuToArs: row.uyu_to_ars });
              else resolve({ usdToArs: 1000, uyuToArs: 25 }); // Valores por defecto
            }
          );
        }
      }
    );
  });
}

// Actualizar tasas automáticamente cada día
setInterval(() => {
  fetchExchangeRates();
}, 24 * 60 * 60 * 1000); // Una vez al día

// Fetch inicial
fetchExchangeRates();

module.exports = {
  fetchExchangeRates,
  getExchangeRatesByDate
};
