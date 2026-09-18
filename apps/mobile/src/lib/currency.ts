const formatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatCOP(amount: string | number): string {
  return formatter.format(Number(amount));
}

function trimTrailingZero(value: number): string {
  return value.toFixed(1).replace(/\.0$/, "");
}

// Compact form for tight spaces (chart totals/legends) — e.g. "$10K", "$1.5M" — where the
// full peso amount (formatCOP) would be too wide or visually heavy. Not used for anything
// that needs exact precision (transaction rows, budget amounts keep formatCOP).
export function formatCOPCompact(amount: string | number): string {
  const value = Number(amount);
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);

  if (abs >= 1_000_000) {
    return `${sign}$${trimTrailingZero(abs / 1_000_000)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}$${trimTrailingZero(abs / 1_000)}K`;
  }
  return formatCOP(value);
}

// Strips everything but digits — used while typing an amount so the field's real value
// (submitted to the API) is always a clean integer string, regardless of what separators
// are shown on screen.
export function digitsOnly(text: string): string {
  return text.replace(/\D/g, "");
}

// Live "." thousands-grouping for an amount input as the user types, e.g. "15000" -> "15.000".
export function formatDigitsWithThousands(digits: string): string {
  if (!digits) return "";
  return Number(digits).toLocaleString("es-CO");
}
