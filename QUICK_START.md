# 🚀 Inicio Rápido - Gestor de Gastos

## ⚡ Instalación en 5 Minutos

### 1️⃣ Requisitos
- Node.js 16+ instalado ([Descargar aquí](https://nodejs.org))
- Un navegador moderno

### 2️⃣ Descargar e Instalar

```bash
# Navegar a la carpeta del proyecto
cd expense-tracker

# Instalar dependencias del backend
cd backend
npm install

# Copiar configuración
cp .env.example .env

# Volver y configurar frontend
cd ../frontend
npm install
```

### 3️⃣ Configurar

**Backend** - Editar `backend/.env`:
```env
PORT=3001
JWT_SECRET=mi_secreto_super_seguro_123
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

**Frontend** - Crear `frontend/.env`:
```env
REACT_APP_API_URL=http://localhost:3001/api
```

### 4️⃣ Ejecutar

Abre **DOS terminales**:

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```
Verás: `Servidor ejecutándose en http://localhost:3001`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```
Se abrirá automáticamente en: `http://localhost:3000`

### 5️⃣ ¡Usar!

1. **Regístrate** con tu email
2. **Agrega un gasto** tocando el botón "+"
3. **Sube una factura** desde tu celular o PC
4. **Ve tus reportes** en la sección de reportes

---

## 📱 Usar desde el Celular

### Opción 1: Localhost (mismo WiFi)

1. Obtén tu IP local:
   - Windows: `ipconfig` → busca "IPv4"
   - Mac/Linux: `ifconfig` → busca "inet"
   
2. En tu celular, abre: `http://TU_IP:3000`
   Ejemplo: `http://192.168.1.100:3000`

3. **Importante:** Edita `backend/.env`:
   ```env
   FRONTEND_URL=http://TU_IP:3000
   ```

### Opción 2: Deploy en Internet

Sigue la guía completa en `DEPLOYMENT.md`

---

## 🎯 Primeros Pasos

### Crear tu Primera Factura

1. Ve a **"Agregar"** (botón + o menú)
2. Selecciona el **tipo de gasto** (ej: Comida)
3. **Sube una foto** de tu ticket:
   - Toca el área de carga
   - Selecciona desde cámara o galería
4. El sistema intentará **extraer automáticamente**:
   - Monto
   - Fecha
   - CUIT
   - Items
5. **Completa** cualquier dato faltante
6. Toca **"Guardar Gasto"**

### Ver tus Gastos

1. Ve a **"Gastos"** en el menú
2. **Filtra** por:
   - Rango de fechas
   - Tipo de gasto
   - País
3. Toca cualquier gasto para ver **detalles completos**
4. Verás conversiones automáticas a **USD y UYU**

### Generar Reportes

1. Ve a **"Reportes"**
2. Selecciona:
   - **Mensual**: Para ver un mes específico
   - **Anual**: Para todo el año
3. Elige año (y mes si es mensual)
4. Toca **"Generar Reporte"**
5. Verás:
   - Gráficos de barras por categoría
   - Gráfico circular de distribución
   - Tabla detallada

---

## 🔧 Problemas Comunes

### "No se puede conectar al servidor"

**Solución:**
```bash
# Verifica que el backend esté corriendo
cd backend
npm start
```

### "CORS Error"

**Solución:** Verifica que `backend/.env` tenga:
```env
FRONTEND_URL=http://localhost:3000
```

### Las imágenes no se cargan

**Solución:**
```bash
# Verifica que exista el directorio
mkdir backend/uploads
```

### OCR no detecta nada

**Consejos:**
- Asegúrate de que la imagen sea clara
- Buena iluminación
- Texto visible y legible
- Funciona mejor con facturas impresas

---

## 📖 Estructura de Carpetas

```
expense-tracker/
├── backend/              # Servidor Node.js
│   ├── server.js        # Archivo principal
│   ├── database.js      # Configuración BD
│   ├── middleware/      # Autenticación
│   ├── services/        # OCR, tasas cambio
│   └── uploads/         # Facturas subidas
├── frontend/            # App React
│   ├── src/
│   │   ├── components/  # Componentes UI
│   │   ├── services/    # API cliente
│   │   └── index.css    # Estilos
│   └── public/
├── README.md            # Documentación completa
├── DEPLOYMENT.md        # Guía de deployment
└── QUICK_START.md       # Esta guía
```

---

## 📚 Recursos Adicionales

- **README.md**: Documentación completa
- **DEPLOYMENT.md**: Cómo subir a producción
- **API**: Ver sección "API Endpoints" en README.md

---

## 🆘 Ayuda

### Ver Logs del Backend

```bash
# En la terminal donde corre el backend
# Verás todos los requests y errores
```

### Resetear Base de Datos

```bash
cd backend
rm database.sqlite
node -e "require('./database.js')"
```

### Actualizar Tasas de Cambio Manualmente

```bash
curl http://localhost:3001/api/exchange-rates/current
```

---

## ✨ Tips y Trucos

1. **Carga rápida**: Usa el drag & drop en PC
2. **Filtros**: Combina múltiples filtros para búsquedas precisas
3. **Edición**: Toca cualquier gasto para ver opciones
4. **Dashboard**: Se actualiza automáticamente cada semana
5. **Backup**: Copia `backend/database.sqlite` regularmente

---

## 🎉 ¡Listo!

Ya puedes gestionar todos tus gastos desde tu celular o PC.

**Próximos pasos:**
1. Agrega algunos gastos de prueba
2. Explora los reportes
3. Cuando estés listo, despliega en producción (ver DEPLOYMENT.md)

¿Preguntas? Revisa el README.md completo o crea un issue.

**¡Disfruta gestionando tus gastos! 💰📊**
