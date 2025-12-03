# 📦 Archivos Listos para Deployment en FluxiCloud.com

## ✅ Estado Actual

Todos los archivos están actualizados y sincronizados en GitHub:
- **Repositorio:** https://github.com/hlanziano-cmd/Fluxi_New
- **Branch:** main
- **Último commit:** 0378ec3 - GitHub Actions workflow para deployment automático

---

## 📁 Archivos Críticos que DEBEN estar en el servidor

### 1. **login.html** ⭐ CRÍTICO
- **Ubicación en servidor:** `/public_html/login.html`
- **GitHub:** https://github.com/hlanziano-cmd/Fluxi_New/blob/main/login.html
- **Cambios:** Configuración correcta de Supabase (v2.39.3)
- **Líneas importantes:** 244-245 (URL y API Key correctas)

### 2. **JavaScript/config.js** ⭐ CRÍTICO
- **Ubicación en servidor:** `/public_html/JavaScript/config.js`
- **GitHub:** https://github.com/hlanziano-cmd/Fluxi_New/blob/main/JavaScript/config.js
- **Cambios:** URL y API Key de Supabase actualizadas
- **Líneas importantes:** 6-7

### 3. **.htaccess** ⭐ IMPORTANTE
- **Ubicación en servidor:** `/public_html/.htaccess`
- **GitHub:** https://github.com/hlanziano-cmd/Fluxi_New/blob/main/.htaccess
- **Función:** Permite URLs limpias (ej: `/login` en lugar de `/login.html`)

### 4. **index.html** ✅ Ya debería estar actualizado
- **Ubicación en servidor:** `/public_html/index.html`
- **GitHub:** https://github.com/hlanziano-cmd/Fluxi_New/blob/main/index.html
- **Nota:** Ya tiene la configuración correcta de Supabase

### 5. **app-domiciliarios.html** ✅ Ya debería estar actualizado
- **Ubicación en servidor:** `/public_html/app-domiciliarios.html`
- **GitHub:** https://github.com/hlanziano-cmd/Fluxi_New/blob/main/app-domiciliarios.html
- **Nota:** Ya tiene la configuración correcta de Supabase

---

## 🚀 Método 1: Deployment Manual (Más Rápido)

### Opción A: Desde GitHub (Recomendado)

1. **Descarga los archivos desde GitHub:**

   **login.html:**
   - Ve a: https://github.com/hlanziano-cmd/Fluxi_New/blob/main/login.html
   - Click en botón **"Raw"**
   - Click derecho → **"Guardar como"** → `login.html`

   **JavaScript/config.js:**
   - Ve a: https://github.com/hlanziano-cmd/Fluxi_New/blob/main/JavaScript/config.js
   - Click en botón **"Raw"**
   - Click derecho → **"Guardar como"** → `config.js`

   **.htaccess:**
   - Ve a: https://github.com/hlanziano-cmd/Fluxi_New/blob/main/.htaccess
   - Click en botón **"Raw"**
   - Click derecho → **"Guardar como"** → `.htaccess`

2. **Sube a tu servidor usando cPanel File Manager:**
   - Entra a cPanel de tu hosting
   - Ve a **"Administrador de archivos"** / **"File Manager"**
   - Navega a `public_html` (o el directorio raíz de tu web)
   - Haz clic en **"Upload"**
   - Sube `login.html` al directorio raíz
   - Sube `.htaccess` al directorio raíz
   - Navega a la carpeta `JavaScript`
   - Sube `config.js` reemplazando el archivo existente

3. **Verifica que se subieron:**
   - Abre en modo incógnito: `https://www.fluxicloud.com/JavaScript/config.js`
   - Debes ver: `const SUPABASE_URL = 'https://lbifbexhmvbanvrjfglp.supabase.co';`
   - Si ves una URL diferente, el archivo no se actualizó

### Opción B: Desde tu computadora local

