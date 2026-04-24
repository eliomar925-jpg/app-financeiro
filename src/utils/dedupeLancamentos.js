import { normalizeText } from "./normalizers";

export function buildLancamentoKey(lancamento) {
  const competencia = lancamento.competencia || "";
  const data = lancamento.data || "";
  const tipo = lancamento.tipo || "";
  const grupo = lancamento.grupo || "";
  const categoria = normalizeText(lancamento.categoria);
  const descricao = normalizeText(lancamento.descricao);
  const valor = Number(lancamento.valor || 0).toFixed(2);

  return [
    competencia,
    data,
    tipo,
    grupo,
    categoria,
    descricao,
    valor,
  ].join("|");
}

export function dedupeLancamentos(lista = []) {
  const map = new Map();

  for (const item of lista) {
    const key = buildLancamentoKey(item);

    if (!map.has(key)) {
      map.set(key, item);
    }
  }

  return Array.from(map.values());
}