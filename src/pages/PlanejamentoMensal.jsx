import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLancamentos } from "../hooks/useLancamentos";
import Sidebar from "../components/Sidebar";
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

export default function PlanejamentoMensal() {
  const { logout } = useAuth();
  const { lancamentos = [] } = useLancamentos();
  const [mesSelecionado, setMesSelecionado] = useState("");

  const lancamentosValidos = useMemo(() => {
    return lancamentos.filter((item) => normalizarCompetencia(item.competencia));
  }, [lancamentos]);

  const mesesDisponiveis = useMemo(() => {
  return ordenarCompetencias(
    [...new Set(lancamentosValidos.map((item) => item.competencia))]
  );
}, [lancamentosValidos]);

  const mesAtivo = useMemo(() => {
    return mesSelecionado || mesesDisponiveis[mesesDisponiveis.length - 1] || "";
  }, [mesSelecionado, mesesDisponiveis]);

  const lancamentosMes = useMemo(() => {
    return lancamentosValidos.filter(
      (item) => normalizarCompetencia(item.competencia) === mesAtivo
    );
  }, [lancamentosValidos, mesAtivo]);

  const resumo = useMemo(() => {
    let receitas = 0;
    let despesas = 0;

    lancamentosMes.forEach((item) => {
      const valor = Number(item?.valor || 0);
      const tipo = String(item?.tipo || "").toLowerCase();

      if (tipo === "receita") receitas += valor;
      else despesas += valor;
    });

    return {
      receitas,
      despesas,
      saldo: receitas - despesas,
    };
  }, [lancamentosMes]);

  const tabelaCategorias = useMemo(() => {
    const mapa = {};

    lancamentosMes.forEach((item) => {
      const categoria = item?.categoria || "Sem categoria";
      const tipo = String(item?.tipo || "").toLowerCase();
      const valor = Number(item?.valor || 0);

      if (!mapa[categoria]) {
        mapa[categoria] = {
          categoria,
          tipo,
          previsto: 0,
          realizado: 0,
        };
      }

      mapa[categoria].realizado += valor;
    });

    return Object.values(mapa).sort((a, b) =>
      a.categoria.localeCompare(b.categoria)
    );
  }, [lancamentosMes]);

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
          <div>
            <h1 style={styles.title}>Planejamento Mensal</h1>
            <p style={styles.subtitle}>Visão consolidada do mês selecionado</p>
          </div>

          <select
  value={mesSelecionado}
  onChange={(e) => setMesSelecionado(e.target.value)}
  style={styles.select}
>
  <option value="">Último mês disponível</option>
  {mesesDisponiveis.map((mes) => (
    <option key={mes} value={mes}>
      {formatarCompetencia(mes)}
    </option>
  ))}
</select>
        </div>

        <div style={styles.cards}>
          <div style={{ ...styles.card, background: "#eefaf5" }}>
            <div style={styles.cardLabel}>Receitas</div>
            <div style={{ ...styles.cardValue, color: "#059669" }}>
              {formatCurrency(resumo.receitas)}
            </div>
          </div>

          <div style={{ ...styles.card, background: "#fff3f3" }}>
            <div style={styles.cardLabel}>Despesas</div>
            <div style={{ ...styles.cardValue, color: "#dc2626" }}>
              {formatCurrency(resumo.despesas)}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardLabel}>Saldo</div>
            <div
              style={{
                ...styles.cardValue,
                color: resumo.saldo >= 0 ? "#2563eb" : "#dc2626",
              }}
            >
              {formatCurrency(resumo.saldo)}
            </div>
          </div>
        </div>

        <div style={styles.tableCard}>
          <h3 style={styles.sectionTitle}>Previsto x Realizado por Categoria</h3>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Categoria</th>
                  <th style={styles.th}>Tipo</th>
                  <th style={styles.th}>Previsto</th>
                  <th style={styles.th}>Realizado</th>
                  <th style={styles.th}>Diferença</th>
                </tr>
              </thead>
              <tbody>
                {tabelaCategorias.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={styles.empty}>
                      Nenhum lançamento encontrado para este mês.
                    </td>
                  </tr>
                ) : (
                  tabelaCategorias.map((item) => {
                    const diferenca = item.previsto - item.realizado;

                    return (
                      <tr key={item.categoria}>
                        <td style={styles.td}>{item.categoria}</td>
                        <td style={styles.td}>{item.tipo}</td>
                        <td style={styles.td}>{formatCurrency(item.previsto)}</td>
                        <td style={styles.td}>{formatCurrency(item.realizado)}</td>
                        <td
                          style={{
                            ...styles.td,
                            color: diferenca >= 0 ? "#059669" : "#dc2626",
                            fontWeight: 700,
                          }}
                        >
                          {formatCurrency(diferenca)}
                        </td>
                      </tr>
                    );
                  })
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
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    flexWrap: "wrap",
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
  select: {
    minWidth: "220px",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #d1d5db",
    background: "#fff",
    fontSize: "15px",
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