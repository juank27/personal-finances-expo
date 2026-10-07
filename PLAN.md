# Plan: Registro automático de transacciones vía correo (Gmail) + IA

> Este documento es una guía de implementación detallada para hacerlo tú mismo. No hay código implementado todavía salvo lo indicado en la sección "Estado actual" al final — lo demás son decisiones de diseño ya tomadas y verificadas contra el código real de este proyecto.

## Context

El usuario quiere que la app registre gastos/ingresos automáticamente, leyendo las notificaciones bancarias que llegan por correo. Se descartó leer SMS: iOS no tiene ninguna API para que apps de terceros lean SMS (restricción de plataforma, no de esfuerzo), y Android lo restringe desde 2019 a apps que sean el manejador de SMS por defecto (Play Store rechazaría una app de finanzas normal con ese permiso). El correo (Gmail vía OAuth) es la única vía que funciona igual en ambas tiendas, es aprobable en ambas, y puede ser 100% automática sin que el usuario confirme cada movimiento.

**Restricción de infraestructura ya identificada**: este proyecto es 100% local (Supabase Docker + backend Express corrido a mano, sin hosting público), así que no se puede usar el push de Gmail (requiere endpoint HTTPS público vía Pub/Sub). Igual que se resolvió para "presupuestos recurrentes" en este mismo proyecto (roll-forward perezoso en `listBudgets` en vez de cron), la sincronización de correos es **perezosa**: se dispara cuando el usuario abre la app.

**Alerta de infraestructura nueva (bloqueante, hay que resolverla antes de codear)**: Google OAuth exige que el `redirect_uri` sea `https://` o `http://localhost`/`127.0.0.1` — **no acepta** la IP LAN (`192.168.1.14`) que este proyecto usa hoy para que el teléfono físico llegue al backend. Solución: un túnel HTTPS temporal (`ngrok http 4000`) apuntando solo al callback de OAuth; el resto del tráfico (`EXPO_PUBLIC_API_URL`) sigue igual que hoy por la IP LAN. Esto requiere que el usuario cree una cuenta de ngrok (gratis) y la tenga corriendo mientras prueba/usa esta feature — es un requisito externo, no negociable dado cómo funciona OAuth de Google.

## Parte 1 — Backend: OAuth de Gmail + sincronización + IA

### 1. OAuth de Google
- **Scope**: `gmail.readonly` (no `gmail.metadata` — ese no da el cuerpo del correo, solo headers/snippet truncado, insuficiente para extraer monto/comercio de forma confiable).
- **Flujo** (code exchange siempre en el backend, nunca en el móvil):
  1. Móvil llama `POST /email-connections/google/start` (autenticado) → backend genera un `state` firmado con HMAC (`{uid, exp}` + firma, **sin persistir nada** — evita depender de un store en memoria que se pierda con `tsx watch`) → devuelve la URL de autorización de Google.
  2. Móvil abre esa URL con `WebBrowser.openAuthSessionAsync(authUrl, "mobile://email-sync-callback")`.
  3. Usuario aprueba en Google → Google redirige a `GET /email-connections/google/callback` (ruta pública, sin `requireAuth`) → el backend verifica el HMAC del `state`, intercambia `code` por tokens, guarda/actualiza `email_connections`, responde 302 a `mobile://email-sync-callback?status=success|error`.
  4. Como esa URL coincide con el `redirectUri` del paso 2, `openAuthSessionAsync` resuelve solo — el móvil invalida su query de conexión y refetch, sin confiar en el query param como fuente de verdad.
- **Nuevas env vars** (`apps/backend/src/config.ts`, mismo patrón Zod ya usado):
  ```ts
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().url(),
  GEMINI_API_KEY: z.string().min(1),
  EMAIL_SYNC_ENCRYPTION_KEY: z.string().min(1), // 32 bytes base64
  EMAIL_SYNC_LLM_MODEL: z.string().default("gemini-flash-latest"),
  EMAIL_SYNC_MIN_CONFIDENCE: z.coerce.number().min(0).max(1).default(0.7),
  EMAIL_SYNC_MAX_MESSAGES_PER_RUN: z.coerce.number().int().positive().default(50),
  ```

