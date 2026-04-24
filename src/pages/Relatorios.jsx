import { useMemo } from "react";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { useLancamentos } from "../hooks/useLancamentos";
import {
  formatarCompetencia,
  normalizarCompetencia,
  ordenarCompetencias,
} from "../utils/competencia";

function formatCurrency(value = 0) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

export default function Relatorios() {
  const { logout } = useAuth();
  const { lancamentos = [] } = useLancamentos();

  const resumoGeral = useMemo(() => {
    let receitas = 0;
    let despesas = 0;

    lancamentos.forEach((item) => {
      const valor = Number(item.valor || 0);
      const tipo = String(item.tipo || "").toLowerCase();

      if (tipo === "receita") receitas += valor;
      else despesas += valor;
    });

    return {
      receitas,
      despesas,
      saldo: receitas - despesas,
      total: lancamentos.length,
    };
  }, [lancamentos]);

  const lancamentosValidos = useMemo(() => {
    return lancamentos.filter((item) => normalizarCompetencia(item.competencia));
  }, [lancamentos]);

  const mesesOrdenados = useMemo(() => {
    return ordenarCompetencias(
      [...new Set(lancamentosValidos.map((item) => item.competencia))]
    );
  }, [lancamentosValidos]);

 const comparativoMensal = useMemo(() => {
  return mesesOrdenados.map((mes) => {
    const itensMes = lancamentosValidos.filter(
      (item) => normalizarCompetencia(item.competencia) === mes
    );

    const receitas = itensMes
      .filter((item) => String(item.tipo || "").toLowerCase() === "receita")
      .reduce((acc, item) => acc + Number(item.valor || 0), 0);

    const despesas = itensMes
      .filter((item) => String(item.tipo || "").toLowerCase() === "despesa")
      .reduce((acc, item) => acc + Number(item.valor || 0), 0);

    return {
      mes,
      label: formatarCompetencia(mes),
      receitas,
      despesas,
      saldo: receitas - despesas,
    };
  });
}, [mesesOrdenados, lancamentosValidos]);

  async function handleLogout() {
    try {
      await logout();
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  }

  return (
    <div style={styles.page}>
      <Sidebar onLogout={handleLogout} />

      <main style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.title}>Relatórios</h1>
          <p style={styles.subtitle}>Resumo consolidado dos lançamentos</p>
        </div>

        <div style={styles.cards}>
          <div style={{ ...styles.card, background: "#eefaf5" }}>
            <div style={styles.cardLabel}>Receitas Totais</div>
            <div style={{ ...styles.cardValue, color: "#059669" }}>
              {formatCurrency(resumoGeral.receitas)}
            </div>
          </div>

          <div style={{ ...styles.card, background: "#fff3f3" }}>
            <div style={styles.cardLabel}>Despesas Totais</div>
            <div style={{ ...styles.cardValue, color: "#dc2626" }}>
              {formatCurrency(resumoGeral.despesas)}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardLabel}>Saldo Geral</div>
            <div
              style={{
                ...styles.cardValue,
                color: resumoGeral.saldo >= 0 ? "#2563eb" : "#dc2626",
              }}
            >
              {formatCurrency(resumoGeral.saldo)}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardLabel}>Qtd. Lançamentos</div>
            <div style={{ ...styles.cardValue, color: "#7c3aed" }}>
              {resumoGeral.total}
            </div>
          </div>
        </div>

        <div style={styles.tableCard}>
          <h3 style={styles.sectionTitle}>Comparativo Mensal</h3>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Mês</th>
                  <th style={styles.th}>Receitas</th>
                  <th style={styles.th}>Despesas</th>
                  <th style={styles.th}>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {comparativoMensal.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={styles.empty}>
                      Nenhum lançamento encontrado.
                    </td>
                  </tr>
                ) : (
                  comparativoMensal.map((item) => (
                    <tr key={item.mes}>
                      <td style={styles.td}>{item.label}</td>
                      <td style={{ ...styles.td, color: "#059669", fontWeight: 700 }}>
                        {formatCurrency(item.receitas)}
                      </td>
                      <td style={{ ...styles.td, color: "#dc2626", fontWeight: 700 }}>
                        {formatCurrency(item.despesas)}
                      </td>
                      <td
                        style={{
                          ...styles.td,
                          color: item.saldo >= 0 ? "#2563eb" : "#dc2626",
                          fontWeight: 700,
                        }}
                      >
                        {formatCurrency(item.saldo)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    background: "#f8fafc",
  },
  content: {
    flex: 1,
    padding: "40px",
    boxSizing: "border-box",
  },
  header: {
    textAlign: "center",
    marginBottom: "24px",
  },
  title: {
    marginTop: 0,
    marginBottom: "8px",
    fontSize: "30px",
  },
  subtitle: {
    color: "#64748b",
    marginTop: 0,
    marginBottom: 0,
  },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "18px",
    marginBottom: "24px",
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "22px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  },
  cardLabel: {
    color: "#64748b",
    fontSize: "15px",
    marginBottom: "12px",
  },
  cardValue: {
    fontSize: "28px",
    fontWeight: 700,
  },
  tableCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "24px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: "18px",
    fontSize: "24px",
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    color: "#64748b",
    fontSize: "13px",
    padding: "14px 12px",
    borderBottom: "1px solid #e5e7eb",
  },
  td: {
    padding: "14px 12px",
    borderBottom: "1px solid #eef2f7",
    fontSize: "14px",
  },
  empty: {
    padding: "20px 12px",
    textAlign: "center",
    color: "#64748b",
  },
};