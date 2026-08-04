# personal-finances-expo
Finanzas personales creado con expo 

## Setup inicial (primera vez)

### Requisitos
- Node 20+
- pnpm
- Docker Desktop corriendo (para el stack local de Supabase)

### 1. Instalar dependencias
```bash
pnpm install
```

### 2. Levantar Supabase local
```bash
npx supabase start
```
Levanta Postgres + Auth + Studio en Docker. Al terminar imprime `API URL`, `DB URL`, `Publishable key` y `Secret key` — los necesitas en el paso 4.

### 3. Aplicar schema + seed
```bash
npx supabase db reset
```
Corre las migraciones de `supabase/migrations/` y el seed de categorías default (`supabase/seed.sql`).

### 4. Configurar variables de entorno
```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/mobile/.env.example apps/mobile/.env
```

Edita cada archivo con los valores del paso 2:

**`apps/backend/.env`**
```
PORT=4000
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<Secret key>
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

**`apps/mobile/.env`**
```
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<Publishable key>
EXPO_PUBLIC_API_URL=http://localhost:4000
```

### 5. Levantar backend y mobile (dos terminales separadas)
```bash
# terminal 1
pnpm --filter @finanzas/backend dev
# → http://localhost:4000 (probar: curl http://localhost:4000/health)

# terminal 2
pnpm --filter @finanzas/mobile start
# → presiona w (web), i (iOS) o a (Android)
```

### 6. Crear un usuario de prueba
Entra por la pantalla de **Registrarte** en la app. La confirmación de email está desactivada en el entorno local, así que quedas logueado de inmediato.

## Reanudar desarrollo (día a día)

Una vez hiciste el setup inicial, no necesitas repetir `pnpm install`, `db reset` ni reconfigurar los `.env` — solo levantar los 3 servicios:

```bash
# 1. Supabase local (levanta con los mismos datos de la última sesión)
npx supabase start

# 2. Backend — terminal 1
pnpm --filter @finanzas/backend dev

# 3. Mobile — terminal 2
pnpm --filter @finanzas/mobile start
```

Repite `db reset` solo si agregaste una migración nueva en `supabase/migrations/`.

### Detener el entorno
`Ctrl+C` en ambas terminales y luego:
```bash
npx supabase stop
```
Esto conserva los datos — la próxima vez que corras `npx supabase start` vuelves a tener todo tal como estaba. Si en cambio quieres empezar de cero, usa `npx supabase stop --no-backup`.
