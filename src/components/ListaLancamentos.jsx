function formatCurrency(value = 0) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

function buildItemKey(item, index) {
  if (item?.id) return String(item.id);

  return [
    item?.competencia || "",
    item?.data || "",
    item?.tipo || "",
    item?.grupo || "",
    item?.categoria || "",
    item?.descricao || "",
    item?.valor || "",
    index,
  ].join("|");
}

export default function ListaLancamentos({
  lancamentos = [],
  onEditar,
  onExcluir,
  titulo = "Lançamentos filtrados",
}) {
  return (
    <div style={styles.card}>
      <h2 style={styles.title}>{titulo}</h2>

      {lancamentos.length === 0 ? (
        <p style={styles.empty}>Nenhum lançamento cadastrado.</p>
      ) : (
        <div style={styles.list}>
          {lancamentos.map((item, index) => {
            const valor = Number(item?.valor || 0);
            const isReceita =
              String(item?.tipo || "").toLowerCase() === "receita";

            return (
              <div key={buildItemKey(item, index)} style={styles.item}>
                <div style={styles.topRow}>
                  <strong style={styles.base}>Base</strong>
                  <span
                    style={{
                      ...styles.valor,
                      color: isReceita ? "#059669" : "#dc2626",
                    }}
                  >
                    {formatCurrency(valor)}
                  </span>
                </div>

                <div style={styles.meta}>
                  {item?.categoria || "Sem categoria"}
                  {" • "}
                  {item?.competencia || item?.data || "-"}
                  {" • "}
                  {item?.tipo || "-"}
                  {" • "}
                  {item?.grupo || "-"}
                </div>

                <div style={styles.obs}>
                  {item?.descricao || "-"}
                  {item?.observacao ? ` • ${item.observacao}` : ""}
                </div>

                <div style={styles.actions}>
                  <button
                    type="button"
                    style={styles.editButton}
                    onClick={() => onEditar?.(item)}
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    style={styles.deleteButton}
                    onClick={() => item?.id && onExcluir?.(item.id)}
                    disabled={!item?.id}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
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
    margin: 0,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  item: {
    borderBottom: "1px solid #eef2f7",
    paddingBottom: "16px",
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "8px",
  },
  base: {
    color: "#374151",
  },
  valor: {
    fontWeight: 700,
    fontSize: "16px",
  },
  meta: {
    color: "#64748b",
    fontSize: "13px",
    marginBottom: "6px",
  },
  obs: {
    color: "#475569",
    fontSize: "14px",
    marginBottom: "12px",
  },
  actions: {
    display: "flex",
    gap: "10px",
  },
  editButton: {
    padding: "10px 14px",
    borderRadius: "10px",
    border: "none",
    background: "#f59e0b",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  },
  deleteButton: {
    padding: "10px 14px",
    borderRadius: "10px",
    border: "none",
    background: "#ef4444",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  },
};