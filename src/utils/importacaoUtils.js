import { normalizeDate, normalizeGrupo, normalizeMoney, normalizeStatus, normalizeText, normalizeTipo } from "./normalizers";
import { normalizarCompetencia } from "./competencia";
import { normalizeLancamento } from "./lancamentoModel";

const COLUMN_ALIASES = {
  data: ["data", "dt", "data pagamento", "data pagto", "vencimento", "data vencimento"],
  competencia: ["mes", "competencia", "periodo", "referencia"],
  tipo: ["tipo", "tipo receita despesa", "entrada saida", "natureza"],
  grupo: ["grupo", "grupo dre", "classificacao", "macrogrupo"],
  categoria: ["categoria", "classe", "plano de contas", "conta", "subcategoria"],
  descricao: ["descricao", "historico", "lancamento", "detalhe", "observacao"],
  valor: ["valor", "valor r", "valor r$", "valor rs", "valor (r$)", "valor (rs)", "total", "montante"],
  entrada: ["entrada", "receita", "credito", "recebimento"],
  saida: ["saida", "despesa", "debito", "pagamento"],
  status: ["status", "pago", "pago?", "baixado", "situacao"],
};

function normalizeHeader(value) {
  return normalizeText(value).replace(/[^a-z0-9]/g, "");
}

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

function isRowEmpty(row = []) {
  return !row.some((cell) => !isBlank(cell));
}

function getCell(row, aliases) {
  const entries = Object.entries(row || {});
  const normalizedAliases = aliases.map(normalizeHeader);

  for (const [key, value] of entries) {
    const header = normalizeHeader(key);
    if (!header) continue;
    if (normalizedAliases.some((alias) => header === alias || header.includes(alias) || alias.includes(header))) {
      return value;
    }
  }

  return "";
}

function inferTipoAndValor(row) {
  const tipoRaw = getCell(row, COLUMN_ALIASES.tipo);
  const valorRaw = getCell(row, COLUMN_ALIASES.valor);

  if (!isBlank(valorRaw)) {
    return {
      tipo: normalizeTipo(tipoRaw),
      valor: Math.abs(normalizeMoney(valorRaw)),
    };
  }

  const entrada = Math.abs(normalizeMoney(getCell(row, COLUMN_ALIASES.entrada)));
  const saida = Math.abs(normalizeMoney(getCell(row, COLUMN_ALIASES.saida)));

  if (entrada > 0) return { tipo: "receita", valor: entrada };
  if (saida > 0) return { tipo: "despesa", valor: saida };

  return { tipo: normalizeTipo(tipoRaw), valor: 0 };
}

function headerScore(row = []) {
  const headers = row.map(normalizeHeader).filter(Boolean);
  const text = headers.join("|");

  let score = 0;
  if (headers.some((h) => ["data", "dt", "datapagamento"].includes(h))) score += 1;
  if (headers.some((h) => ["mes", "competencia", "periodo", "referencia"].includes(h))) score += 1;
  if (headers.some((h) => ["tipo", "tiporeceitadespesa", "entradasaida"].includes(h))) score += 1;
  if (headers.some((h) => ["categoria", "classe", "conta", "subcategoria"].includes(h))) score += 1;
  if (headers.some((h) => ["descricao", "historico", "lancamento", "detalhe"].includes(h))) score += 1;
  if (headers.some((h) => h.includes("valor") || h === "total" || h === "montante")) score += 1;
  if (text.includes("pago") || text.includes("status")) score += 1;

  return score;
}

