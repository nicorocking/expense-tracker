# 🚀 Guía de Deployment - Gestor de Gastos

Esta guía te ayudará a desplegar la aplicación en producción.

## 📋 Opciones de Deployment

### 1. VPS (Recomendado para Control Total)

#### Requisitos
- Ubuntu 20.04 o superior
- Mínimo 1GB RAM
- Dominio apuntando al servidor

#### Pasos

**1. Preparar el Servidor**

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar Git
sudo apt install git -y

# Instalar PM2 (gestor de procesos)
sudo npm install -g pm2
```

**2. Clonar el Proyecto**

```bash
cd /var/www
sudo git clone <tu-repositorio> expense-tracker
sudo chown -R $USER:$USER expense-tracker
cd expense-tracker
```

**3. Configurar Backend**

```bash
cd backend
npm install --production

# Crear archivo .env
cat > .env << EOF
PORT=3001
JWT_SECRET=$(openssl rand -hex 32)
NODE_ENV=production
FRONTEND_URL=https://tu-dominio.com
EOF

# Crear directorio de uploads
mkdir -p uploads
chmod 755 uploads

# Inicializar base de datos
node -e "require('./database.js')"
```

**4. Iniciar Backend con PM2**

```bash
pm2 start server.js --name expense-backend
pm2 save
pm2 startup
```

**5. Compilar Frontend**

```bash
cd ../frontend

# Crear .env de producción
echo "REACT_APP_API_URL=https://tu-dominio.com/api" > .env

npm install
npm run build
```

**6. Instalar y Configurar Nginx**

```bash
sudo apt install nginx -y

# Crear configuración
sudo nano /etc/nginx/sites-available/expense-tracker
```

Pegar esta configuración:

```nginx
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;

    # Tamaño máximo de upload (para imágenes)
    client_max_body_size 10M;

    # Frontend
    location / {
        root /var/www/expense-tracker/frontend/build;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Uploads
    location /uploads/ {
        proxy_pass http://localhost:3001/uploads/;
    }
}
```

Habilitar el sitio:

```bash
sudo ln -s /etc/nginx/sites-available/expense-tracker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**7. Configurar SSL con Let's Encrypt**

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

**8. Configurar Firewall**

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

---

### 2. Heroku (Más Fácil pero con Limitaciones)

**Backend en Heroku:**

```bash
cd backend

# Login en Heroku
heroku login

# Crear app
heroku create mi-gestor-gastos-backend

# Configurar variables
heroku config:set JWT_SECRET=$(openssl rand -hex 32)
heroku config:set NODE_ENV=production

# Crear Procfile
echo "web: node server.js" > Procfile

# Deploy
git init
git add .
git commit -m "Initial commit"
git push heroku main
```

**Frontend en Netlify:**

```bash
cd frontend

# Build
npm run build

# Subir a Netlify (o usar su interfaz web)
npm install -g netlify-cli
netlify deploy --prod --dir=build
```

**Importante:** Actualizar `.env` del frontend con la URL de Heroku.

---

### 3. Docker (Para Contenedores)

**Crear Dockerfile Backend:**

```dockerfile
# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

RUN mkdir -p uploads

EXPOSE 3001

CMD ["node", "server.js"]
```

**Crear Dockerfile Frontend:**

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Docker Compose:**

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - JWT_SECRET=tu_secreto_aqui
      - NODE_ENV=production
    volumes:
      - ./backend/uploads:/app/uploads
      - ./backend/database.sqlite:/app/database.sqlite

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
```

**Ejecutar:**

```bash
docker-compose up -d
```

---

## 🔄 Actualización de la Aplicación

### Con VPS + PM2

```bash
cd /var/www/expense-tracker

# Actualizar código
git pull

# Backend
cd backend
npm install --production
pm2 restart expense-backend

# Frontend
cd ../frontend
npm install
npm run build
sudo systemctl reload nginx
```

### Con Heroku

```bash
git add .
git commit -m "Update"
git push heroku main
```

---

## 📊 Monitoreo

### Ver logs con PM2

```bash
pm2 logs expense-backend
pm2 monit
```

### Verificar estado

```bash
pm2 status
sudo systemctl status nginx
```

---

## 🔐 Seguridad Adicional

### 1. Configurar Fail2Ban (protección contra ataques)

```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
```

### 2. Rate Limiting en Nginx

Agregar en configuración de nginx:

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

location /api/ {
    limit_req zone=api burst=20;
    # ... resto de configuración
}
```

### 3. Backups Automáticos

Crear script de backup:

```bash
sudo nano /usr/local/bin/backup-expense-tracker.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/backups/expense-tracker"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup de base de datos
cp /var/www/expense-tracker/backend/database.sqlite $BACKUP_DIR/database_$DATE.sqlite

# Backup de uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/expense-tracker/backend/uploads

# Mantener solo últimos 7 días
find $BACKUP_DIR -mtime +7 -delete
```

```bash
sudo chmod +x /usr/local/bin/backup-expense-tracker.sh

# Agregar a crontab (diario a las 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-expense-tracker.sh") | crontab -
```

---

## 🆘 Troubleshooting

### Backend no inicia

```bash
pm2 logs expense-backend
# Ver errores y verificar configuración
```

### Error 502 Bad Gateway

```bash
# Verificar que backend esté corriendo
pm2 status

# Verificar nginx
sudo nginx -t
sudo systemctl restart nginx
```

### Base de datos corrupta

```bash
# Restaurar desde backup
cd /var/www/expense-tracker/backend
cp /backups/expense-tracker/database_YYYYMMDD_HHMMSS.sqlite ./database.sqlite
pm2 restart expense-backend
```

---

## 📱 Prueba desde tu Celular

1. Abre Chrome en tu Android
2. Ve a `https://tu-dominio.com`
3. Toca el menú (⋮) → "Agregar a pantalla de inicio"
4. ¡Usa como una app!

---

## 📈 Optimizaciones de Rendimiento

### 1. Comprimir respuestas

En `backend/server.js`, agregar:

```javascript
const compression = require('compression');
app.use(compression());
```

### 2. Cache de Nginx

```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

---

## ✅ Checklist Final

- [ ] Backend corriendo en PM2
- [ ] Frontend compilado y servido por Nginx
- [ ] SSL/HTTPS configurado
- [ ] Firewall activo
- [ ] Backups automáticos configurados
- [ ] Variables de entorno configuradas
- [ ] Probado desde celular
- [ ] Logs monitoreados

¡Tu aplicación está lista para producción! 🎉
