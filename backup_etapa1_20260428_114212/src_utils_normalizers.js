export function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function normalizeMoney(value) {
  if (typeof value === "number") return value;

  const raw = String(value || "").trim();
  if (!raw) return 0;

  const cleaned = raw
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeDate(value) {
  if (!value) return "";

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const raw = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [dd, mm, yyyy] = raw.split("/");
    return `${yyyy}-${mm}-${dd}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return "";
}

export function inferCompetencia(dateStr) {
  const normalized = normalizeDate(dateStr);
  if (!normalized) return "";
  return normalized.slice(0, 7);
}

export function normalizeStatus(status) {
  const value = normalizeText(status);

  if (["pago", "paga", "paid", "quitado"].includes(value)) {
    return "pago";
  }

  return "pendente";
}

export function normalizeTipo(tipo) {
  const value = normalizeText(tipo);

  if (["receita", "entrada", "income"].includes(value)) {
    return "receita";
  }

  return "despesa";
}

export function normalizeGrupo(grupo, tipo = "", categoria = "") {
  const grupoNorm = normalizeText(grupo);
  const tipoNorm = normalizeTipo(tipo);
  const categoriaNorm = normalizeText(categoria);

  if (tipoNorm === "receita") return "receitas";

  if (
    grupoNorm.includes("fix") ||
    grupoNorm.includes("essencial") ||
    categoriaNorm.includes("aluguel") ||
    categoriaNorm.includes("condominio") ||
    categoriaNorm.includes("internet") ||
    categoriaNorm.includes("telefone") ||
    categoriaNorm.includes("escola") ||
    categoriaNorm.includes("saude") ||
    categoriaNorm.includes("plano")
  ) {
    return "despesas_fixas";
  }

  if (
    grupoNorm.includes("finance") ||
    categoriaNorm.includes("juros") ||
    categoriaNorm.includes("cartao") ||
    categoriaNorm.includes("emprestimo") ||
    categoriaNorm.includes("financiamento")
  ) {
    return "despesas_financeiras";
  }

  return "despesas_variaveis";
}

export function normalizeCategoria(categoria) {
  return String(categoria || "").trim().replace(/\s+/g, " ");
}