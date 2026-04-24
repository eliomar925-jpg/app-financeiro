export default function DashboardResumoMensal({ dados }) {
  function moeda(valor) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(valor || 0));
  }

  return (
    <div style={styles.card}>
      <h3 style={styles.titulo}>Resumo Mensal</h3>

      <div style={styles.tabelaWrap}>
        <table style={styles.tabela}>
          <thead>
            <tr>
              <th style={styles.th}>MÊS</th>
              <th style={styles.th}>RECEITAS</th>
              <th style={styles.th}>FIXAS</th>
              <th style={styles.th}>FINANCEIRAS</th>
              <th style={styles.th}>VARIÁVEIS</th>
              <th style={styles.th}>TOTAL DESPESAS</th>
              <th style={styles.th}>SALDO MÊS</th>
              <th style={styles.th}>ACUMULADO</th>
            </tr>
          </thead>

          <tbody>
            {dados.map((item) => (
              <tr key={item.mes}>
                <td style={styles.td}>{item.mes}</td>
                <td style={{ ...styles.td, ...styles.receita }}>
                  {moeda(item.receitas)}
                </td>
                <td style={styles.td}>{moeda(item.fixas)}</td>
                <td style={styles.td}>{moeda(item.financeiras)}</td>
                <td style={styles.td}>{moeda(item.variaveis)}</td>
                <td style={{ ...styles.td, ...styles.despesa }}>
                  {moeda(item.despesas)}
                </td>
                <td
                  style={{
                    ...styles.td,
                    ...(item.saldoMes >= 0 ? styles.receita : styles.despesa),
                  }}
                >
                  {moeda(item.saldoMes)}
                </td>
                <td
                  style={{
                    ...styles.td,
                    ...(item.saldoAcumulado >= 0 ? styles.receita : styles.despesa),
                  }}
                >
                  {moeda(item.saldoAcumulado)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "24px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
    marginBottom: "24px",
  },
  titulo: {
    marginTop: 0,
    marginBottom: "18px",
    fontSize: "28px",
  },
  tabelaWrap: {
    overflowX: "auto",
  },
  tabela: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "980px",
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
  receita: {
    color: "#059669",
    fontWeight: 700,
  },
  despesa: {
    color: "#dc2626",
    fontWeight: 700,
  },
};