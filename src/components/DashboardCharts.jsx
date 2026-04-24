import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

function formatCurrency(value = 0) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

export default function DashboardCharts({ chartData = [] }) {
  const hasData = Array.isArray(chartData) && chartData.length > 0;

  return (
    <div style={styles.grid}>
      <div style={styles.card}>
        <h3 style={styles.title}>Receitas vs Despesas</h3>

        {!hasData ? (
          <div style={styles.empty}>Sem dados para o período.</div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="despesas" name="Despesas" />
              <Bar dataKey="receitas" name="Receitas" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={styles.card}>
        <h3 style={styles.title}>Evolução do Saldo</h3>

        {!hasData ? (
          <div style={styles.empty}>Sem dados para o período.</div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="saldoAcumulado" name="Saldo Acumulado" />
              <Line type="monotone" dataKey="saldoMes" name="Saldo Mensal" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
    gap: "24px",
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "24px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  },
  title: {
    marginTop: 0,
    marginBottom: "18px",
    fontSize: "22px",
  },
  empty: {
    color: "#64748b",
    padding: "30px 0",
  },
};