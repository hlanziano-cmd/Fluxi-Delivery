# 🔧 Guía Completa: Despliegue con Git y SSH

Esta guía te explica cómo desplegar Fluxi en `fluxicloud.com` usando Git y SSH, que es el método más profesional y permite actualizaciones automáticas.

## 📋 Requisitos Previos

- ✅ Acceso SSH a tu servidor `fluxicloud.com`
- ✅ Git instalado en tu servidor
- ✅ Cuenta de GitHub/GitLab (o cualquier servicio Git)
- ✅ Cliente SSH (PuTTY en Windows, Terminal en Mac/Linux)

## 🔐 Paso 1: Obtener Credenciales SSH

### **Opción A: Si tienes cPanel/Hosting Compartido**

1. Accede a tu cPanel: `https://fluxicloud.com/cpanel`
2. Busca la sección **"SSH Access"** o **"Terminal"**
3. Habilita el acceso SSH
4. Anota:
   - **Host:** `fluxicloud.com` o `ssh.fluxicloud.com`
   - **Puerto:** `22` (o el que te proporcionen)
   - **Usuario:** tu usuario de cPanel
   - **Contraseña:** tu contraseña de cPanel

### **Opción B: Si tienes VPS/Servidor Dedicado**

Deberías tener estos datos:
- **Host/IP:** `123.456.789.0` o `fluxicloud.com`
- **Puerto:** `22`
- **Usuario:** `root` o tu usuario personalizado
- **Método de autenticación:** Contraseña o llave SSH

## 🖥️ Paso 2: Conectar por SSH

### **En Windows (usando PuTTY):**

1. **Descargar PuTTY:**
   - Ve a: https://www.putty.org/
   - Descarga e instala PuTTY

2. **Configurar conexión:**
   - Abre PuTTY
   - **Host Name:** `fluxicloud.com`
   - **Port:** `22`
   - **Connection type:** SSH
   - Haz clic en **"Open"**

3. **Iniciar sesión:**
   ```
   login as: tu_usuario
   password: ********
   ```

### **En Windows (usando CMD/PowerShell):**

```powershell
# Abrir PowerShell y ejecutar:
ssh usuario@fluxicloud.com

# Si usa puerto diferente:
ssh -p 2222 usuario@fluxicloud.com
```

### **En Mac/Linux (usando Terminal):**

```bash
# Abrir Terminal y ejecutar:
ssh usuario@fluxicloud.com

# Si usa puerto diferente:
ssh -p 2222 usuario@fluxicloud.com

# Con llave privada:
ssh -i ~/.ssh/id_rsa usuario@fluxicloud.com
```

### **Solución de Problemas de Conexión:**

**Error: "Connection refused"**
```bash
# Verificar que el puerto sea correcto
# Contacta a tu proveedor de hosting
```

**Error: "Permission denied"**
```bash
# Verifica usuario y contraseña
# O verifica que tu IP no esté bloqueada
```

**Error: "Host key verification failed"**
```bash
# Eliminar entrada antigua:
ssh-keygen -R fluxicloud.com
# Intentar conectar nuevamente
```

## 📁 Paso 3: Preparar el Repositorio Git

### **Opción 3A: Crear Repositorio en GitHub**

1. **Crear repositorio en GitHub:**
   - Ve a: https://github.com/new
   - Nombre: `fluxi-app` (o el que prefieras)
   - Visibilidad: **Private** (recomendado para seguridad)
   - Click en **"Create repository"**

2. **Inicializar Git en tu proyecto local:**

   Abre terminal/cmd en `C:\Users\alanz\Desktop\Fluxi_New\`:

   ```bash
   # Inicializar repositorio
   git init

   # Configurar usuario (si no lo has hecho antes)
   git config --global user.name "Tu Nombre"
   git config --global user.email "tu@email.com"

   # Agregar archivos
   git add .

   # Crear primer commit
   git commit -m "Initial commit: Fluxi app con autenticación"

   # Conectar con GitHub
   git remote add origin https://github.com/tu-usuario/fluxi-app.git

   # Subir código
   git branch -M main
   git push -u origin main
   ```

3. **Si Git pide autenticación:**
   - Usuario: tu usuario de GitHub
   - Contraseña: usa un **Personal Access Token** (no tu contraseña)
   - Crear token: https://github.com/settings/tokens

### **Opción 3B: Usar GitLab (alternativa a GitHub)**

```bash
# Similar a GitHub, pero con GitLab
git remote add origin https://gitlab.com/tu-usuario/fluxi-app.git
git push -u origin main
```

### **Opción 3C: Servidor Git Propio**

Si tienes tu propio servidor Git:
```bash
git remote add origin ssh://git@tu-servidor.com/ruta/al/repo.git
git push -u origin main
```

## 🚀 Paso 4: Clonar Repositorio en el Servidor

Una vez conectado por SSH a tu servidor:

### **4.1 Navegar a la carpeta web:**

```bash
# En hosting compartido (cPanel):
cd ~/public_html/

