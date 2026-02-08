# 💰 Gestor de Gastos - Sistema de Seguimiento de Facturas

Sistema completo de gestión de gastos con carga de facturas vía imagen, OCR automático, conversión de divisas y reportes detallados.

## 🌟 Características

### Funcionalidades Principales
- ✅ **Carga de facturas**: Sube tickets/facturas desde tu celular (imagen o PDF)
- 🔍 **OCR automático**: Extracción automática de monto, fecha, CUIT e items
- 💱 **Conversión de divisas**: Tasas automáticas de USD y UYU a ARS
- 📊 **Dashboard en tiempo real**: Actualización semanal automática
- 📈 **Reportes mensuales y anuales**: Gráficos detallados por categoría
- 📱 **100% Responsive**: Optimizado para móviles Android (Samsung)
- 🔐 **Autenticación segura**: JWT en servidor
- 🌍 **Multi-país**: Soporte para Argentina y Uruguay
- ➕ **Carga manual**: Agregar gastos sin factura

### Categorías de Gastos
- Peluquería
- Comida
- Servicios
- Movilidad
- Residencia
- Pañales

### Datos Capturados
- Tipo de gasto
- Monto (en ARS, USD o UYU)
- País (Argentina/Uruguay)
- Fecha
- CUIT/RUT
- Items/Descripción
- Comentarios
- Imagen de la factura

## 🏗️ Arquitectura

### Backend
- **Node.js + Express**: API RESTful
- **SQLite**: Base de datos (fácil deployment)
- **JWT**: Autenticación segura
- **Tesseract.js**: OCR para procesar facturas
- **Sharp**: Procesamiento de imágenes
- **Multer**: Gestión de uploads

### Frontend
- **React**: Interface de usuario
- **React Router**: Navegación
- **Recharts**: Gráficos y visualizaciones
- **Axios**: Comunicación con API
- **CSS Responsive**: Optimizado para móviles

## 📦 Instalación

### Requisitos Previos
- Node.js 16 o superior
- npm o yarn

### Paso 1: Clonar o Descargar el Proyecto

```bash
cd expense-tracker
```

### Paso 2: Configurar Backend

```bash
cd backend
npm install

# Copiar archivo de configuración
cp .env.example .env

# Editar .env con tus valores
nano .env
```

Configurar `.env`:
```env
PORT=3001
JWT_SECRET=tu_secreto_super_seguro_cambialo_en_produccion
NODE_ENV=production
FRONTEND_URL=http://tu-dominio.com
```

### Paso 3: Configurar Frontend

```bash
cd ../frontend
npm install

# Crear archivo .env
echo "REACT_APP_API_URL=http://tu-servidor:3001/api" > .env
```

## 🚀 Ejecución

### Desarrollo Local

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

La aplicación estará disponible en:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

### Producción

**Backend:**
```bash
cd backend
npm install --production
PORT=3001 NODE_ENV=production node server.js
```

**Frontend:**
```bash
cd frontend
npm run build

# Servir con nginx o cualquier servidor estático
```

## 🌐 Deployment

### Opción 1: VPS (Recomendado)

**En tu servidor (Ubuntu/Debian):**

```bash
# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2 para gestión de procesos
sudo npm install -g pm2

# Clonar proyecto
git clone <tu-repo>
cd expense-tracker

# Backend
cd backend
npm install --production
pm2 start server.js --name expense-backend

# Frontend - compilar
cd ../frontend
npm install
npm run build

# Configurar nginx para servir frontend
sudo apt-get install nginx
```

