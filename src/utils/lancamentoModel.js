import {
  inferCompetencia,
  normalizeCategoria,
  normalizeDate,
  normalizeGrupo,
  normalizeMoney,
  normalizeStatus,
  normalizeTipo,
} from "./normalizers";

export function normalizeLancamento(raw = {}, context = {}) {
  const tipo = normalizeTipo(raw.tipo);
  const data = normalizeDate(raw.data);
  const categoria = normalizeCategoria(raw.categoria || raw.grupo || "Geral");
  const grupo = normalizeGrupo(raw.grupo, tipo, categoria);
  const competencia = raw.competencia || inferCompetencia(data);
  const valor = normalizeMoney(raw.valor);
  const status = normalizeStatus(raw.status);

  return {
    id: raw.id || null,
    householdId: raw.householdId || context.householdId || null,
    userId: raw.userId || context.userId || null,
    createdBy: raw.createdBy || context.userId || null,
    updatedBy: context.userId || raw.updatedBy || null,
    competencia,
    data,
    tipo,
    grupo,
    categoria,
    descricao: String(raw.descricao || "").trim(),
    valor,
    status,
    observacao: String(raw.observacao || "").trim(),
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
    source: raw.source || "manual",
  };
}