### 2. Base de datos — `email_connections`
Refresh token cifrado con AES-256-GCM (`node:crypto`, sin dependencia nueva) usando `EMAIL_SYNC_ENCRYPTION_KEY` — defensa en profundidad contra filtración del volumen Docker/`pg_dump`, no contra acceso al `.env` del backend (mismo nivel de confianza que ya tiene `SUPABASE_SERVICE_ROLE_KEY`).

`supabase/migrations/20260924000000_add_email_connections.sql`:
```sql
create table public.email_connections (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  email text not null,
  refresh_token_encrypted text not null,
  access_token_encrypted text,
  access_token_expires_at timestamptz,
  status text not null default 'active' check (status in ('active', 'error', 'revoked')),
  last_error text,
  last_synced_at timestamptz,
  sync_in_progress boolean not null default false,
  sync_started_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.email_connections enable row level security;
create policy "email_connections_self" on public.email_connections
  for all using (user_id = auth.uid());
```
`sync_in_progress`/`sync_started_at` son el lock perezoso (si una ejecución previa quedó "stale" > 2 min, se permite reintentar).

### 3. Sincronización perezosa — `POST /email-sync/check`
**Endpoint dedicado, no acoplado a `GET /transactions`**: el sync implica llamadas externas (Gmail + Gemini) que pueden tardar segundos y fallar por razones ajenas a la BD; acoplarlo haría que cualquier pantalla de transacciones dependa de la disponibilidad de esos servicios. El móvil lo llama al montar el Home, sin bloquear el resto de la carga.

Algoritmo (`apps/backend/src/modules/email-sync/email-sync.service.ts`):
1. Buscar conexión activa del usuario; si no existe o no está `active` → `skipped_no_connection`.
2. Si `sync_in_progress` (no stale) → `skipped_in_progress`. Si no, marcar `sync_in_progress=true`, capturar `syncStartedAt = now()` **antes** de consultar Gmail.
3. Refrescar `access_token` si venció. Si Google responde `invalid_grant` (usuario revocó acceso) → `status='revoked'` + `last_error`, terminar — esto es lo que la UI de cuenta detecta para pedir "reconectar".
4. Ventana: `since = last_synced_at ?? (created_at - 7 días)` (primera sync no importa todo el historial).
5. `GET /gmail/v1/users/me/messages?q=after:{since} -category:promotions -category:social&maxResults=...` (filtro interno para no gastar tokens de Gemini en spam obvio — la IA sigue decidiendo si ES un movimiento real, sin listas de remitentes que el usuario tenga que mantener).
6. Por mensaje: obtener body completo (`format=full`), decodificar (`text/plain` preferido), truncar ~4000 caracteres.
7. Extracción estructurada con **Gemini** (paquete oficial `@google/genai`, confirmado contra el repo real `googleapis/js-genai` — no `@google/generative-ai`, que es el SDK viejo). El schema de extracción se define una sola vez con Zod (fuente de verdad, mismo estilo que el resto del proyecto), se convierte a JSON Schema con `zod-to-json-schema` para pasárselo a Gemini vía `responseJsonSchema`, y se vuelve a validar con el mismo schema Zod al leer la respuesta (nunca confiar ciegamente en que el modelo devolvió el shape exacto):
   ```ts
   import { GoogleGenAI } from "@google/genai";
   import { zodToJsonSchema } from "zod-to-json-schema";

   const BankEmailExtraction = z.object({
     is_bank_transaction: z.boolean(),
     confidence: z.number().min(0).max(1),
     amount: z.number().positive().nullable(),
     type: z.enum(["income", "expense"]).nullable(),
     note: z.string().max(280).nullable(),
     category_id: z.string().uuid().nullable(),
   });

   const response = await gemini.models.generateContent({
     model: config.EMAIL_SYNC_LLM_MODEL,
     contents: buildEmailPrompt(email, categories), // incluye system + lista real de categorías del usuario en un solo prompt de texto
     config: {
       responseMimeType: "application/json",
       responseJsonSchema: zodToJsonSchema(BankEmailExtraction),
     },
   });

   const extraction = BankEmailExtraction.parse(JSON.parse(response.text));
   ```
