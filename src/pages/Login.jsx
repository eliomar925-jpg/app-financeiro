import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, cadastro, resetSenha } = useAuth();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [modoCadastro, setModoCadastro] = useState(false);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setLoading(true);

    try {
      if (modoCadastro) {
        await cadastro(nome, email, password);
      } else {
        await login(email, password);
      }
    } catch (error) {
      console.error(error);

      if (error.code === "auth/email-already-in-use") {
        setErro("Este e-mail já está cadastrado. Clique em 'Já tem conta? Entrar'.");
      } else if (error.code === "auth/invalid-email") {
        setErro("E-mail inválido.");
      } else if (error.code === "auth/weak-password") {
        setErro("A senha precisa ter pelo menos 6 caracteres.");
      } else if (error.code === "auth/invalid-credential") {
        setErro("E-mail ou senha inválidos.");
      } else {
        setErro(modoCadastro ? "Erro ao criar conta." : "Erro ao entrar.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleEsqueciSenha() {
    if (!email) {
      setErro("Digite seu e-mail para redefinir a senha.");
      return;
    }

    try {
      await resetSenha(email);
      alert("Enviamos um link de redefinição para seu e-mail.");
      setErro("");
    } catch (error) {
      console.error(error);
      setErro("Erro ao enviar redefinição de senha.");
    }
  }

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h1 style={styles.title}>Ótimo Financeiro</h1>
        <p style={styles.subtitle}>
          {modoCadastro ? "Crie sua conta" : "Entre na sua conta"}
        </p>

        {modoCadastro && (
          <input
            type="text"
            placeholder="Seu nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            style={styles.input}
            required
          />
        )}

        <input
          type="email"
          placeholder="Seu e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
          required
        />

        <input
          type="password"
          placeholder="Sua senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
          required
        />

        {erro && <p style={styles.error}>{erro}</p>}

        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? "Carregando..." : modoCadastro ? "Criar conta" : "Entrar"}
        </button>

        {!modoCadastro && (
          <button
            type="button"
            style={styles.linkButton}
            onClick={handleEsqueciSenha}
          >
            Esqueci minha senha
          </button>
        )}

        <button
          type="button"
          style={styles.linkButton}
          onClick={() => {
            setModoCadastro(!modoCadastro);
            setErro("");
          }}
        >
          {modoCadastro ? "Já tem conta? Entrar" : "Não tem conta? Criar conta"}
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0f172a",
    padding: "20px",
  },
  form: {
    width: "100%",
    maxWidth: "400px",
    background: "#ffffff",
    padding: "32px",
    borderRadius: "16px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  title: {
    margin: 0,
    fontSize: "28px",
    color: "#111827",
    textAlign: "center",
  },
  subtitle: {
    margin: 0,
    color: "#6b7280",
    textAlign: "center",
  },
  input: {
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    fontSize: "16px",
  },
  button: {
    padding: "12px",
    borderRadius: "10px",
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontSize: "16px",
    cursor: "pointer",
  },
  linkButton: {
    padding: "10px",
    border: "none",
    background: "transparent",
    color: "#2563eb",
    cursor: "pointer",
    fontSize: "14px",
  },
  error: {
    color: "#dc2626",
    fontSize: "14px",
    margin: 0,
    textAlign: "center",
  },
};