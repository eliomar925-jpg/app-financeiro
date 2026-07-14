# Corrige a primeira etapa do app-financeiro:
# normalização de valores, datas, competência, importação inteligente e deduplicação.
# Execute este script dentro da pasta C:\Projetos\app-financeiro

$ErrorActionPreference = "Stop"

if (!(Test-Path "package.json") -or !(Test-Path "src")) {
  Write-Host "ERRO: execute este script dentro da pasta do projeto, ex.: C:\Projetos\app-financeiro" -ForegroundColor Red
  exit 1
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "backup_etapa1_$timestamp"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

$filesToBackup = @(
  "src\utils\normalizers.js",
  "src\utils\competencia.js",
  "src\utils\lancamentoModel.js",
  "src\utils\dedupeLancamentos.js",
  "src\utils\importacaoUtils.js",
  "src\components\ImportarLancamentos.jsx"
)

foreach ($file in $filesToBackup) {
  if (Test-Path $file) {
    $dest = Join-Path $backupDir ($file -replace "[\\/:]", "_")
    Copy-Item $file $dest -Force
  }
}

Set-Content -Encoding UTF8 -Path "src\utils\normalizers.js" -Value @'
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
'@

Set-Content -Encoding UTF8 -Path "src\utils\competencia.js" -Value @'
const MONTHS = {
  jan: "01", janeiro: "01",
  fev: "02", fevereiro: "02",
  mar: "03", marco: "03", março: "03",
  abr: "04", abril: "04",
  mai: "05", maio: "05",
  jun: "06", junho: "06",
  jul: "07", julho: "07",
  ago: "08", agosto: "08",
  set: "09", setembro: "09",
  out: "10", outubro: "10",
  nov: "11", novembro: "11",
  dez: "12", dezembro: "12",
};

function clean(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizeYear(year) {
  if (!year) return "";
  const y = String(year).trim();
  return y.length === 2 ? `20${y}` : y;
}

export function normalizarCompetencia(valor) {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return valor.toISOString().slice(0, 7);
  }

  const rawOriginal = String(valor ?? "").trim();
  if (!rawOriginal) return "";

  if (/^\d{4}-\d{2}$/.test(rawOriginal)) return rawOriginal;
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawOriginal)) return rawOriginal.slice(0, 7);

  const raw = clean(rawOriginal).replace(/\./g, "");

  let match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (match) {
    const mm = match[2].padStart(2, "0");
    return `${normalizeYear(match[3])}-${mm}`;
  }

  match = raw.match(/^(\d{1,2})\/(\d{2}|\d{4})$/);
  if (match) {
    const mm = match[1].padStart(2, "0");
    return `${normalizeYear(match[2])}-${mm}`;
  }

  match = raw.match(/^([a-z]+)[\/\-\s](\d{2}|\d{4})$/);
  if (match) {
    const mes = MONTHS[match[1].slice(0, 3)] || MONTHS[match[1]];
    return mes ? `${normalizeYear(match[2])}-${mes}` : "";
  }

  match = raw.match(/^([a-z]+)\/(\d{2}|\d{4})$/);
  if (match) {
    const mes = MONTHS[match[1].slice(0, 3)] || MONTHS[match[1]];
    return mes ? `${normalizeYear(match[2])}-${mes}` : "";
  }

  match = raw.match(/^([a-z]+)\s+de\s+(\d{4})$/);
  if (match) {
    const mes = MONTHS[match[1].slice(0, 3)] || MONTHS[match[1]];
    return mes ? `${match[2]}-${mes}` : "";
  }

  match = raw.match(/^(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})$/);
  if (match) {
    const mes = MONTHS[match[2].slice(0, 3)] || MONTHS[match[2]];
    return mes ? `${match[3]}-${mes}` : "";
  }

  return "";
}

export function formatarCompetencia(valor) {
  const comp = normalizarCompetencia(valor);
  if (!comp) return "Sem mês";

  const [yyyy, mm] = comp.split("-");
  const labels = {
    "01": "Jan", "02": "Fev", "03": "Mar", "04": "Abr", "05": "Mai", "06": "Jun",
    "07": "Jul", "08": "Ago", "09": "Set", "10": "Out", "11": "Nov", "12": "Dez",
  };

  return `${labels[mm] || mm}/${yyyy.slice(-2)}`;
}

export function ordenarCompetencias(lista = []) {
  return [...lista]
    .map((item) => normalizarCompetencia(item))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}
'@

Set-Content -Encoding UTF8 -Path "src\utils\lancamentoModel.js" -Value @'
import {
  inferCompetencia,
  normalizeCategoria,
  normalizeDate,
  normalizeGrupo,
  normalizeMoney,
  normalizeStatus,
  normalizeTipo,
} from "./normalizers";
import { normalizarCompetencia } from "./competencia";