8. Si `!extraction.is_bank_transaction` o `extraction.confidence < EMAIL_SYNC_MIN_CONFIDENCE` → no crear nada, solo avanzar el watermark (para no re-preguntarle a la IA por el mismo correo). El umbral de confianza se aplica aquí (evitar falsos positivos que contaminen presupuestos/reportes), no en la resolución de categoría.
9. Si sí es un movimiento válido: validar que el `category_id` devuelto exista de verdad en las categorías del usuario (nunca confiar ciegamente en que el modelo no alucinó un uuid). **Si no matchea con ninguna categoría real, usar la categoría existente "Otros gastos" o "Otros ingresos"** (ya son parte de las categorías default del sistema — ver `packages/constants/src/default-categories.ts` / `supabase/seed.sql`, no hace falta crear ninguna categoría nueva "Sin clasificar"; se resuelve buscando `is_default=true AND type=X AND name='Otros gastos'|'Otros ingresos'`).
10. Insertar reusando `createTransaction` existente, extendida con un tercer parámetro opcional (no rompe el `POST /transactions` manual, que sigue llamándola con 2 argumentos):
    ```ts
    export async function createTransaction(
      userId: string,
      input: CreateTransactionInput,
      options?: { source?: "manual" | "email-ai"; sourceMessageId?: string }
    ): Promise<Transaction> { /* INSERT ... source, source_message_id ... */ }
    ```
    Colisión de `source_message_id` (mensaje ya procesado) se trata como "ya importado", no como error — red de idempotencia adicional al watermark.
11. Al terminar: `last_synced_at = syncStartedAt`, `sync_in_progress = false`.

**Modelo recomendado**: `gemini-flash-latest` (confirmado como alias real vigente en el SDK oficial). Es la gama rápida/económica de Gemini, apropiada para clasificación/extracción de texto corto ejecutada con alta frecuencia. Si al implementar existe una variante aún más económica tipo "flash-lite" en el catálogo vigente de modelos (verificar con `ai.models.list()` o la doc oficial en ese momento, no asumir el nombre exacto de antemano), es la primera candidata para bajar costo. Todo esto queda configurable vía `EMAIL_SYNC_LLM_MODEL` sin tocar código.

### 4. Trazabilidad — columna `source` en `transactions`
`supabase/migrations/20260924000001_add_transaction_source_and_message_id.sql`:
```sql
alter table public.transactions
  add column source text not null default 'manual' check (source in ('manual', 'email-ai')),
  add column source_message_id text;

create unique index transactions_source_message_id_idx
  on public.transactions (source_message_id)
  where source_message_id is not null;
```
`packages/shared/src/transaction.ts`: agregar `source: "manual" | "email-ai"` y `source_message_id: string | null` a `Transaction`.

