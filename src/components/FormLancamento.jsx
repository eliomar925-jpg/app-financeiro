import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useLancamentos } from "../hooks/useLancamentos";
import { normalizarCompetencia } from "../utils/competencia";

function getInitialForm(itemEditando) {
  return {
    tipo: itemEditando?.tipo || "despesa",
    descricao: itemEditando?.descricao || "",
    valor: itemEditando?.valor || "",
    categoria: itemEditando?.categoria || "",
    competencia: itemEditando?.competencia || "",
    data: itemEditando?.data || "",
    observacao: itemEditando?.observacao || "",
  };
}

export default function FormLancamento({
  onLancamentoSalvo,
  itemEditando,
  onCancelarEdicao,
}) {
  const { user } = useAuth();
  const { criar, editar } = useLancamentos();

  const [form, setForm] = useState(() => getInitialForm(itemEditando));

  const [categoriasReceita, setCategoriasReceita] = useState([
    "Receitas",
    "Salário",
    "Comissão",
    "Outras receitas",
  ]);

  const [categoriasDespesa, setCategoriasDespesa] = useState([
    "Despesas fixas",
    "Despesas financeiras",
    "Despesas variáveis",
    "Alimentação",
  ]);

  useEffect(() => {
    async function carregarCategorias() {
      if (!user?.uid) return;

      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const dados = snap.data();

          if (Array.isArray(dados.categoriasReceita) && dados.categoriasReceita.length) {
            setCategoriasReceita(dados.categoriasReceita);
          }

          if (Array.isArray(dados.categoriasDespesa) && dados.categoriasDespesa.length) {
            setCategoriasDespesa(dados.categoriasDespesa);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar categorias:", error);
      }
    }

    carregarCategorias();
  }, [user?.uid]);

  useEffect(() => {
    setForm(getInitialForm(itemEditando));
  }, [itemEditando]);

  const tipo = form.tipo;

  const categoriasAtuais = useMemo(
    () => (tipo === "receita" ? categoriasReceita : categoriasDespesa),
    [tipo, categoriasReceita, categoriasDespesa]
  );

  const categoriaEfetiva = form.categoria || categoriasAtuais[0] || "";

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!user?.uid) return;

    const competenciaNorm = normalizarCompetencia(form.competencia);
    if (!competenciaNorm) {
      alert("Competência inválida. Use o formato Mês/Ano (ex: Abr/26).");
      return;
    }

    let dataFinal = form.data;
    if (!dataFinal) {
      dataFinal = `${competenciaNorm}-01`;
    }

    const payload = {
      tipo: form.tipo,
      descricao: form.descricao,
      valor: Number(form.valor || 0),
      categoria: categoriaEfetiva,
      competencia: competenciaNorm,
      data: dataFinal,
      observacao: form.observacao,
    };

    try {
      if (itemEditando?.id) {
        await editar(itemEditando.id, payload);
      } else {
        await criar(payload);
      }

      if (onLancamentoSalvo) onLancamentoSalvo();

      setForm(getInitialForm(null));
    } catch (error) {
      console.error("Erro ao salvar lançamento:", error);
      alert("Erro ao salvar lançamento.");
    }
  }

  return (
    <form onSubmit={handleSubmit} style={styles.card}>
      <h3 style={styles.title}>
        {itemEditando ? "Editar lançamento" : "Novo lançamento"}
      </h3>

      <select
        value={form.tipo}
        onChange={(e) =>
          setForm((prev) => ({
            ...prev,
            tipo: e.target.value,
            categoria: "",
          }))
        }
        style={styles.input}
      >
        <option value="despesa">Despesa</option>
        <option value="receita">Receita</option>
      </select>

      <input
        value={form.descricao}
        onChange={(e) => updateField("descricao", e.target.value)}
        placeholder="Descrição"
        style={styles.input}
        required
      />

      <input
        type="number"
        step="0.01"
        value={form.valor}
        onChange={(e) => updateField("valor", e.target.value)}
        placeholder="Valor"
        style={styles.input}
        required
      />

      <select
        value={categoriaEfetiva}
        onChange={(e) => updateField("categoria", e.target.value)}
        style={styles.input}
      >
        {categoriasAtuais.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>

      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <label style={{ fontSize: 14, color: "#64748b" }}>Competência (obrigatório)</label>
        <input
          value={form.competencia}
          onChange={(e) => updateField("competencia", e.target.value)}
          onBlur={() => {
            const norm = normalizarCompetencia(form.competencia);
            if (norm) updateField("competencia", norm);
          }}
          placeholder="Ex: Abr/26"
          style={styles.input}
          required
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <label style={{ fontSize: 14, color: "#64748b" }}>Data de pagamento/vencimento — opcional</label>
        <input
          type="date"
          value={form.data}
          onChange={(e) => updateField("data", e.target.value)}
          style={styles.input}
        />
      </div>

      <input
        value={form.observacao}
        onChange={(e) => updateField("observacao", e.target.value)}
        placeholder="Observação"
        style={styles.input}
      />

      <button type="submit" style={styles.button}>
        {itemEditando ? "Atualizar lançamento" : "Salvar lançamento"}
      </button>

      {itemEditando ? (
        <button type="button" onClick={onCancelarEdicao} style={styles.cancelButton}>
          Cancelar edição
        </button>
      ) : null}
    </form>
  );
}

const styles = {
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 18,
    padding: 24,
    display: "grid",
    gap: 12,
  },
  title: {
    margin: 0,
    fontSize: 24,
  },
  input: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #d1d5db",
    background: "#fff",
    fontSize: 15,
  },
  button: {
    padding: "12px 16px",
    borderRadius: 12,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
  },
  cancelButton: {
    padding: "12px 16px",
    borderRadius: 12,
    border: "none",
    background: "#e5e7eb",
    color: "#111827",
    cursor: "pointer",
  },
};