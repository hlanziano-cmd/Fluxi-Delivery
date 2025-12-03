# 🔐 Instrucciones para Solucionar el Login

## ✅ Cambios Realizados

He actualizado las siguientes configuraciones:

1. **[login.html](login.html)** - Actualizado con la versión correcta de Supabase (líneas 241-248)
2. **[JavaScript/config.js](JavaScript/config.js)** - Actualizado URL y API Key (líneas 6-7)

Las URLs antiguas han sido reemplazadas:
- ❌ `kpqcqjhhqwezwvnzwnnb.supabase.co` (antigua)
- ✅ `lbifbexhmvbanvrjfglp.supabase.co` (nueva)

---

## 🚀 Pasos para Resolver el Error 400

### Paso 1: Limpiar Caché del Navegador

El error que ves es porque el navegador tiene archivos antiguos en caché. **Debes limpiar la caché completamente:**

#### Chrome/Edge:
1. Presiona `Ctrl + Shift + Delete`
2. Selecciona "Todo el tiempo"
3. Marca:
   - ✅ Archivos e imágenes en caché
   - ✅ Cookies y otros datos de sitios
4. Haz clic en "Borrar datos"

#### Firefox:
1. Presiona `Ctrl + Shift + Delete`
2. Selecciona "Todo"
3. Marca:
   - ✅ Caché
   - ✅ Cookies
4. Haz clic en "Limpiar ahora"

#### O simplemente usa Modo Incógnito:
- Chrome/Edge: `Ctrl + Shift + N`
- Firefox: `Ctrl + Shift + P`

---

### Paso 2: Crear el Superusuario en Supabase

Ejecuta el script SQL en tu proyecto de Supabase:

1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto `lbifbexhmvbanvrjfglp`
3. Ve a **SQL Editor** en el menú lateral
4. Copia y pega el contenido del archivo **[SQL/verificar_y_crear_superusuario.sql](SQL/verificar_y_crear_superusuario.sql)**
5. Haz clic en **RUN**

Deberías ver este resultado:

```
nombre: Superadministrador Fluxi
email: admin@fluxicloud.com
password: Fluxi2025!
rol: administrador
estado: activo
is_superuser: true
```

---

### Paso 3: Probar el Login

1. **Abre el navegador en modo incógnito** o con la caché limpia
2. Ve a `https://www.fluxicloud.com/login`
3. Ingresa las credenciales:
   - **Email:** `admin@fluxicloud.com`
   - **Contraseña:** `Fluxi2025!`
4. Haz clic en **Iniciar Sesión**

---

## 🐛 Si Sigue Sin Funcionar

Si después de limpiar la caché y crear el usuario aún ves errores, verifica:

### 1. Abrir la Consola del Navegador (F12)

Ve a la pestaña **Console** y busca:
- ¿Qué URL de Supabase aparece en los errores?
- ¿Hay algún mensaje de error específico?

### 2. Verificar Archivos en el Servidor

Si estás usando tu servidor en `fluxicloud.com`, asegúrate de que los archivos actualizados estén en el servidor:

- ✅ `login.html` (actualizado)
- ✅ `JavaScript/config.js` (actualizado)
- ✅ `index.html` (ya estaba correcto)

### 3. Verificar RLS en Supabase

Si el login da "Credenciales incorrectas" pero el usuario existe, verifica que RLS esté deshabilitado:

```sql
-- Ejecutar en SQL Editor de Supabase
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'usuarios';
```

El resultado debe mostrar `rowsecurity = false`. Si es `true`, ejecuta:

```sql
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
```

---

## 📝 Credenciales del Superusuario

**Email:** admin@fluxicloud.com
**Contraseña:** Fluxi2025!

---

## 🔍 Información Técnica

**Proyecto Supabase:** lbifbexhmvbanvrjfglp
**URL:** https://lbifbexhmvbanvrjfglp.supabase.co
**Anon Key:** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiaWZiZXhobXZiYW52cmpmZ2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5Mjg5MDQsImV4cCI6MjA3NjUwNDkwNH0.ZXjCv4DkNobkn3IDK9wYBjjOV55Bf_UwcSxhkt6YqGo

**Archivos Actualizados:**
- [login.html](login.html:244-245)
- [JavaScript/config.js](JavaScript/config.js:6-7)
- [index.html](index.html:1459-1460) (ya estaba correcto)
- [app-domiciliarios.html](app-domiciliarios.html:775-776) (ya estaba correcto)