export function normalizeLancamento(raw = {}, context = {}) {
  const tipo = normalizeTipo(raw.tipo);
  const dataNormalizada = normalizeDate(raw.data);
  const competencia = normalizarCompetencia(raw.competencia) || inferCompetencia(dataNormalizada);
  const data = dataNormalizada || (competencia ? `${competencia}-01` : "");
  const categoria = normalizeCategoria(raw.categoria || raw.grupo || "Geral");
  const grupo = normalizeGrupo(raw.grupo, tipo, categoria);
  const valor = Math.abs(normalizeMoney(raw.valor));
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
'@

Set-Content -Encoding UTF8 -Path "src\utils\dedupeLancamentos.js" -Value @'
import { normalizeText } from "./normalizers";

export function buildLancamentoKey(lancamento) {
  const dono = lancamento.householdId || lancamento.userId || "";
  const competencia = lancamento.competencia || "";
  const data = lancamento.data || "";
  const tipo = lancamento.tipo || "";
  const grupo = lancamento.grupo || "";
  const categoria = normalizeText(lancamento.categoria);
  const descricao = normalizeText(lancamento.descricao);
  const valor = Math.abs(Number(lancamento.valor || 0)).toFixed(2);

  return [dono, competencia, data, tipo, grupo, categoria, descricao, valor].join("|");
}

export function dedupeLancamentos(lista = []) {
  const map = new Map();

  for (const item of lista) {
    const key = buildLancamentoKey(item);
    if (!map.has(key)) map.set(key, item);
  }

  return Array.from(map.values());
}
'@

Set-Content -Encoding UTF8 -Path "src\utils\importacaoUtils.js" -Value @'
import { normalizeDate, normalizeGrupo, normalizeMoney, normalizeStatus, normalizeText, normalizeTipo } from "./normalizers";
import { normalizarCompetencia } from "./competencia";
import { normalizeLancamento } from "./lancamentoModel";

const COLUMN_ALIASES = {
  data: ["data", "dt", "data pagamento", "data pagto", "vencimento", "data vencimento"],
  competencia: ["mes", "mês", "competencia", "competência", "periodo", "período", "referencia", "referência"],
  tipo: ["tipo", "tipo receita despesa", "entrada saida", "entrada/saida", "entrada/saída", "natureza"],
  grupo: ["grupo", "grupo dre", "classificacao", "classificação", "macrogrupo"],
  categoria: ["categoria", "classe", "plano de contas", "conta", "subcategoria"],
  descricao: ["descricao", "descrição", "historico", "histórico", "lancamento", "lançamento", "detalhe", "observacao", "observação"],
  valor: ["valor", "valor r", "valor r$", "valor (r$)", "total", "montante"],
  entrada: ["entrada", "receita", "credito", "crédito", "recebimento"],
  saida: ["saida", "saída", "despesa", "debito", "débito", "pagamento"],
  status: ["status", "pago", "pago?", "pago s n", "pago? s/n", "baixado", "situacao", "situação"],
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
    if (!competencia) motivo.push("competência inválida");
    if (!categoria) motivo.push("categoria vazia");
    if (!descricao) motivo.push("descrição vazia");
    if (!valor || valor <= 0) motivo.push("valor inválido");

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
'@

Set-Content -Encoding UTF8 -Path "src\components\ImportarLancamentos.jsx" -Value @'
import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useAuth } from "../context/AuthContext";
import { useLancamentos } from "../hooks/useLancamentos";
import { salvarLancamento } from "../services/lancamentosService";
import { buildLancamentoKey } from "../utils/dedupeLancamentos";
import { escolherAba, montarLancamentos } from "../utils/importacaoUtils";

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
      const sheetName = escolherAba(workbook);
      const sheet = workbook.Sheets[sheetName];

      if (!sheet) {
        alert("Não foi possível ler a planilha.");
        return;
      }

      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });

      if (!rows.length) {
        alert("A planilha está vazia.");
        return;
      }

      const context = {
        householdId: userProfile?.householdId || null,
        userId: user.uid,
      };

      const { lancamentos: novos, ignorados } = montarLancamentos(rows, context, sheetName);

      const existingKeys = new Set(lancamentos.map((item) => buildLancamentoKey(item)));
      const validos = [];
      let duplicados = 0;

      for (const item of novos) {
        const key = buildLancamentoKey(item);
        if (existingKeys.has(key)) {
          duplicados += 1;
          continue;
        }

        existingKeys.add(key);
        validos.push(item);
      }

      if (!validos.length) {
        alert(
          `Nenhum lançamento válido encontrado.\n\n` +
          `Linhas lidas: ${rows.length}\n` +
          `Linhas ignoradas: ${ignorados.length}\n` +
          `Duplicados: ${duplicados}`
        );
        return;
      }

      const resumo =
        `Arquivo: ${file.name}\n` +
        `Aba usada: ${sheetName}\n` +
        `Linhas lidas: ${rows.length}\n` +
        `Lançamentos gerados: ${novos.length}\n` +
        `Válidos para importar: ${validos.length}\n` +
        `Linhas ignoradas por falta de dados: ${ignorados.length}\n` +
        `Duplicados ignorados: ${duplicados}\n\n` +
        `Deseja continuar?`;

      const confirmar = window.confirm(resumo);
      if (!confirmar) return;

      for (const item of validos) {
        await salvarLancamento(item, context);
      }

      await recarregar();

      alert(
        `Importação concluída.\n\n` +
        `Importados: ${validos.length}\n` +
        `Linhas ignoradas: ${ignorados.length}\n` +
        `Duplicados ignorados: ${duplicados}`
      );
    } catch (error) {
      console.error("Erro ao importar planilha:", error);
      alert("Erro ao importar planilha. Verifique o formato do arquivo e tente novamente.");
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
