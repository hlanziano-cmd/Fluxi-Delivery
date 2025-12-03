# 🚀 Guía de Despliegue - Fluxi en fluxicloud.com

## 📋 Requisitos Previos

- ✅ Acceso FTP/cPanel a tu servidor en `fluxicloud.com`
- ✅ Base de datos Supabase configurada
- ✅ Todos los scripts SQL ejecutados en Supabase

## 📂 Estructura de Archivos a Subir

```
fluxicloud.com/
├── login.html                 ← Página de inicio de sesión
├── index.html                 ← Aplicación principal (admin)
├── app-domiciliarios.html     ← App para domiciliarios
├── .htaccess                  ← Configuración de URLs (Apache)
├── JavaScript/
│   ├── config.js              ← Configuración de Supabase
│   ├── location.js            ← Tracking GPS
│   └── orders.js              ← Gestión de pedidos
└── SQL/
    ├── add_password_to_usuarios.sql
    ├── create_descargas_caja.sql
    ├── fix_usuarios_rls.sql
    └── (otros scripts SQL)
```

## 🔧 Paso 1: Configurar .htaccess (Apache)

Si tu servidor usa **Apache** (la mayoría de hosting compartido), el archivo `.htaccess` que creé permitirá:

- Acceder a `/login` sin extensión `.html`
- Proteger archivos sensibles
- Configurar URLs limpias

**Archivo:** `.htaccess` (ya creado en tu carpeta)

### Si usas Nginx (VPS/Servidor propio)

Agrega esto a tu configuración de Nginx:

```nginx
server {
    listen 80;
    server_name fluxicloud.com www.fluxicloud.com;

    root /var/www/fluxicloud.com;
    index index.html;

    # Redirigir /login a /login.html
    location = /login {
        try_files /login.html =404;
    }

    # Servir archivos HTML sin extensión
    location / {
        try_files $uri $uri.html $uri/ =404;
    }

    # Proteger archivos sensibles
    location ~ /(config\.js|\.env)$ {
        deny all;
    }
}
```

## 📤 Paso 2: Subir Archivos al Servidor

### **Opción A: Usar FTP (FileZilla, WinSCP, etc.)**

1. **Conecta por FTP:**
   - Host: `ftp.fluxicloud.com` (o tu servidor FTP)
   - Usuario: tu usuario de hosting
   - Contraseña: tu contraseña de hosting

2. **Navega a la carpeta pública:**
   - Usualmente: `/public_html/` o `/www/` o `/htdocs/`

3. **Sube estos archivos:**
   ```
   ✅ login.html
   ✅ index.html
   ✅ app-domiciliarios.html
   ✅ .htaccess
   ✅ JavaScript/ (carpeta completa)
   ```

### **Opción B: Usar cPanel File Manager**

1. Accede a tu cPanel: `https://fluxicloud.com/cpanel`
2. Ve a **"File Manager"**
3. Navega a `/public_html/`
4. Haz clic en **"Upload"**
5. Selecciona y sube los archivos

### **Opción C: Usar Git (Recomendado para actualizaciones)**

```bash
# En tu servidor (SSH)
cd /var/www/fluxicloud.com
git clone https://tu-repo.git .

# O si ya existe
git pull origin main
```

## 🔗 Paso 3: Verificar URLs

Después de subir los archivos, verifica que funcionen estas URLs:

| URL | Descripción | Debe Mostrar |
|-----|-------------|--------------|
| `https://www.fluxicloud.com/` | Raíz del sitio | Redirige a login o muestra index |
| `https://www.fluxicloud.com/login` | Página de login | Formulario de inicio de sesión |
| `https://www.fluxicloud.com/login.html` | Login directo | Formulario de inicio de sesión |
| `https://www.fluxicloud.com/index.html` | App principal | Redirige a login si no hay sesión |
| `https://www.fluxicloud.com/app-domiciliarios.html` | App domiciliarios | App móvil para domiciliarios |

## ⚙️ Paso 4: Configurar Permisos (si es necesario)

En algunos servidores, necesitas configurar permisos:

```bash
# Conecta por SSH y ejecuta:
chmod 644 *.html
chmod 644 .htaccess
chmod 755 JavaScript/
chmod 644 JavaScript/*.js
```

## 🔐 Paso 5: Configurar HTTPS (SSL)

Para que el login sea seguro, necesitas HTTPS:

### **Opción A: Let's Encrypt (Gratis)**

Si tienes cPanel:
1. Ve a **"SSL/TLS Status"** en cPanel
2. Selecciona tu dominio
3. Haz clic en **"Run AutoSSL"**

Si tienes acceso SSH:
```bash
# Instalar Certbot
sudo apt-get install certbot python3-certbot-apache

# Obtener certificado
sudo certbot --apache -d fluxicloud.com -d www.fluxicloud.com
```

### **Opción B: SSL de tu Hosting**

Contacta a tu proveedor de hosting para activar SSL.

## 🧪 Paso 6: Probar el Sistema

### **Test 1: Acceso a Login**

1. Abre: `https://www.fluxicloud.com/login`
2. Deberías ver el formulario de login
3. Verifica que no haya errores en la consola (F12)

### **Test 2: Inicio de Sesión**

1. Ingresa:
   - Email: `admin@fluxicloud.com`
   - Contraseña: `Fluxi2025!`
