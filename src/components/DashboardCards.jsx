export default function DashboardCards({ summary }) {
  const cards = [
    { title: "Total Receitas", value: summary.receitas, color: "#059669", bg: "#eefaf5" },
    { title: "Total Despesas", value: summary.despesas, color: "#dc2626", bg: "#fff3f3" },
    { title: "Saldo do Mês", value: summary.saldoMes, color: "#2563eb", bg: "#ffffff" },
    { title: "Saldo Acumulado", value: summary.saldoAcumulado, color: "#7c3aed", bg: "#ffffff" },
  ];

  function moeda(valor) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(valor || 0));
  }

  return (
    <div style={styles.grid}>
      {cards.map((card) => (
        <div key={card.title} style={{ ...styles.card, background: card.bg }}>
          <div style={styles.label}>{card.title}</div>
          <div style={{ ...styles.value, color: card.color }}>
            {moeda(card.value)}
          </div>
        </div>
      ))}
    </div>
  );
}

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "18px",
    marginBottom: "24px",
  },
  card: {
    borderRadius: "18px",
    padding: "22px",
    border: "1px solid #e5e7eb",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  },
  label: {
    color: "#64748b",
    fontSize: "15px",
    marginBottom: "12px",
  },
  value: {
    fontSize: "28px",
    fontWeight: 700,
  },
};