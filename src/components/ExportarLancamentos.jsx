import * as XLSX from "xlsx";

export default function ExportarLancamentos({ lancamentos }) {
  function handleExport() {
    if (!lancamentos.length) {
      alert("Não há lançamentos para exportar.");
      return;
    }

    const dados = lancamentos.map((item) => ({
      data: item.data,
      tipo: item.tipo,
      descricao: item.descricao,
      categoria: item.categoria,
      valor: Number(item.valor || 0),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dados);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Lancamentos");
    XLSX.writeFile(workbook, "lancamentos.xlsx");
  }

  return (
    <button onClick={handleExport} style={styles.button}>
      Exportar arquivo
    </button>
  );
}

const styles = {
  button: {
    padding: "12px 18px",
    borderRadius: "10px",
    border: "none",
    background: "#1d4ed8",
    color: "#fff",
    cursor: "pointer",
    fontSize: "14px",
  },
};