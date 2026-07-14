export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function normalizeMoney(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.abs(value) : 0;
  }

  const original = String(value ?? "").trim();
  if (!original || original === "-" || original.toUpperCase() === "N/A") return 0;

  const negativeByParentheses = /^\(.*\)$/.test(original);
  const negativeBySign = original.includes("-");
  let raw = original
    .replace(/^\((.*)\)$/g, "$1")
    .replace(/R\$/gi, "")
    .replace(/\s/g, "")
    .replace(/[^\d,.-]/g, "")
    .replace(/-/g, "");

  if (!raw) return 0;

  const lastComma = raw.lastIndexOf(",");
  const lastDot = raw.lastIndexOf(".");
  let normalized = raw;

  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      normalized = raw.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = raw.replace(/,/g, "");
    }
  } else if (lastComma > -1) {
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > -1) {
    const parts = raw.split(".");
    if (parts.length > 2) {
      const last = parts.at(-1);
      normalized = last.length <= 2
        ? `${parts.slice(0, -1).join("")}.${last}`
        : parts.join("");
    } else {
      const [before, after] = parts;
      normalized = after?.length === 3 && before.length <= 3
        ? `${before}${after}`
        : raw;
    }
  }

  const signed = negativeByParentheses || negativeBySign ? `-${normalized}` : normalized;
  const parsed = Number(signed);
  return Number.isFinite(parsed) ? Math.abs(parsed) : 0;
}

function excelSerialToDate(serial) {
  const excelEpoch = Date.UTC(1899, 11, 30);
  const millis = excelEpoch + Number(serial) * 24 * 60 * 60 * 1000;
  const date = new Date(millis);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export function normalizeDate(value) {
  if (!value) return "";

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return excelSerialToDate(value);
  }

  const raw = String(value).trim();
  if (!raw) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [dd, mm, yyyy] = raw.split("/");
    return `${yyyy}-${mm}-${dd}`;
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(raw)) {
    const [ddRaw, mmRaw, yy] = raw.split("/");
    const dd = ddRaw.padStart(2, "0");
    const mm = mmRaw.padStart(2, "0");
    const yyyy = `20${yy}`;
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
  return normalized ? normalized.slice(0, 7) : "";
}

export function normalizeStatus(status) {
  const value = normalizeText(status);
  if (["s", "sim", "pago", "paga", "paid", "quitado", "quitada", "ok", "baixado"].includes(value)) {
    return "pago";
  }
  return "pendente";
}

export function normalizeTipo(tipo) {
  const value = normalizeText(tipo);
  if (["receita", "receitas", "entrada", "entradas", "credito", "creditos", "recebimento", "income"].includes(value)) {
    return "receita";
  }
  return "despesa";
}

export function normalizeGrupo(grupo, tipo = "", categoria = "") {
  const grupoNorm = normalizeText(grupo);
  const tipoNorm = normalizeTipo(tipo);
  const categoriaNorm = normalizeText(categoria);

  if (tipoNorm === "receita") return "receitas";

  if (grupoNorm.includes("finance") || categoriaNorm.includes("juros") || categoriaNorm.includes("cartao") || categoriaNorm.includes("emprestimo") || categoriaNorm.includes("financiamento")) {
    return "despesas_financeiras";
  }

  if (grupoNorm.includes("fix") || grupoNorm.includes("essencial") || categoriaNorm.includes("aluguel") || categoriaNorm.includes("condominio") || categoriaNorm.includes("internet") || categoriaNorm.includes("telefone") || categoriaNorm.includes("escola") || categoriaNorm.includes("saude") || categoriaNorm.includes("plano")) {
    return "despesas_fixas";
  }

  return "despesas_variaveis";
}

export function normalizeCategoria(categoria) {
  return String(categoria ?? "").trim().replace(/\s+/g, " ");
}