# En VPS/Servidor Dedicado:
cd /var/www/fluxicloud.com/
# O
cd /var/www/html/
```

### **4.2 Limpiar carpeta (si hay archivos antiguos):**

```bash
# CUIDADO: Esto elimina TODO
# Haz backup primero si hay algo importante
rm -rf *

# O mover archivos existentes a backup:
mkdir ~/backup_viejo
mv * ~/backup_viejo/
```

### **4.3 Verificar que Git esté instalado:**

```bash
git --version
```

**Si Git NO está instalado:**

```bash
# En Ubuntu/Debian:
sudo apt-get update
sudo apt-get install git

# En CentOS/RHEL:
sudo yum install git

# En cPanel (contacta a soporte si no funciona):
# Generalmente Git ya viene instalado
```

### **4.4 Clonar el repositorio:**

```bash
# Repositorio público:
git clone https://github.com/tu-usuario/fluxi-app.git .

# Repositorio privado (pedirá credenciales):
git clone https://tu-usuario@github.com/tu-usuario/fluxi-app.git .

# Con token de acceso:
git clone https://TOKEN@github.com/tu-usuario/fluxi-app.git .

# El punto (.) al final clona en el directorio actual
# Sin el punto, crea una subcarpeta
```

### **4.5 Verificar que se clonó correctamente:**

```bash
ls -la

# Deberías ver:
# login.html
# index.html
# app-domiciliarios.html
# .htaccess
# JavaScript/
# SQL/
```

## 🔄 Paso 5: Script de Deploy Automático

Crea un script para facilitar futuras actualizaciones:

### **5.1 Crear script en tu servidor:**

```bash
# En tu servidor (por SSH), crea el archivo:
nano ~/deploy.sh
```

### **5.2 Pegar este contenido:**

```bash
#!/bin/bash

# Script de Deploy Automático para Fluxi
# Autor: Fluxi Team
# Uso: bash ~/deploy.sh

echo "=========================================="
echo "🚀 Iniciando Deploy de Fluxi..."
echo "=========================================="

# Variables de configuración
WEB_DIR="/var/www/fluxicloud.com"  # Ajusta esta ruta
REPO_URL="https://github.com/tu-usuario/fluxi-app.git"
BRANCH="main"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para mensajes
log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Ir al directorio web
cd "$WEB_DIR" || {
    log_error "No se puede acceder a $WEB_DIR"
    exit 1
}

log_info "Directorio actual: $(pwd)"

# Verificar si es un repositorio Git
if [ -d .git ]; then
    log_info "Repositorio Git encontrado"

    # Guardar cambios locales (si hay)
    if ! git diff-index --quiet HEAD --; then
        log_warning "Hay cambios locales, creando backup..."
        git stash
    fi

    # Obtener actualizaciones
    log_info "Descargando actualizaciones desde $BRANCH..."
    git fetch origin

    # Actualizar código
    log_info "Aplicando actualizaciones..."
    git reset --hard origin/$BRANCH
    git pull origin $BRANCH

else
    log_warning "No es un repositorio Git, clonando..."

    # Hacer backup de archivos existentes
    if [ "$(ls -A)" ]; then
        log_info "Creando backup de archivos existentes..."
        BACKUP_DIR="$HOME/backup_$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        mv * "$BACKUP_DIR/" 2>/dev/null
        log_info "Backup guardado en: $BACKUP_DIR"
    fi

    # Clonar repositorio
    git clone "$REPO_URL" .
fi

# Configurar permisos
log_info "Configurando permisos de archivos..."
find . -type f -exec chmod 644 {} \;
find . -type d -exec chmod 755 {} \;
chmod 644 .htaccess

# Verificar archivos críticos
log_info "Verificando archivos críticos..."
CRITICAL_FILES=("login.html" "index.html" "app-domiciliarios.html" ".htaccess")

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        log_info "✓ $file encontrado"
    else
        log_error "✗ $file NO encontrado"
    fi
done

# Reiniciar servicios (si es necesario)
# Descomenta si tienes permisos sudo
# log_info "Reiniciando servicios..."
# sudo systemctl reload apache2
# sudo systemctl reload nginx

echo "=========================================="
log_info "¡Deploy completado exitosamente!"
echo "=========================================="
echo ""
log_info "URLs de la aplicación:"
echo "  📱 Login: https://www.fluxicloud.com/login"
echo "  🖥️  Admin: https://www.fluxicloud.com/"
echo "  🏍️  Domiciliarios: https://www.fluxicloud.com/app-domiciliarios.html"
echo ""
log_warning "Recuerda:"
echo "  1. Verificar que el sitio cargue correctamente"
echo "  2. Probar el login"
echo "  3. Limpiar caché del navegador (Ctrl+F5)"
echo ""
```

### **5.3 Dar permisos de ejecución:**

```bash
chmod +x ~/deploy.sh
```

### **5.4 Ejecutar el script:**

```bash
bash ~/deploy.sh
```

## 🔄 Paso 6: Flujo de Trabajo para Actualizaciones

### **Cuando hagas cambios en tu código local:**

```bash
# 1. En tu computadora (Fluxi_New/), hacer cambios
# 2. Guardar cambios en Git
git add .
git commit -m "Descripción de los cambios"
git push origin main