### Archivos nuevos/modificados (backend)
- `apps/backend/src/lib/crypto.ts` (nuevo, AES-256-GCM — `encrypt(plaintext)`/`decrypt(ciphertext)`, guarda IV + auth tag junto al ciphertext, ej. codificados en base64 separados por `:`)
- `apps/backend/src/lib/oauth-state.ts` (nuevo, `signState({uid, exp})`/`verifyState(token)` con HMAC-SHA256, `verifyState` devuelve `null` si expiró o la firma no matchea, nunca lanza)
- `apps/backend/src/lib/gmail-client.ts` (nuevo, fetch nativo — sin paquete `googleapis`, coherente con el estilo minimalista sin ORM del proyecto): `getAuthorizationUrl(state)`, `exchangeCodeForTokens(code)`, `refreshAccessToken(refreshToken)` (debe distinguir `invalid_grant` de otros errores), `listMessages(accessToken, query, maxResults)`, `getMessage(accessToken, id)`
- `apps/backend/src/lib/gemini.ts` (nuevo, cliente singleton `new GoogleGenAI({ apiKey: config.GEMINI_API_KEY })`, igual patrón que `lib/supabase.ts`)
- `apps/backend/src/modules/email-connections/{email-connections.routes.ts,email-connections.service.ts}` (nuevo)
- `apps/backend/src/modules/email-sync/{email-sync.routes.ts,email-sync.service.ts}` (nuevo)
- `apps/backend/src/modules/transactions/transactions.service.ts` (extender `createTransaction`)
- `apps/backend/src/app.ts` (montar routers nuevos; el callback de Google queda fuera de `requireAuth`)
- `apps/backend/src/config.ts`, `.env`/`.env.example` (env vars nuevas)
- `apps/backend/package.json` (agregar `@google/genai` y `zod-to-json-schema`)
- `packages/shared/src/transaction.ts` (`source`, `source_message_id`)
- `packages/shared/src/email-connection.ts` (nuevo tipo `EmailConnection`)
- `supabase/migrations/20260924000000_add_email_connections.sql`
- `supabase/migrations/20260924000001_add_transaction_source_and_message_id.sql`

### Contrato de endpoints
```
POST   /email-connections/google/start     (auth)   → { data: { authorizeUrl } }
GET    /email-connections/google/callback  (público) → 302 mobile://email-sync-callback?status=...
GET    /email-connections                  (auth)   → { data: { connected, email, status, last_synced_at } }
DELETE /email-connections                  (auth)   → 204
POST   /email-sync/check                   (auth)   → { data: { status, imported, skipped, errors } }
```

## Parte 2 — Mobile/UX

### 1. Ubicación de la UI
Una tarjeta nueva **dentro de `apps/mobile/src/app/(app)/account.tsx`** (no pantalla dedicada — mismo patrón que "Perfil"/"Apariencia"). Estados: no conectado (botón "Conectar Gmail"), conectado (correo + última sync + "Desconectar" con `Dialog` de confirmación, mismo patrón que borrar transacción), necesita reconectar (badge/aviso + botón "Reconectar" reusando el mismo flujo).

### 2. Flujo de conexión (confirmado contra doc real de Expo SDK 57)
No `useAuthRequest` (es para cuando el móvil es el cliente OAuth) — sí `WebBrowser.openAuthSessionAsync` + `makeRedirectUri({ scheme: "mobile", path: "email-sync-callback" })`, ya que el intercambio de código vive en el backend. `expo-auth-session`/`expo-web-browser` ya están instalados, sin dependencias nuevas. `result.type === "cancel"/"dismiss"` no es error, solo resetea el loading.

### 3. Disparo de la sincronización perezosa
Reusa el patrón ya existente de TanStack Query (misma idea que `budgetsKey` compartida entre pantallas) — sin throttling a mano:
```ts
useQuery({
  queryKey: ["email-sync-check"],
  queryFn: () => apiFetch("/email-sync/check", { method: "POST" }).then(r => r.data),
  enabled, // solo si connection.status === "connected"
  staleTime: 5 * 60 * 1000,
})
```
Llamado desde Home y desde `transactions/index.tsx`; al compartir `queryKey`, TanStack Query deduplica sola. Si `imported > 0`, invalidar `["transactions"]`, `budgetsKey`, `["expense-summary"]`.

### 4. Mostrar transacciones automáticas
Ícono pequeño `mail-outline` junto a fecha/nota cuando `transaction.source === "email-ai"` (en `transactions/index.tsx` y "Últimos gastos" del Home). **Sin** badge de texto, **sin** push, **sin** flujo de revisión nuevo — el pedido fue "automático, sin confirmar nada", y la red de seguridad ya existe: cualquier fila es tocable hacia `/transaction/[id]` (edición ya existente) para corregir/borrar.

### 5. Errores / reconexión
`GET /email-connections` es la única fuente de verdad del estado. El móvil nunca infiere "necesita reconectar" desde el resultado de `/email-sync/check`; si esa llamada falla, solo invalida la query de conexión para refrescar el estado la próxima vez.

