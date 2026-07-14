import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import Sidebar from "../components/Sidebar";
import ImportarLancamentos from "../components/ImportarLancamentos";
import ExportarLancamentos from "../components/ExportarLancamentos";
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

export default function Dashboard() {
  const { logout, userProfile } = useAuth();
  const { lancamentos = [] } = useLancamentos();

  const [mesSelecionado, setMesSelecionado] = useState("todos");
  const [tipoSelecionado, setTipoSelecionado] = useState("todos");

  const lancamentosValidos = useMemo(() => {
    return lancamentos.filter((item) => normalizarCompetencia(item.competencia));
  }, [lancamentos]);

  const mesesDisponiveis = useMemo(() => {
    return ordenarCompetencias(
      [...new Set(lancamentosValidos.map((item) => item.competencia))]
    );
  }, [lancamentosValidos]);

  const lancamentosFiltrados = useMemo(() => {
    let base = [...lancamentosValidos];

    if (mesSelecionado !== "todos") {
      base = base.filter(
        (item) => normalizarCompetencia(item.competencia) === mesSelecionado
      );
    }

    if (tipoSelecionado !== "todos") {
      base = base.filter(
        (item) => String(item.tipo || "").toLowerCase() === tipoSelecionado
      );
    }

    return base;
  }, [lancamentosValidos, mesSelecionado, tipoSelecionado]);

  const resumo = useMemo(() => {
    let receitas = 0;
    let despesas = 0;

    lancamentosFiltrados.forEach((item) => {
      const valor = Number(item.valor || 0);
      const tipo = String(item.tipo || "").toLowerCase();

      if (tipo === "receita") receitas += valor;
      else despesas += valor;
    });

    return {
      receitas,
      despesas,
      saldoMes: receitas - despesas,
    };
  }, [lancamentosFiltrados]);

  const dadosGraficoBase = useMemo(() => {
    return mesesDisponiveis.map((mes) => {
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
        saldoMensal: receitas - despesas,
      };
    });
  }, [lancamentosValidos, mesesDisponiveis]);

  const dadosGrafico = useMemo(() => {
    let base =
      mesSelecionado === "todos"
        ? [...dadosGraficoBase]
        : dadosGraficoBase.filter((item) => item.mes === mesSelecionado);

    if (tipoSelecionado === "receita") {
      base = base.map((item) => ({
        ...item,
        despesas: 0,
        saldoMensal: item.receitas,
      }));
    }

    if (tipoSelecionado === "despesa") {
      base = base.map((item) => ({
        ...item,
        receitas: 0,
        saldoMensal: -item.despesas,
      }));
    }

    let acumulado = 0;

    return base.map((item) => {
      acumulado += item.saldoMensal;
      return {
        ...item,
        saldoAcumulado: acumulado,
      };
    });
  }, [dadosGraficoBase, mesSelecionado, tipoSelecionado]);

  const saldoAcumulado =
    dadosGrafico[dadosGrafico.length - 1]?.saldoAcumulado || 0;

  const infoMeta = useMemo(() => {
    const metaValor = Number(userProfile?.metaMensal) || 25000;
    const numMeses = mesesDisponiveis.length || 1;
    const receitaRef = mesSelecionado === "todos" ? resumo.receitas / numMeses : resumo.receitas;
    
    const atingimento = (receitaRef / metaValor) * 100;
    
    let texto = "Abaixo da meta";
    let cor = "#dc2626";
    if (atingimento >= 100) {
      texto = atingimento > 100 ? "Acima da meta" : "Meta atingida";
      cor = "#059669";
    }

    return {
      valor: metaValor,
      receitaRef,
      atingimento,
      texto,
      cor
    };
  }, [userProfile?.metaMensal, mesesDisponiveis.length, mesSelecionado, resumo.receitas]);

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
            <h1 style={styles.title}>Painel Financeiro</h1>
            <p style={styles.subtitle}>Visão geral do planejamento familiar</p>
          </div>

          <div style={styles.headerActions}>
            <select
  value={mesSelecionado}
  onChange={(e) => setMesSelecionado(e.target.value)}
  style={styles.select}
>
  <option value="todos">Todos os meses</option>
  {mesesDisponiveis.map((mes) => (
    <option key={mes} value={mes}>
      {formatarCompetencia(mes)}
    </option>
  ))}