2. Deberías ser redirigido a `index.html`
3. Deberías ver el dashboard con tu nombre en la sidebar

### **Test 3: Protección de Rutas**

1. Abre una ventana en modo incógnito
2. Intenta acceder directamente a: `https://www.fluxicloud.com/index.html`
3. Deberías ser redirigido automáticamente a `/login`

### **Test 4: Cerrar Sesión**

1. Dentro de la app, haz clic en **"🚪 Cerrar Sesión"**
2. Deberías volver a `/login`
3. Intenta acceder a `/index.html` - debe redirigir a login

## 🐛 Solución de Problemas

### **Error 404 en /login**

**Causa:** El `.htaccess` no está funcionando o no existe.

**Solución:**
1. Verifica que `.htaccess` esté en la raíz (`/public_html/.htaccess`)
2. Verifica que Apache tenga `mod_rewrite` habilitado
3. Usa la URL completa: `https://www.fluxicloud.com/login.html`

### **Error de CORS al iniciar sesión**

**Causa:** Problemas de seguridad entre dominios.

**Solución:**
Supabase ya está configurado para aceptar peticiones desde cualquier origen. Si persiste, verifica en Supabase:
1. Dashboard → Settings → API
2. Verifica que no haya restricciones de dominio

### **La página se ve sin estilos**

**Causa:** CSS en línea no se carga.

**Solución:**
Los estilos están embebidos en el HTML, así que esto no debería pasar. Si ocurre:
1. Verifica que el archivo HTML se subió completo
2. Limpia caché del navegador (Ctrl+F5)

### **Error 401 al hacer login**

**Solución:**
1. Verifica que ejecutaste el script SQL de RLS:
   ```sql
   ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
   ```
2. Verifica que la API Key es correcta en `login.html`

### **No redirige después del login**

**Causa:** JavaScript no se ejecuta o hay error.

**Solución:**
1. Abre la consola (F12)
2. Busca errores en JavaScript
3. Verifica que `index.html` existe en la misma carpeta que `login.html`

## 📱 Configuración de App para Domiciliarios

La URL de la app para domiciliarios será:
```
https://www.fluxicloud.com/app-domiciliarios.html
```

Esta URL se enviará automáticamente por WhatsApp cuando asignes un pedido.

## 🔄 Actualizaciones Futuras

Para actualizar la aplicación:

1. **Modificar archivos localmente**
2. **Probar en local/desarrollo**
3. **Subir archivos modificados por FTP**
4. **Limpiar caché del navegador**

### Script de Deploy Automático (opcional)

Crea un archivo `deploy.sh`:

```bash
#!/bin/bash
# Script de despliegue automático

echo "🚀 Desplegando Fluxi a fluxicloud.com..."

# Subir archivos por FTP
lftp -u usuario,contraseña ftp.fluxicloud.com <<EOF
cd public_html
mput login.html
mput index.html
mput app-domiciliarios.html
mput .htaccess
mirror -R JavaScript
bye
EOF

echo "✅ Despliegue completado!"
```

## 📊 Monitoreo

Después del despliegue, monitorea:

1. **Logs del servidor:**
   - cPanel → Error Logs
   - Busca errores 404, 500, etc.

2. **Supabase Dashboard:**
   - Ve a Logs para ver peticiones
   - Verifica que las consultas funcionen

3. **Google Analytics (opcional):**
   - Agrega tracking para monitorear uso

## 🎯 Checklist Final

Antes de dar por terminado el despliegue:

- [ ] Archivos subidos correctamente
- [ ] `.htaccess` configurado
- [ ] SSL/HTTPS activo
- [ ] Login funciona desde `/login`
- [ ] Redirección automática funciona
- [ ] Cerrar sesión funciona
- [ ] App domiciliarios accesible
- [ ] Scripts SQL ejecutados en Supabase
- [ ] RLS deshabilitado o configurado
- [ ] Superusuario creado
- [ ] Permisos de archivos correctos

## 📞 Soporte Post-Despliegue

Si después del despliegue hay problemas:

1. Revisa logs del servidor
2. Verifica la consola del navegador (F12)
3. Verifica logs de Supabase
4. Confirma que todos los archivos se subieron
5. Prueba desde diferentes navegadores

## 🔐 Seguridad Adicional

### Recomendaciones:

1. **Cambiar contraseña del superusuario** después del primer login
2. **Activar firewall** en el servidor si está disponible
3. **Backup regular** de la base de datos
4. **Monitorear intentos de login** fallidos
5. **Actualizar dependencias** (Supabase JS) regularmente

### Archivos Sensibles:

Protege estos archivos en `.htaccess`:
- `config.js` (contiene API keys)
- `.env` (si usas variables de entorno)
- Archivos SQL (solo para referencia, no ejecutables)

## 🎉 ¡Listo!

Tu aplicación Fluxi debería estar funcionando en:

**🔐 Login:** https://www.fluxicloud.com/login
**📊 Admin:** https://www.fluxicloud.com/
**🏍️ Domiciliarios:** https://www.fluxicloud.com/app-domiciliarios.html

Credenciales iniciales:
- **Email:** admin@fluxicloud.com
- **Contraseña:** Fluxi2025!

¡No olvides cambiar la contraseña después del primer inicio de sesión!