### Archivos nuevos/modificados (mobile)
- `apps/mobile/src/hooks/use-email-connection.ts` (nuevo: `useEmailConnection`, `useConnectGmail`, `useDisconnectGmail`)
- `apps/mobile/src/hooks/use-email-sync.ts` (nuevo: `useEmailSyncCheck`)
- `apps/mobile/src/app/(app)/account.tsx` (tarjeta nueva + diálogo de desconexión)
- `apps/mobile/src/app/(app)/index.tsx`, `apps/mobile/src/app/(app)/transactions/index.tsx` (disparo del sync + ícono de fuente)
- Posible `apps/mobile/src/components/transaction-source-icon.tsx` (evita duplicar el ícono en 2 listas)

## Configuración manual externa (no automatizable, la haces tú)
1. Crear/seleccionar proyecto en Google Cloud Console, habilitar "Gmail API".
2. Configurar pantalla de consentimiento OAuth (tipo Externo, scope `gmail.readonly`, agregar tu cuenta Gmail real como test user). En modo "Testing" los refresh tokens expiran a los 7 días — para uso continuo, pasar a "Production" (queda "no verificada", requiere aceptar un aviso de Google la primera vez, aceptable para uso personal).
3. Crear credenciales OAuth "Web application", registrar como redirect URI tanto `http://localhost:4000/email-connections/google/callback` (pruebas del backend solo) como la URL HTTPS de ngrok (prueba real desde el teléfono).
4. Correr `ngrok http 4000`, setear `GOOGLE_OAUTH_REDIRECT_URI` con esa URL HTTPS + `/email-connections/google/callback`.
5. Conseguir una API key de Gemini (gratis) en [Google AI Studio](https://aistudio.google.com/apikey) y setearla como `GEMINI_API_KEY` en `apps/backend/.env`.

## Verificación end-to-end
1. Aplicar las 2 migraciones nuevas (`npx supabase migration up` o `db reset`).
2. Backend + ngrok corriendo; desde el móvil, "Conectar Gmail" → navegador del sistema se abre y cierra solo, tarjeta pasa a "conectado".
3. Cancelar a medias → vuelve a "no conectado" sin error falso.
4. Confirmar en la BD que `refresh_token_encrypted` no es texto plano.
5. Enviar un correo de prueba con texto tipo notificación bancaria real a la cuenta conectada.
6. Abrir el Home (o `POST /email-sync/check` vía curl) → verificar en logs que detecta el correo, llama a Gemini, crea la transacción con `source: "email-ai"`.
7. Repetir el sync sin correos nuevos → no duplica, `last_synced_at` avanza.
8. Correo ambiguo/de categoría no anticipada → cae en "Otros gastos"/"Otros ingresos", no falla silenciosamente.
9. Revocar acceso desde myaccount.google.com/permissions → siguiente sync marca `status='revoked'` con `last_error`, sin loop de reintentos; la UI de cuenta debe reflejar "reconectar".
10. `DELETE /email-connections` desconecta limpio; Home deja de llamar al sync.
11. Tocar una transacción con ícono de sobre → edita/borra igual que cualquier otra.
12. `pnpm typecheck` en la raíz limpio antes de dar por cerrada cada etapa.

## Nota sobre el proveedor de IA

Este plan usa **Gemini** (`@google/genai`, paquete oficial confirmado contra `googleapis/js-genai`) en vez de Claude/Anthropic, a pedido explícito del usuario. La API de extracción estructurada usada es `ai.models.generateContent({ model, contents, config: { responseMimeType: "application/json", responseJsonSchema } })`, con un schema Zod como fuente de verdad (convertido a JSON Schema con `zod-to-json-schema`, y usado también para validar la respuesta antes de confiar en ella).
- `supabase/migrations/20260924000001_add_transaction_source_and_message_id.sql` (nuevo)

Nada de esto se verificó todavía (ni typecheck ni pruebas). Nada de la Parte 2 (mobile) se tocó.
