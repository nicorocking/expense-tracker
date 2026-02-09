require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const db = require('./database');
const { authenticateToken } = require('./middleware/auth');
const { fetchExchangeRates, getExchangeRatesByDate } = require('./services/exchangeRate');
const { processInvoiceImage } = require('./services/ocr');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Crear directorio de uploads si no existe
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuración de Multer para subir imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (JPEG, PNG) y PDFs'));
    }
  }
});

// ==================== RUTAS DE AUTENTICACIÓN ====================

// Registro
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
      [email, hashedPassword, name],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'El email ya está registrado' });
          }
          return res.status(500).json({ error: 'Error al registrar usuario' });
        }

        const token = jwt.sign(
          { id: this.lastID, email },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );

        res.status(201).json({
          message: 'Usuario registrado exitosamente',
          token,
          user: { id: this.lastID, email, name }
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Error en el servidor' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login exitoso',
      token,
      user: { id: user.id, email: user.email, name: user.name }
    });
  });
});

// ==================== RUTAS DE GASTOS ====================

// Endpoint para procesar imagen y extraer datos (OCR)
app.post('/api/ocr/process', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
    }

    console.log('Processing OCR for:', req.file.filename);

    // Procesar imagen con OCR
    const ocrData = await processInvoiceImage(req.file.path);

    // Devolver datos extraídos y la URL de la imagen
    res.json({
      success: true,
      imagePath: `/uploads/${req.file.filename}`,
      extractedData: ocrData || {
        amount: null,
        date: new Date().toISOString().split('T')[0],
        cuit: null,
        items: ''
      }
    });
  } catch (error) {
    console.error('Error en OCR:', error);
    res.status(500).json({ 
      error: 'Error al procesar la imagen',
      imagePath: req.file ? `/uploads/${req.file.filename}` : null
    });
  }
});