</select>

            <select
              value={tipoSelecionado}
              onChange={(e) => setTipoSelecionado(e.target.value)}
              style={styles.select}
            >
              <option value="todos">Todos os tipos</option>
              <option value="receita">Só receitas</option>
              <option value="despesa">Só despesas</option>
            </select>

            <ImportarLancamentos />
            <ExportarLancamentos />
          </div>
        </div>

        <div style={styles.cards}>
          <div style={{ ...styles.card, background: "#eefaf5" }}>
            <div style={styles.cardLabel}>Receitas totais</div>
            <div style={{ ...styles.cardValue, color: "#059669" }}>
              {formatCurrency(resumo.receitas)}
            </div>
          </div>

          <div style={{ ...styles.card, background: "#fff3f3" }}>
            <div style={styles.cardLabel}>Despesas totais</div>
            <div style={{ ...styles.cardValue, color: "#dc2626" }}>
              {formatCurrency(resumo.despesas)}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardLabel}>{mesSelecionado === "todos" ? "Saldo do Período" : "Saldo do Mês"}</div>
            <div
              style={{
                ...styles.cardValue,
                color: resumo.saldoMes >= 0 ? "#2563eb" : "#dc2626",
              }}
            >
              {formatCurrency(resumo.saldoMes)}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardLabel}>Saldo Acumulado</div>
            <div
              style={{
                ...styles.cardValue,
                color: saldoAcumulado >= 0 ? "#7c3aed" : "#dc2626",
              }}
            >
              {formatCurrency(saldoAcumulado)}
            </div>
          </div>
        </div>

        <div style={styles.metaCard}>
          <div style={styles.metaLeft}>
            <div style={styles.cardLabel}>Meta mensal</div>
            <div style={styles.metaValue}>{formatCurrency(infoMeta.valor)}</div>
            <div style={{ color: "#64748b", fontSize: "14px", marginTop: "4px" }}>
              Receita considerada: {formatCurrency(infoMeta.receitaRef)}
              {mesSelecionado === "todos" ? " (média mensal)" : ""}
            </div>
          </div>
          <div style={{ ...styles.metaRight, color: infoMeta.cor }}>
            {infoMeta.texto} (
            {new Intl.NumberFormat("pt-BR", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            }).format(infoMeta.atingimento)}
            %)
          </div>
          <div style={styles.progressTrack}>
            <div
              style={{
                ...styles.progressFill,
                width: `${Math.min(infoMeta.atingimento, 100)}%`,
                background: infoMeta.cor,
              }}
            />
          </div>
        </div>

        <div style={styles.chartsGrid}>
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>Receitas vs Despesas</h3>

            {dadosGrafico.length === 0 ? (
              <div style={styles.empty}>Sem dados para o período.</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={dadosGrafico}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="despesas" name="Despesas" />
                  <Bar dataKey="receitas" name="Receitas" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>Evolução do Saldo</h3>

            {dadosGrafico.length === 0 ? (
              <div style={styles.empty}>Sem dados para o período.</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={dadosGrafico}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="saldoAcumulado"
                    name="Saldo Acumulado"
                  />
                  <Line
                    type="monotone"
                    dataKey="saldoMensal"
                    name="Saldo Mensal"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
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
  headerActions: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  select: {
    minWidth: "180px",
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
    marginBottom: "22px",
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
  metaCard: {
    position: "relative",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "22px",
    marginBottom: "24px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  },
  metaLeft: {
    marginBottom: "12px",
  },
  metaValue: {
    fontSize: "28px",
    fontWeight: 700,
  },
  metaRight: {
    position: "absolute",
    top: "22px",
    right: "22px",
    color: "#dc2626",
    fontWeight: 600,
  },
  progressTrack: {
    height: "10px",
    background: "#e5e7eb",
    borderRadius: "999px",
    overflow: "hidden",
    marginTop: "12px",
  },
  progressFill: {
    width: "0%",
    height: "100%",
    background: "#2563eb",
  },
  chartsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
    gap: "24px",
  },
  chartCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "24px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  },
  chartTitle: {
    marginTop: 0,
    marginBottom: "18px",
    fontSize: "22px",
  },
  empty: {
    color: "#64748b",
    padding: "30px 0",
  },
};