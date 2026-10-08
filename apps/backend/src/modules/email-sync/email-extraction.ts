import type { Category } from "@finanzas/shared";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
// zodOutputFormat()'s type signature requires a zod/v4 schema specifically — the `zod`
// package (classic v3 API, used everywhere else in this project) and `zod/v4` are
// structurally different ZodType hierarchies even though both ship inside the same
// `zod` npm package from 3.25+. This is the only file in the project that needs the v4
// import; the resulting z.infer<> shape is identical to what a v3 schema would produce.
import { z } from "zod/v4";
import { config } from "../../config";
import { claude } from "../../lib/anthropic";
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

export async function extractBankTransaction(
  email: GmailMessage,
  categories: Category[]
): Promise<BankEmailExtraction> {
  const response = await claude.messages.parse({
    model: config.EMAIL_SYNC_LLM_MODEL,
    max_tokens: 512,
    messages: [{ role: "user", content: buildPrompt(email, categories) }],
    output_config: {
      format: zodOutputFormat(bankEmailExtractionSchema),
    },
  });

  if (!response.parsed_output) {
    throw new Error("Claude no devolvió un resultado parseable");
  }

  return response.parsed_output;
}