// Crear gasto con imagen
app.post('/api/expenses', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    let { type, amount, currency, country, date, cuit, items, comment } = req.body;
    
    console.log('Creating expense, file:', req.file ? req.file.filename : 'none');
    
    let ocrData = null;
    
    // Si hay imagen, procesarla con OCR
    if (req.file) {
      console.log('Processing image with OCR...');
      ocrData = await processInvoiceImage(req.file.path);
      
      if (ocrData) {
        console.log('OCR data extracted:', ocrData);
        
        // Usar datos extraídos SOLO si no se proporcionaron manualmente
        if (!amount && ocrData.amount) {
          amount = ocrData.amount;
          console.log('Using OCR amount:', amount);
        }
        if (!date && ocrData.date) {
          date = ocrData.date;
          console.log('Using OCR date:', date);
        }
        if (!cuit && ocrData.cuit) {
          cuit = ocrData.cuit;
          console.log('Using OCR CUIT:', cuit);
        }
        if (!items && ocrData.items) {
          items = ocrData.items;
          console.log('Using OCR items:', items.substring(0, 50));
        }
      }
    }

    // Si aún faltan datos críticos, usar valores por defecto
    if (!date) {
      date = new Date().toISOString().split('T')[0];
    }

    // Validaciones
    if (!type) {
      return res.status(400).json({ error: 'El tipo de gasto es requerido' });
    }
    
    if (!amount) {
      return res.status(400).json({ 
        error: 'El monto es requerido. No se pudo extraer de la imagen automáticamente.',
        ocrData: ocrData 
      });
    }

    // Obtener tasas de cambio del día
    const rates = await getExchangeRatesByDate(date);
    
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    db.run(
      `INSERT INTO expenses (user_id, type, amount, currency, country, date, cuit, items, comment, image_path, usd_rate, uyu_rate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        type,
        amount,
        currency || 'ARS',
        country || 'AR',
        date,
        cuit || null,
        items || null,
        comment || null,
        imagePath,
        rates.usdToArs,
        rates.uyuToArs
      ],
      function(err) {
        if (err) {
          console.error('Error insertando gasto:', err);
          return res.status(500).json({ error: 'Error al crear el gasto' });
        }

        console.log('Expense created successfully, ID:', this.lastID);

        res.status(201).json({
          message: 'Gasto creado exitosamente',
          id: this.lastID,
          ocrData: ocrData,
          usedOCR: ocrData ? true : false
        });
      }
    );
  } catch (error) {
    console.error('Error creando gasto:', error);
    res.status(500).json({ error: 'Error en el servidor: ' + error.message });
  }
});

// Obtener todos los gastos del usuario
app.get('/api/expenses', authenticateToken, (req, res) => {
  const { startDate, endDate, type, country } = req.query;
  
  let query = 'SELECT * FROM expenses WHERE user_id = ?';
  const params = [req.user.id];

  if (startDate) {
    query += ' AND date >= ?';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND date <= ?';
    params.push(endDate);
  }

  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }

  if (country) {
    query += ' AND country = ?';
    params.push(country);
  }

  query += ' ORDER BY date DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Error al obtener gastos' });
    }

    // Calcular montos en USD y UYU
    const expenses = rows.map(expense => {
      const amountARS = expense.currency === 'ARS' ? expense.amount : 
                        expense.currency === 'USD' ? expense.amount * expense.usd_rate :
                        expense.amount / expense.uyu_rate;
      
      return {
        ...expense,
        amountUSD: amountARS / expense.usd_rate,
        amountUYU: amountARS * expense.uyu_rate
      };
    });

    res.json(expenses);
  });
});

// Obtener un gasto específico
app.get('/api/expenses/:id', authenticateToken, (req, res) => {
  db.get(
    'SELECT * FROM expenses WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener el gasto' });
      }

      if (!row) {
        return res.status(404).json({ error: 'Gasto no encontrado' });
      }

      const amountARS = row.currency === 'ARS' ? row.amount : 
                        row.currency === 'USD' ? row.amount * row.usd_rate :
                        row.amount / row.uyu_rate;

      res.json({
        ...row,
        amountUSD: amountARS / row.usd_rate,
        amountUYU: amountARS * row.uyu_rate
      });
    }
  );
});

// Actualizar gasto
app.put('/api/expenses/:id', authenticateToken, (req, res) => {
  const { type, amount, currency, country, date, cuit, items, comment } = req.body;

  db.run(
    `UPDATE expenses 
     SET type = ?, amount = ?, currency = ?, country = ?, date = ?, cuit = ?, items = ?, comment = ?
     WHERE id = ? AND user_id = ?`,
    [type, amount, currency, country, date, cuit, items, comment, req.params.id, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error al actualizar el gasto' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Gasto no encontrado' });
      }

      res.json({ message: 'Gasto actualizado exitosamente' });
    }
  );
});

// Eliminar gasto
app.delete('/api/expenses/:id', authenticateToken, (req, res) => {
  db.get(
    'SELECT image_path FROM expenses WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Error al eliminar el gasto' });
      }

      if (!row) {
        return res.status(404).json({ error: 'Gasto no encontrado' });
      }

      // Eliminar imagen si existe
      if (row.image_path) {
        const imagePath = path.join(__dirname, row.image_path);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }

      db.run(
        'DELETE FROM expenses WHERE id = ? AND user_id = ?',
        [req.params.id, req.user.id],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Error al eliminar el gasto' });
          }

          res.json({ message: 'Gasto eliminado exitosamente' });
        }
      );
    }
  );
});

// ==================== RUTAS DE REPORTES ====================

// Reporte mensual
app.get('/api/reports/monthly', authenticateToken, (req, res) => {
  const { year, month } = req.query;

  if (!year || !month) {
    return res.status(400).json({ error: 'Año y mes son requeridos' });
  }

  const startDate = `${year}-${month.padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  db.all(
    `SELECT type, 
            SUM(CASE WHEN currency = 'ARS' THEN amount 
                     WHEN currency = 'USD' THEN amount * usd_rate
                     ELSE amount / uyu_rate END) as total_ars,
            COUNT(*) as count
     FROM expenses 
     WHERE user_id = ? AND date BETWEEN ? AND ?
     GROUP BY type`,
    [req.user.id, startDate, endDate],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Error al generar reporte' });
      }

      res.json({
        period: `${month}/${year}`,
        data: rows
      });
    }
  );
});

