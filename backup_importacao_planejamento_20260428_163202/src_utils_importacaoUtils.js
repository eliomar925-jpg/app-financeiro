import { normalizeDate, normalizeGrupo, normalizeMoney, normalizeStatus, normalizeText, normalizeTipo } from "./normalizers";
import { normalizarCompetencia } from "./competencia";
import { normalizeLancamento } from "./lancamentoModel";

const COLUMN_ALIASES = {
  data: ["data", "dt", "data pagamento", "data pagto", "vencimento", "data vencimento"],
  competencia: ["mes", "mÃªs", "competencia", "competÃªncia", "periodo", "perÃ­odo", "referencia", "referÃªncia"],
  tipo: ["tipo", "tipo receita despesa", "entrada saida", "entrada/saida", "entrada/saÃ­da", "natureza"],
  grupo: ["grupo", "grupo dre", "classificacao", "classificaÃ§Ã£o", "macrogrupo"],
  categoria: ["categoria", "classe", "plano de contas", "conta", "subcategoria"],
  descricao: ["descricao", "descriÃ§Ã£o", "historico", "histÃ³rico", "lancamento", "lanÃ§amento", "detalhe", "observacao", "observaÃ§Ã£o"],
  valor: ["valor", "valor r", "valor r$", "valor (r$)", "total", "montante"],
  entrada: ["entrada", "receita", "credito", "crÃ©dito", "recebimento"],
  saida: ["saida", "saÃ­da", "despesa", "debito", "dÃ©bito", "pagamento"],
  status: ["status", "pago", "pago?", "pago s n", "pago? s/n", "baixado", "situacao", "situaÃ§Ã£o"],
};

function normalizeHeader(value) {
  return normalizeText(value).replace(/[^a-z0-9]/g, "");
}

function getCell(row, aliases) {
  const entries = Object.entries(row || {});
  const normalizedAliases = aliases.map(normalizeHeader);

  for (const [key, value] of entries) {
    const header = normalizeHeader(key);
    if (normalizedAliases.some((alias) => header === alias || header.includes(alias) || alias.includes(header))) {
      return value;
    }
  }

  return "";
}

function inferTipoAndValor(row) {
  const tipoRaw = getCell(row, COLUMN_ALIASES.tipo);
  const valorRaw = getCell(row, COLUMN_ALIASES.valor);

  if (valorRaw !== "" && valorRaw !== null && valorRaw !== undefined) {
    return {
      tipo: normalizeTipo(tipoRaw),
      valor: normalizeMoney(valorRaw),
    };
  }

  const entradaRaw = getCell(row, COLUMN_ALIASES.entrada);
  const saidaRaw = getCell(row, COLUMN_ALIASES.saida);
  const entrada = normalizeMoney(entradaRaw);
  const saida = normalizeMoney(saidaRaw);

  if (entrada > 0) return { tipo: "receita", valor: entrada };
  if (saida > 0) return { tipo: "despesa", valor: saida };

  return { tipo: normalizeTipo(tipoRaw), valor: 0 };
}

export function escolherAba(workbook) {
  const abaLancamentos = workbook.SheetNames.find((name) =>
    normalizeText(name).includes("lanc") || normalizeText(name).includes("base")
  );

  return abaLancamentos || workbook.SheetNames[0];
}

export function montarLancamentos(rows = [], context = {}, sheetName = "") {
  const lancamentos = [];
  const ignorados = [];

  rows.forEach((row, index) => {
    const dataRaw = getCell(row, COLUMN_ALIASES.data);
    const competenciaRaw = getCell(row, COLUMN_ALIASES.competencia);
    const grupoRaw = getCell(row, COLUMN_ALIASES.grupo);
    const categoriaRaw = getCell(row, COLUMN_ALIASES.categoria);
    const descricaoRaw = getCell(row, COLUMN_ALIASES.descricao);
    const statusRaw = getCell(row, COLUMN_ALIASES.status);
    const { tipo, valor } = inferTipoAndValor(row);

    const data = normalizeDate(dataRaw);
    const competencia = normalizarCompetencia(competenciaRaw) || normalizarCompetencia(data) || normalizarCompetencia(sheetName);
    const categoria = String(categoriaRaw || "").trim();
    const descricao = String(descricaoRaw || "").trim();
    const grupo = normalizeGrupo(grupoRaw, tipo, categoria);

    const motivo = [];
    if (!competencia) motivo.push("competÃªncia invÃ¡lida");
    if (!categoria) motivo.push("categoria vazia");
    if (!descricao) motivo.push("descriÃ§Ã£o vazia");
    if (!valor || valor <= 0) motivo.push("valor invÃ¡lido");

    if (motivo.length) {
      ignorados.push({ linha: index + 2, motivo: motivo.join(", ") });
      return;
    }

    const payload = normalizeLancamento({
      data: data || `${competencia}-01`,
      competencia,
      tipo,
      grupo,
      categoria,
      descricao,
      valor,
      status: normalizeStatus(statusRaw),
      observacao: `Importado da aba ${sheetName}`,
      source: "importacao",
    }, context);

    lancamentos.push(payload);
  });

  return { lancamentos, ignorados };
}
