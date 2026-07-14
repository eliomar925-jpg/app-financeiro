# Corrige a importacao para aceitar planilhas de planejamento em formato aberto (Categoria x Meses)
# Execute dentro da pasta: C:\Projetos\app-financeiro

$ErrorActionPreference = "Stop"

if (!(Test-Path "package.json") -or !(Test-Path "src")) {
  Write-Host "ERRO: execute este script dentro de C:\Projetos\app-financeiro" -ForegroundColor Red
  exit 1
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "backup_importacao_planejamento_$timestamp"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

$filesToBackup = @(
  "src\utils\importacaoUtils.js",
  "src\components\ImportarLancamentos.jsx"
)

foreach ($file in $filesToBackup) {
  if (Test-Path $file) {
    $dest = Join-Path $backupDir ($file -replace "[\\/:]", "_")
    Copy-Item $file $dest -Force
  }
}

if (!(Test-Path "src\utils")) {
  New-Item -ItemType Directory -Path "src\utils" -Force | Out-Null
}

Set-Content -Encoding UTF8 -Path "src\utils\importacaoUtils.js" -Value @'
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
    return { lancamentos: [], ignorados: [], linhasLidas: 0, tipoLeitura: "nenhuma" };
  }

  const headers = aoa[headerIndex].map((item) => String(item ?? "").trim());
  const dataRows = aoa.slice(headerIndex + 1).filter((row) => !isRowEmpty(row));
  const lancamentos = [];
  const ignorados = [];

  dataRows.forEach((values, index) => {
    const row = rowToObject(headers, values);
    const dataRaw = getCell(row, COLUMN_ALIASES.data);
    const competenciaRaw = getCell(row, COLUMN_ALIASES.competencia);
    const grupoRaw = getCell(row, COLUMN_ALIASES.grupo);
    const categoriaRaw = getCell(row, COLUMN_ALIASES.categoria);
    const descricaoRaw = getCell(row, COLUMN_ALIASES.descricao);
    const statusRaw = getCell(row, COLUMN_ALIASES.status);
    const { tipo, valor } = inferTipoAndValor(row);

    const data = normalizeDate(dataRaw);
    const competencia = normalizarCompetencia(competenciaRaw) || normalizarCompetencia(data) || normalizarCompetencia(sheetName);
    const categoria = String(categoriaRaw || descricaoRaw || "Geral").trim();
    const descricao = String(descricaoRaw || categoriaRaw || "Lancamento importado").trim();
    const grupo = normalizeGrupo(grupoRaw, tipo, categoria);

    const motivo = [];
    if (!competencia) motivo.push("competencia invalida");
    if (!categoria) motivo.push("categoria vazia");
    if (!descricao) motivo.push("descricao vazia");
    if (!valor || valor <= 0) motivo.push("valor invalido");

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

  return { lancamentos, ignorados, linhasLidas: dataRows.length, tipoLeitura: "tabular" };
}

function findPlanningHeaderIndex(aoa = []) {
  for (let i = 0; i < Math.min(30, aoa.length); i += 1) {
    const row = aoa[i] || [];
    const first = normalizeHeader(row[0]);
    const months = row.slice(1).map((cell) => normalizarCompetencia(cell)).filter(Boolean);

    if ((first === "categoria" || first.includes("categoria")) && months.length >= 2) {
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
    return { lancamentos: [], ignorados: [], linhasLidas: 0, tipoLeitura: "nenhuma" };
  }

  const header = aoa[headerIndex] || [];
  const months = header.map((cell, index) => ({ index, competencia: normalizarCompetencia(cell), label: String(cell ?? "").trim() }))
    .filter((item) => item.index > 0 && item.competencia);

  const lancamentos = [];
  const ignorados = [];
  let current = { tipo: "", grupo: "" };
  let linhasLidas = 0;

  aoa.slice(headerIndex + 1).forEach((row, relativeIndex) => {
    if (isRowEmpty(row)) return;

    linhasLidas += 1;
    const label = String(row[0] ?? "").trim();
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
      const valor = Math.abs(normalizeMoney(row[month.index]));
      if (!valor || valor <= 0) return;

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

  return { lancamentos, ignorados, linhasLidas, tipoLeitura: "planejamento" };
}

export function montarLancamentosDaAba(aoa = [], context = {}, sheetName = "") {
  const planejamento = montarLancamentosPlanejamento(aoa, context, sheetName);

  if (planejamento.lancamentos.length > 0) {
    return planejamento;
  }

  return montarLancamentosTabulares(aoa, context, sheetName);
}
'@

Set-Content -Encoding UTF8 -Path "src\components\ImportarLancamentos.jsx" -Value @'
import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useAuth } from "../context/AuthContext";
import { useLancamentos } from "../hooks/useLancamentos";
import { salvarLancamento } from "../services/lancamentosService";
import { buildLancamentoKey } from "../utils/dedupeLancamentos";
import { montarLancamentosDaAba } from "../utils/importacaoUtils";

export default function ImportarLancamentos() {
  const inputRef = useRef(null);
  const { user, userProfile } = useAuth();
  const { lancamentos, recarregar } = useLancamentos();
  const [loading, setLoading] = useState(false);

  function handleOpenPicker() {
    if (loading) return;
    inputRef.current?.click();
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file || !user?.uid) return;

    setLoading(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

      const context = {
        householdId: userProfile?.householdId || null,
        userId: user.uid,
      };

      const todosNovos = [];
      const todosIgnorados = [];
      const resumoAbas = [];
      let linhasLidas = 0;

      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) return;

        const aoa = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: "",
          raw: false,
        });

        const resultado = montarLancamentosDaAba(aoa, context, sheetName);
        linhasLidas += resultado.linhasLidas || 0;
        todosNovos.push(...resultado.lancamentos);
        todosIgnorados.push(...resultado.ignorados.map((item) => ({ ...item, aba: sheetName })));

        resumoAbas.push({
          aba: sheetName,
          tipo: resultado.tipoLeitura,
          lidas: resultado.linhasLidas || 0,
          geradas: resultado.lancamentos.length,
          ignoradas: resultado.ignorados.length,
        });
      });

      if (!todosNovos.length) {
        const detalhes = resumoAbas
          .map((item) => `${item.aba}: leitura=${item.tipo}, linhas=${item.lidas}, gerados=${item.geradas}`)
          .join("\n");

        alert(
          `Nenhum lancamento valido encontrado.\n\n` +
          `Linhas lidas: ${linhasLidas}\n` +
          `Linhas ignoradas: ${todosIgnorados.length}\n\n` +
          `Detalhes por aba:\n${detalhes}`
        );
        return;
      }

      const existingKeys = new Set(lancamentos.map((item) => buildLancamentoKey(item)));
      const validos = [];
      let duplicados = 0;

      for (const item of todosNovos) {
        const key = buildLancamentoKey(item);

        if (existingKeys.has(key)) {
          duplicados += 1;
          continue;
        }

        existingKeys.add(key);
        validos.push(item);
      }

      const detalhes = resumoAbas
        .map((item) => `${item.aba}: leitura=${item.tipo}, linhas=${item.lidas}, gerados=${item.geradas}`)
        .join("\n");

      if (!validos.length) {
        alert(
          `A planilha foi lida, mas todos os lancamentos validos ja existem no sistema.\n\n` +
          `Gerados: ${todosNovos.length}\n` +
          `Duplicados: ${duplicados}\n\n` +
          `Detalhes por aba:\n${detalhes}`
        );
        return;
      }

      const resumo =
        `Arquivo: ${file.name}\n` +
        `Abas lidas: ${workbook.SheetNames.join(", ")}\n` +
        `Linhas lidas: ${linhasLidas}\n` +
        `Lancamentos gerados: ${todosNovos.length}\n` +
        `Validos para importar: ${validos.length}\n` +
        `Linhas ignoradas: ${todosIgnorados.length}\n` +
        `Duplicados ignorados: ${duplicados}\n\n` +
        `Detalhes por aba:\n${detalhes}\n\n` +
        `Deseja continuar?`;

      const confirmar = window.confirm(resumo);
      if (!confirmar) return;

      for (const item of validos) {
        await salvarLancamento(item, context);
      }

      await recarregar();

      alert(
        `Importacao concluida.\n\n` +
        `Importados: ${validos.length}\n` +
        `Linhas ignoradas: ${todosIgnorados.length}\n` +
        `Duplicados ignorados: ${duplicados}`
      );
    } catch (error) {
      console.error("Erro ao importar planilha:", error);
      alert("Erro ao importar planilha. Verifique o arquivo e tente novamente.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      <button type="button" onClick={handleOpenPicker} disabled={loading} style={styles.button}>
        {loading ? "Importando..." : "Importar arquivo"}
      </button>
    </>
  );
}

const styles = {
  button: {
    padding: "12px 18px",
    borderRadius: "12px",
    border: "none",
    background: "#0f766e",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
  },
};
'@

Write-Host "Arquivos corrigidos. Backup salvo em: $backupDir" -ForegroundColor Green
Write-Host "Rodando npm run build..." -ForegroundColor Cyan
npm run build