// Reporte anual
app.get('/api/reports/annual', authenticateToken, (req, res) => {
  const { year } = req.query;

  if (!year) {
    return res.status(400).json({ error: 'Año es requerido' });
  }

  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  db.all(
    `SELECT strftime('%m', date) as month,
            type,
            SUM(CASE WHEN currency = 'ARS' THEN amount 
                     WHEN currency = 'USD' THEN amount * usd_rate
                     ELSE amount / uyu_rate END) as total_ars,
            COUNT(*) as count
     FROM expenses 
     WHERE user_id = ? AND date BETWEEN ? AND ?
     GROUP BY month, type
     ORDER BY month, type`,
    [req.user.id, startDate, endDate],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Error al generar reporte' });
      }

      res.json({
        year: year,
        data: rows
      });
    }
  );
});

// Dashboard
app.get('/api/dashboard', authenticateToken, (req, res) => {
  const today = new Date();
  const currentMonth = today.toISOString().slice(0, 7);
  const currentYear = today.getFullYear();

  Promise.all([
    // Total del mes actual
    new Promise((resolve, reject) => {
      db.get(
        `SELECT SUM(CASE WHEN currency = 'ARS' THEN amount 
                         WHEN currency = 'USD' THEN amount * usd_rate
                         ELSE amount / uyu_rate END) as total
         FROM expenses 
         WHERE user_id = ? AND strftime('%Y-%m', date) = ?`,
        [req.user.id, currentMonth],
        (err, row) => err ? reject(err) : resolve(row)
      );
    }),
    // Total del año
    new Promise((resolve, reject) => {
      db.get(
        `SELECT SUM(CASE WHEN currency = 'ARS' THEN amount 
                         WHEN currency = 'USD' THEN amount * usd_rate
                         ELSE amount / uyu_rate END) as total
         FROM expenses 
         WHERE user_id = ? AND strftime('%Y', date) = ?`,
        [req.user.id, currentYear.toString()],
        (err, row) => err ? reject(err) : resolve(row)
      );
    }),
    // Por categoría este mes
    new Promise((resolve, reject) => {
      db.all(
        `SELECT type,
                SUM(CASE WHEN currency = 'ARS' THEN amount 
                         WHEN currency = 'USD' THEN amount * usd_rate
                         ELSE amount / uyu_rate END) as total
         FROM expenses 
         WHERE user_id = ? AND strftime('%Y-%m', date) = ?
         GROUP BY type`,
        [req.user.id, currentMonth],
        (err, rows) => err ? reject(err) : resolve(rows)
      );
    }),
    // Gastos recientes
    new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM expenses 
         WHERE user_id = ?
         ORDER BY date DESC
         LIMIT 10`,
        [req.user.id],
        (err, rows) => err ? reject(err) : resolve(rows)
      );
    })
  ])
  .then(([monthTotal, yearTotal, byCategory, recentExpenses]) => {
    res.json({
      monthTotal: monthTotal.total || 0,
      yearTotal: yearTotal.total || 0,
      byCategory: byCategory,
      recentExpenses: recentExpenses
    });
  })
  .catch(err => {
    console.error('Error en dashboard:', err);
    res.status(500).json({ error: 'Error al obtener datos del dashboard' });
  });
});

// ==================== RUTAS DE TASAS DE CAMBIO ====================

// Obtener tasas actuales
app.get('/api/exchange-rates/current', async (req, res) => {
  try {
    const rates = await fetchExchangeRates();
    res.json(rates);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tasas de cambio' });
  }
});

// Obtener tasas por fecha
app.get('/api/exchange-rates/:date', async (req, res) => {
  try {
    const rates = await getExchangeRatesByDate(req.params.date);
    res.json(rates);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tasas de cambio' });
  }
});

// ==================== INICIO DEL SERVIDOR ====================

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
  console.log('Base de datos inicializada');
});