# 3. En el servidor (por SSH), ejecutar:
bash ~/deploy.sh
```

¡Listo! Los cambios se desplegarán automáticamente.

## 🔐 Paso 7: Configurar Deploy con SSH Keys (Opcional pero Recomendado)

Para no tener que ingresar contraseña cada vez:

### **7.1 Generar llave SSH en tu servidor:**

```bash
# En el servidor (por SSH):
ssh-keygen -t ed25519 -C "deploy@fluxicloud.com"

# Presiona Enter para todas las preguntas (sin passphrase)

# Ver la llave pública:
cat ~/.ssh/id_ed25519.pub
```

### **7.2 Agregar llave a GitHub:**

1. Copia el contenido de `id_ed25519.pub`
2. Ve a GitHub: https://github.com/settings/keys
3. Click en **"New SSH key"**
4. Pega la llave
5. Guarda

### **7.3 Configurar Git para usar SSH:**

```bash
# Cambiar remote de HTTPS a SSH:
cd ~/public_html/
git remote set-url origin git@github.com:tu-usuario/fluxi-app.git

# Verificar:
git remote -v
```

Ahora los `git pull` funcionarán sin pedir contraseña.

## 🤖 Paso 8: Deploy Automático con GitHub Actions (Avanzado)

Puedes configurar deploy automático cada vez que hagas `git push`:

### **8.1 Crear archivo `.github/workflows/deploy.yml` en tu proyecto:**

```yaml
name: Deploy to FluxiCloud

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - name: Deploy to server
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.SERVER_HOST }}
        username: ${{ secrets.SERVER_USER }}
        password: ${{ secrets.SERVER_PASSWORD }}
        port: 22
        script: |
          cd ~/public_html
          git pull origin main
          bash ~/deploy.sh
```

### **8.2 Configurar Secrets en GitHub:**

1. Ve a tu repositorio en GitHub
2. Settings → Secrets and variables → Actions
3. Agrega estos secrets:
   - `SERVER_HOST`: `fluxicloud.com`
   - `SERVER_USER`: tu usuario SSH
   - `SERVER_PASSWORD`: tu contraseña SSH

Ahora, cada `git push` desplegará automáticamente.

## 🐛 Solución de Problemas

### **Error: "Permission denied (publickey)"**

```bash
# Verificar que la llave SSH esté cargada:
ssh-add -l

# Si no está, agregarla:
ssh-add ~/.ssh/id_ed25519
```

### **Error: "fatal: could not create work tree dir"**

```bash
# Permisos insuficientes
# Cambiar dueño de la carpeta:
sudo chown -R tu_usuario:tu_usuario ~/public_html/
```

### **Error: Git no reconoce usuario/contraseña**

```bash
# Usar token de acceso personal:
# 1. Crear token en GitHub: https://github.com/settings/tokens
# 2. Usar token en lugar de contraseña
```

### **El sitio no se actualiza después de deploy**

```bash
# Limpiar caché del servidor (si tienes Redis/Memcached)
# O simplemente:
# 1. Limpiar caché del navegador (Ctrl+F5)
# 2. Verificar que los archivos se actualizaron:
ls -lt ~/public_html/ | head
```

## 📊 Comandos Útiles para Administrar el Deploy

```bash
# Ver estado del repositorio
git status

# Ver últimos commits
git log --oneline -10

# Ver diferencias con el remoto
git diff origin/main

# Descartar cambios locales y sincronizar con remoto
git fetch origin
git reset --hard origin/main

# Ver información del remoto
git remote -v

# Ver ramas
git branch -a
```

## ✅ Checklist de Deploy Exitoso

- [ ] SSH funcionando correctamente
- [ ] Git instalado en el servidor
- [ ] Repositorio creado en GitHub/GitLab
- [ ] Código subido al repositorio
- [ ] Repositorio clonado en el servidor
- [ ] Script `deploy.sh` creado y funcional
- [ ] Permisos de archivos configurados
- [ ] URLs funcionando:
  - [ ] https://www.fluxicloud.com/login
  - [ ] https://www.fluxicloud.com/
  - [ ] https://www.fluxicloud.com/app-domiciliarios.html
- [ ] Login funcionando correctamente
- [ ] SSL/HTTPS activo

## 🎯 Resumen del Flujo de Trabajo

```
┌─────────────────────┐
│  Tu Computadora     │
│  (Hacer cambios)    │
└──────────┬──────────┘
           │
           │ git push
           ▼
┌─────────────────────┐
│  GitHub/GitLab      │
│  (Repositorio)      │
└──────────┬──────────┘
           │
           │ git pull / bash deploy.sh
           ▼
┌─────────────────────┐
│  Servidor           │
│  fluxicloud.com     │
└─────────────────────┘
```

## 🎉 ¡Listo!

Ahora tienes un sistema de deploy profesional con Git. Cada vez que hagas cambios:

1. **Editar código localmente**
2. **`git push`**
3. **Conectar por SSH**
4. **`bash ~/deploy.sh`**

¡Y tu sitio se actualiza en segundos!
