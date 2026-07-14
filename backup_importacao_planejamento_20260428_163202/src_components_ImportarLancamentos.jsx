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
        alert("NÃ£o foi possÃ­vel ler a planilha.");
        return;
      }

      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });

      if (!rows.length) {
        alert("A planilha estÃ¡ vazia.");
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
          `Nenhum lanÃ§amento vÃ¡lido encontrado.\n\n` +
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
        `LanÃ§amentos gerados: ${novos.length}\n` +
        `VÃ¡lidos para importar: ${validos.length}\n` +
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
        `ImportaÃ§Ã£o concluÃ­da.\n\n` +
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
