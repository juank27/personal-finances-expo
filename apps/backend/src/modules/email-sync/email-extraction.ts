import type { Category } from "@finanzas/shared";
import { zodToJsonSchema } from "zod-to-json-schema";
import { z } from "zod";
import { config } from "../../config";
import { gemini } from "../../lib/gemini";
import type { GmailMessage } from "../../lib/gmail-client";

export const bankEmailExtractionSchema = z.object({
  is_bank_transaction: z.boolean(),
  confidence: z.number().min(0).max(1),
  amount: z.number().positive().nullable(),
  type: z.enum(["income", "expense"]).nullable(),
  note: z.string().max(280).nullable(),
  category_id: z.string().uuid().nullable(),
});

export type BankEmailExtraction = z.infer<typeof bankEmailExtractionSchema>;

// zod-to-json-schema's generic signature hits TS's type-instantiation depth limit on this
// schema's nested ZodNullable<ZodEnum<...>> members — the `unknown` hop breaks the
// structural inference that triggers it, without weakening the runtime call at all.
const schemaForJsonSchema = bankEmailExtractionSchema as unknown as Parameters<
  typeof zodToJsonSchema
>[0];
const RESPONSE_JSON_SCHEMA = zodToJsonSchema(schemaForJsonSchema);

function buildPrompt(email: GmailMessage, categories: Category[]): string {
  const categoryList = categories
    .map((c) => `- id=${c.id} type=${c.type} name="${c.name}"`)
    .join("\n");

  return `Eres un clasificador de correos bancarios. Analiza el siguiente correo y determina si es una notificación real de un movimiento de dinero (compra, pago, transferencia, depósito, retiro, etc.) de una cuenta bancaria o tarjeta.

No es un movimiento real: promociones, estados de cuenta resumen, avisos de vencimiento sin cargo, publicidad, correos que no son de un banco/billetera/fintech.

Si SÍ es un movimiento real:
- amount: el monto en números, siempre positivo.
- type: "expense" si salió dinero (compra, pago, retiro), "income" si entró dinero (depósito, transferencia recibida).
- note: una descripción corta (máx 280 caracteres) útil para el usuario, ej. el comercio o el origen/destino.
- category_id: el id de la categoría más apropiada de esta lista (o null si ninguna aplica bien):
${categoryList}

Si NO es un movimiento real, o no puedes determinar el monto/tipo con confianza, pon is_bank_transaction=false y los demás campos en null.

confidence: qué tan seguro estás de que es un movimiento bancario real (0 a 1).

Correo:
De: ${email.from}
Asunto: ${email.subject}
Fecha: ${email.date}
Cuerpo:
${email.bodyText}`;
}

const RETRYABLE_STATUS_CODES = new Set([429, 503]);
const MAX_RETRIES = 2;

// Gemini flash models routinely return a transient 503 "high demand" error — without a
// retry, that single blip permanently loses the email: the sync watermark still advances
// past it once the run finishes (see email-sync.service.ts), so it's never re-checked.
async function generateWithRetry(
  request: Parameters<typeof gemini.models.generateContent>[0]
): Promise<Awaited<ReturnType<typeof gemini.models.generateContent>>> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await gemini.models.generateContent(request);
    } catch (err) {
      const status = (err as { status?: number } | undefined)?.status;
      if (!status || !RETRYABLE_STATUS_CODES.has(status) || attempt >= MAX_RETRIES) throw err;
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
    }
  }
}

export async function extractBankTransaction(
  email: GmailMessage,
  categories: Category[]
): Promise<BankEmailExtraction> {
  const response = await generateWithRetry({
    model: config.EMAIL_SYNC_LLM_MODEL,
    contents: buildPrompt(email, categories),
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: RESPONSE_JSON_SCHEMA,
    },
  });

  return bankEmailExtractionSchema.parse(JSON.parse(response.text ?? ""));
}