function findTabularHeaderIndex(aoa = []) {
  let bestIndex = -1;
  let bestScore = 0;

  aoa.slice(0, 25).forEach((row, index) => {
    const score = headerScore(row);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestScore >= 4 ? bestIndex : -1;
}

function rowToObject(headers = [], values = []) {
  const obj = {};

  headers.forEach((header, index) => {
    const key = String(header ?? "").trim();
    if (key) obj[key] = values[index] ?? "";
  });

  return obj;
}

function montarLancamentosTabulares(aoa = [], context = {}, sheetName = "") {
  const headerIndex = findTabularHeaderIndex(aoa);
  if (headerIndex < 0) {
    return { lancamentos: [], ignorados: [], linhasLidas: 0, zerados: 0, tipoLeitura: "nenhuma" };
  }

  const headers = aoa[headerIndex].map((item) => String(item ?? "").trim());
  const dataRows = aoa.slice(headerIndex + 1).filter((row) => !isRowEmpty(row));
  const lancamentos = [];
  const ignorados = [];
  let zerados = 0;

  dataRows.forEach((values, index) => {
    const row = rowToObject(headers, values);
    const dataRaw = getCell(row, COLUMN_ALIASES.data);
    const competenciaRaw = getCell(row, COLUMN_ALIASES.competencia);
    const grupoRaw = getCell(row, COLUMN_ALIASES.grupo);
    const categoriaRaw = getCell(row, COLUMN_ALIASES.categoria);
    const descricaoRaw = getCell(row, COLUMN_ALIASES.descricao);
    const statusRaw = getCell(row, COLUMN_ALIASES.status);
    let { tipo, valor } = inferTipoAndValor(row);

    valor = Math.abs(Number(valor) || 0);

    if (valor === 0) {
      zerados += 1;
      return;
    }

    const data = normalizeDate(dataRaw);
    const competencia = normalizarCompetencia(competenciaRaw) || normalizarCompetencia(data) || normalizarCompetencia(sheetName);
    const categoria = String(categoriaRaw || descricaoRaw || "Geral").trim();
    const descricao = String(descricaoRaw || categoriaRaw || "Lancamento importado").trim();
    const grupo = normalizeGrupo(grupoRaw, tipo, categoria);

    const motivo = [];
    if (!competencia) motivo.push("competencia invalida");
    if (!categoria) motivo.push("categoria vazia");
    if (!descricao) motivo.push("descricao vazia");

    if (motivo.length) {
      ignorados.push({ linha: headerIndex + index + 2, motivo: motivo.join(", ") });
      return;
    }

    lancamentos.push(normalizeLancamento({
      data: data || `${competencia}-01`,
      competencia,
      tipo,
      grupo,
      categoria,
      descricao,
      valor: Math.abs(valor),
      status: normalizeStatus(statusRaw),
      observacao: `Importado da aba ${sheetName}`,
      source: "importacao_tabular",
    }, context));
  });

  return { lancamentos, ignorados, linhasLidas: dataRows.length, zerados, tipoLeitura: "tabular" };
}

function findPlanningHeaderIndex(aoa = []) {
  for (let i = 0; i < Math.min(30, aoa.length); i += 1) {
    const row = aoa[i] || [];
    const hasCategoria = row.some(cell => normalizeHeader(cell).includes("categoria"));
    const months = row.map((cell) => normalizarCompetencia(cell)).filter(Boolean);

    if (hasCategoria && months.length >= 2) {
      return i;
    }
  }

  return -1;
}

function shouldSkipPlanningLine(label) {
  const value = normalizeText(label);
  if (!value) return true;

  return [
    "total",
    "subtotal",
    "saldo",
    "acumulado",
    "resultado",
    "meta",
    "fechamento",
    "diferenca",
  ].some((term) => value.includes(term));
}

function updatePlanningSection(label, current) {
  const value = normalizeText(label);

  if (value.includes("receita")) {
    return { tipo: "receita", grupo: "receitas" };
  }

  if (value.includes("financeira") || value.includes("financeiras")) {
    return { tipo: "despesa", grupo: "despesas_financeiras" };
  }

  if (value.includes("fixa") || value.includes("fixas") || value.includes("essencial")) {
    return { tipo: "despesa", grupo: "despesas_fixas" };
  }

  if (value.includes("variavel") || value.includes("variaveis")) {
    return { tipo: "despesa", grupo: "despesas_variaveis" };
  }

  if (value.includes("despesa")) {
    return { tipo: "despesa", grupo: "despesas_variaveis" };
  }

  return current;
}

function montarLancamentosPlanejamento(aoa = [], context = {}, sheetName = "") {
  const headerIndex = findPlanningHeaderIndex(aoa);
  if (headerIndex < 0) {
    return { lancamentos: [], ignorados: [], linhasLidas: 0, zerados: 0, tipoLeitura: "nenhuma" };
  }

  const header = aoa[headerIndex] || [];
  
  const categoriaIndex = header.findIndex(cell => normalizeHeader(cell).includes("categoria"));
  const labelIndex = Math.max(0, categoriaIndex);

  const months = header.map((cell, index) => ({ 
    index, 
    competencia: normalizarCompetencia(cell), 
    label: String(cell ?? "").trim() 
  })).filter((item) => item.competencia && item.index !== labelIndex);

  const lancamentos = [];
  const ignorados = [];
  let current = { tipo: "", grupo: "" };
  let linhasLidas = 0;
  let zerados = 0;

  aoa.slice(headerIndex + 1).forEach((row) => {
    if (isRowEmpty(row)) return;

    linhasLidas += 1;
    const label = String(row[labelIndex] ?? "").trim();
    const numericValues = months.map((month) => Math.abs(normalizeMoney(row[month.index]))).filter((valor) => valor > 0);

    if (!numericValues.length) {
      current = updatePlanningSection(label, current);
      return;
    }

    if (shouldSkipPlanningLine(label)) return;

    const labelNorm = normalizeText(label);
    const tipo = labelNorm.includes("receita") ? "receita" : (current.tipo || "despesa");
    const grupo = tipo === "receita" ? "receitas" : (current.grupo || normalizeGrupo("", tipo, label));

    months.forEach((month) => {
      const valRaw = row[month.index];
      const valor = Math.abs(normalizeMoney(valRaw));
      
      if (!valor || valor === 0) {
        if (!isBlank(valRaw)) {
          zerados += 1;
        }
        return;
      }

      lancamentos.push(normalizeLancamento({
        data: `${month.competencia}-01`,
        competencia: month.competencia,
        tipo,
        grupo,
        categoria: label,
        descricao: label,
        valor,
        status: "pendente",
        observacao: `Planejamento importado da aba ${sheetName}`,
        source: "planejamento_importado",
      }, context));
    });
  });

  return { lancamentos, ignorados, linhasLidas, zerados, tipoLeitura: "planejamento" };
}

export function montarLancamentosDaAba(aoa = [], context = {}, sheetName = "") {
  const planejamento = montarLancamentosPlanejamento(aoa, context, sheetName);

  if (planejamento.lancamentos.length > 0) {
    return planejamento;
  }

  return montarLancamentosTabulares(aoa, context, sheetName);
}
