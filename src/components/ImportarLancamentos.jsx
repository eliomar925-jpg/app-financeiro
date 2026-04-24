import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useAuth } from "../context/AuthContext";
import { useLancamentos } from "../hooks/useLancamentos";
import { salvarLancamento } from "../services/lancamentosService";
import { buildLancamentoKey } from "../utils/dedupeLancamentos";
import { normalizeLancamento } from "../utils/lancamentoModel";

const MONTH_MAP = {
  "Abr/26": "2026-04",
  "Mai/26": "2026-05",
  "Jun/26": "2026-06",
  "Jul/26": "2026-07",
  "Ago/26": "2026-08",
  "Set/26": "2026-09",
  "Out/26": "2026-10",
  "Nov/26": "2026-11",
  "Dez/26": "2026-12",
};

function parseValorBR(input) {
  if (typeof input === "number") {
    return Number.isFinite(input) ? input : 0;
  }

  const raw = String(input ?? "").trim();

  if (!raw || raw === "-" || raw.toUpperCase() === "N/A") {
    return 0;
  }

  const normalized = raw
    .replace(/^R\$/i, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");

  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
}

function normalizarMes(mes, data) {
  const mesRaw = String(mes ?? "").trim();
  if (MONTH_MAP[mesRaw]) return MONTH_MAP[mesRaw];
  if (/^\d{4}-\d{2}$/.test(mesRaw)) return mesRaw;

  const dataRaw = String(data ?? "").trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(dataRaw)) {
    return dataRaw.slice(0, 7);
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataRaw)) {
    const [, mm, yyyy] = dataRaw.split("/");
    return `${yyyy}-${mm}`;
  }

  return "";
}

function normalizarTipo(raw) {
  const value = String(raw ?? "").trim().toLowerCase();
  return value === "receita" ? "receita" : "despesa";
}

function normalizarGrupo(raw) {
  const value = String(raw ?? "").trim().toLowerCase();

  if (value === "receitas") return "receitas";
  if (value === "despesas fixas") return "despesas_fixas";
  if (value === "despesas financeiras") return "despesas_financeiras";
  if (value === "despesas variáveis" || value === "despesas variaveis") {
    return "despesas_variaveis";
  }

  return value || "despesas_variaveis";
}

function normalizarStatus(raw) {
  const value = String(raw ?? "").trim().toUpperCase();
  return value === "S" ? "pago" : "pendente";
}

function escolherAba(workbook) {
  const abaLancamentos = workbook.SheetNames.find((name) =>
    String(name).toLowerCase().includes("lanc")
  );

  return abaLancamentos || workbook.SheetNames[0];
}

function montarLancamentos(rows, context, sheetName) {
  return rows
    .map((row) => {
      const competencia = normalizarMes(row["Mês"], row["Data"]);
      const valor = parseValorBR(row["Valor (R$)"]);
      const tipo = normalizarTipo(
        row["Tipo (Receita/Despesa)"] ?? row["Tipo"]
      );
      const grupo = normalizarGrupo(row["Grupo"]);
      const categoria = String(row["Categoria"] ?? "").trim();
      const descricao = String(row["Descrição"] ?? "").trim();
      const pago = normalizarStatus(row["Pago? (S/N)"]);

      if (!competencia || !categoria || !descricao || !grupo) {
        return null;
      }

      const raw = {
        data: `${competencia}-01`,
        competencia,
        tipo,
        grupo,
        categoria,
        descricao,
        valor,
        status: pago,
        observacao: `Importado da aba ${sheetName}`,
        source: "importacao",
      };

      return normalizeLancamento(raw, context);
    })
    .filter((item) => item && Number.isFinite(Number(item.valor)));
}

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

      const rows = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        raw: false,
      });

      if (!rows.length) {
        alert("A planilha está vazia.");
        return;
      }

      const context = {
        householdId: userProfile?.householdId || null,
        userId: user.uid,
      };

      const novos = montarLancamentos(rows, context, sheetName);

      const existingKeys = new Set(
        lancamentos.map((item) => buildLancamentoKey(item))
      );

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

      const resumo =
        `Arquivo: ${file.name}\n` +
        `Aba usada: ${sheetName}\n` +
        `Linhas lidas: ${rows.length}\n` +
        `Lançamentos gerados: ${novos.length}\n` +
        `Válidos para importar: ${validos.length}\n` +
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
          `Duplicados ignorados: ${duplicados}`
      );
    } catch (error) {
      console.error("Erro ao importar planilha:", error);
      alert("Erro ao importar planilha.");
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

      <button
        type="button"
        onClick={handleOpenPicker}
        disabled={loading}
        style={styles.button}
      >
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