**Configuración Nginx (`/etc/nginx/sites-available/expense-tracker`):**

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    # Frontend
    location / {
        root /ruta/a/expense-tracker/frontend/build;
        try_files $uri /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Uploads
    location /uploads {
        proxy_pass http://localhost:3001;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/expense-tracker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# SSL con Let's Encrypt (opcional pero recomendado)
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com
```

### Opción 2: Heroku

**Backend:**
```bash
cd backend
heroku create tu-app-backend
heroku config:set JWT_SECRET=tu_secreto
git push heroku main
```

**Frontend:**
```bash
cd frontend
# Editar .env con la URL de Heroku backend
npm run build
# Subir carpeta build a Netlify o Vercel
```

### Opción 3: Docker

```dockerfile
# Dockerfile para backend
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --production
COPY backend/ .
EXPOSE 3001
CMD ["node", "server.js"]
```

```bash
docker build -t expense-backend .
docker run -p 3001:3001 -e JWT_SECRET=secreto expense-backend
```

## 📱 Uso desde el Celular

### Primera Vez
1. Abre el navegador en tu Samsung Android
2. Navega a `http://tu-dominio.com`
3. Regístrate con tu email
4. ¡Listo para usar!

### Agregar a Pantalla Principal
1. Toca el menú del navegador (⋮)
2. Selecciona "Agregar a pantalla de inicio"
3. Ahora puedes acceder como una app nativa

### Cargar Factura
1. Toca el botón "+" o ve a "Agregar"
2. Toca el área de carga de imagen
3. Selecciona desde cámara o galería
4. El sistema extraerá automáticamente los datos
5. Revisa y completa información faltante
6. Guarda

## 🔧 Mantenimiento

### Actualizar Tasas de Cambio
Las tasas se actualizan automáticamente cada 24 horas. Para forzar actualización:

```bash
# Desde el backend
curl http://localhost:3001/api/exchange-rates/current
```

### Backup de Base de Datos

```bash
cd backend
cp database.sqlite database_backup_$(date +%Y%m%d).sqlite
```

### Ver Logs (con PM2)

```bash
pm2 logs expense-backend
```

## 🔐 Seguridad

- ✅ Autenticación JWT con expiración
- ✅ Contraseñas hasheadas con bcrypt
- ✅ Validación de archivos en upload
- ✅ CORS configurado
- ✅ Rate limiting (implementar en producción)

**Recomendaciones adicionales:**
- Usar HTTPS en producción
- Cambiar JWT_SECRET a algo único y seguro
- Implementar rate limiting con express-rate-limit
- Configurar backup automático de BD

## 📊 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registro
- `POST /api/auth/login` - Login

### Gastos
- `GET /api/expenses` - Listar gastos (con filtros)
- `POST /api/expenses` - Crear gasto
- `GET /api/expenses/:id` - Obtener gasto
- `PUT /api/expenses/:id` - Actualizar gasto
- `DELETE /api/expenses/:id` - Eliminar gasto

### Reportes
- `GET /api/reports/monthly?year=2024&month=1` - Reporte mensual
- `GET /api/reports/annual?year=2024` - Reporte anual
- `GET /api/dashboard` - Dashboard

### Tasas de Cambio
- `GET /api/exchange-rates/current` - Tasas actuales
- `GET /api/exchange-rates/:date` - Tasas por fecha

## 🎨 Personalización

### Agregar Nueva Categoría

**Backend** (`backend/server.js`):
```javascript
// Agregar en expenseTypes
{ value: 'nueva_categoria', label: 'Nueva Categoría' }
```

**Frontend** (`frontend/src/components/*`):
```javascript
// Agregar en categoryLabels
'nueva_categoria': 'Nueva Categoría'
```

### Cambiar Colores

Editar `frontend/src/index.css`:
```css
.btn-primary {
  background: linear-gradient(135deg, #tu-color-1 0%, #tu-color-2 100%);
}
```

## 🐛 Solución de Problemas

### OCR no funciona bien
- Asegúrate de que la imagen sea clara
- Mejora la iluminación al fotografiar
- El OCR funciona mejor con texto impreso que manuscrito

### No se suben imágenes
- Verifica permisos del directorio `backend/uploads`
- Aumenta el límite en `server.js` si necesitas archivos más grandes

### Error de conexión
- Verifica que backend esté corriendo
- Revisa la URL en `.env` del frontend
- Comprueba CORS en el backend

## 📝 Licencia

MIT License - Libre para uso personal y comercial

## 👥 Soporte

Para reportar bugs o sugerencias, crea un issue en el repositorio.

## 🚀 Roadmap Futuro

- [ ] App móvil nativa (React Native)
- [ ] Exportar reportes a PDF/Excel
- [ ] Integración con Google Drive
- [ ] Notificaciones push
- [ ] Multi-usuario (familia/empresa)
- [ ] Categorías personalizables
- [ ] Presupuestos y alertas
- [ ] OCR mejorado con IA