1. **Los archivos están en:** `c:\Users\alanz\Desktop\Fluxi_New\`
2. **Sube usando cPanel o FTP:**
   - `login.html`
   - `JavaScript/config.js`
   - `.htaccess`

---

## 🤖 Método 2: Deployment Automático con GitHub Actions

He creado un workflow de GitHub Actions que puede deployar automáticamente. Para activarlo:

### Paso 1: Configurar Secrets en GitHub

1. Ve a tu repositorio: https://github.com/hlanziano-cmd/Fluxi_New
2. Click en **"Settings"** (Configuración)
3. En el menú lateral, click en **"Secrets and variables"** → **"Actions"**
4. Click en **"New repository secret"** para cada uno:

   **Secret 1:**
   - Name: `FTP_SERVER`
   - Value: `ftp.fluxicloud.com` (o el servidor FTP que te dio tu hosting)

   **Secret 2:**
   - Name: `FTP_USERNAME`
   - Value: Tu usuario de FTP

   **Secret 3:**
   - Name: `FTP_PASSWORD`
   - Value: Tu contraseña de FTP

### Paso 2: Editar el workflow si es necesario

El archivo está en: `.github/workflows/deploy.yml`

Si tu directorio en el servidor es diferente a `/public_html/`, edita la línea:
```yaml
server-dir: /public_html/
```

### Paso 3: Activar el deployment

Una vez configurados los secrets:
1. Ve a **"Actions"** en tu repositorio
2. Click en el workflow **"Deploy to FluxiCloud"**
3. Click en **"Run workflow"** → **"Run workflow"**

Cada vez que hagas `git push` a la rama `main`, se deployará automáticamente.

---

## ✅ Verificación Post-Deployment

Después de subir los archivos, verifica:

### 1. Archivo config.js actualizado:
```
https://www.fluxicloud.com/JavaScript/config.js
```
Debe contener: `https://lbifbexhmvbanvrjfglp.supabase.co`

### 2. Login page actualizado:
```
https://www.fluxicloud.com/login
```
- Abre la consola (F12)
- No debe haber errores de `agsdiezhjcqkmjkqcaqi` ni `kpqcqjhhqwezwvnzwnnb`
- Solo debe aparecer: `lbifbexhmvbanvrjfglp.supabase.co`

### 3. Probar el login:
- Email: `admin@fluxicloud.com`
- Contraseña: `Fluxi2025!`

---

## 🔑 No Olvides: Ejecutar el SQL en Supabase

Antes de probar el login, ejecuta el script SQL:

1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto `lbifbexhmvbanvrjfglp`
3. Ve a **SQL Editor**
4. Copia y pega el contenido de: `SQL/verificar_y_crear_superusuario.sql`
5. Click en **RUN**

---

## 📋 Checklist de Deployment

- [ ] Subir `login.html` al servidor
- [ ] Subir `JavaScript/config.js` al servidor
- [ ] Subir `.htaccess` al servidor
- [ ] Verificar que `config.js` tiene la URL correcta
- [ ] Limpiar caché del navegador / usar modo incógnito
- [ ] Ejecutar SQL en Supabase para crear superusuario
- [ ] Probar login en `https://www.fluxicloud.com/login`

---

## 🆘 Soporte

Si después de deployment sigue sin funcionar:

1. Verifica en modo incógnito que `https://www.fluxicloud.com/JavaScript/config.js` tenga la URL correcta
2. Revisa la consola del navegador (F12) para ver qué URL de Supabase aparece en los errores
3. Asegúrate de haber ejecutado el SQL en Supabase
4. Verifica que RLS esté deshabilitado en la tabla `usuarios`

---

## 📞 URLs Importantes

- **Sitio web:** https://www.fluxicloud.com
- **Login:** https://www.fluxicloud.com/login
- **Panel admin:** https://www.fluxicloud.com/index.html
- **GitHub:** https://github.com/hlanziano-cmd/Fluxi_New
- **Supabase Dashboard:** https://supabase.com/dashboard (proyecto: lbifbexhmvbanvrjfglp)
