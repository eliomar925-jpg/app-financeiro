import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  listarLancamentos,
  salvarLancamento,
  atualizarLancamento,
  excluirLancamento,
} from "../services/lancamentosService";

export function useLancamentos() {
  const { user, userProfile } = useAuth();

  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const context = {
    userId: user?.uid || null,
    householdId: userProfile?.householdId || null,
  };

  const carregar = useCallback(async () => {
    if (!context.userId) {
      setLancamentos([]);
      setLoading(false);
      setErro("");
      return;
    }

    try {
      setLoading(true);
      setErro("");

      const lista = await listarLancamentos(context);

      setLancamentos(Array.isArray(lista) ? lista : []);
    } catch (error) {
      console.error("Erro ao carregar lançamentos:", error);
      setLancamentos([]);
      setErro("Erro ao carregar lançamentos.");
    } finally {
      setLoading(false);
    }
  }, [context.userId, context.householdId]);

  async function criar(raw) {
    try {
      setErro("");
      await salvarLancamento(raw, context);
      await carregar();
    } catch (error) {
      console.error("Erro ao criar lançamento:", error);
      setErro("Erro ao criar lançamento.");
      throw error;
    }
  }

  async function editar(id, raw) {
    try {
      setErro("");
      await atualizarLancamento(id, raw, context);
      await carregar();
    } catch (error) {
      console.error("Erro ao editar lançamento:", error);
      setErro("Erro ao editar lançamento.");
      throw error;
    }
  }

  async function remover(id) {
    try {
      setErro("");
      await excluirLancamento(id, context);
      await carregar();
    } catch (error) {
      console.error("Erro ao excluir lançamento:", error);
      setErro("Erro ao excluir lançamento.");
      throw error;
    }
  }

  useEffect(() => {
    carregar();
  }, [carregar]);

  return {
    lancamentos,
    loading,
    erro,
    recarregar: carregar,
    criar,
    editar,
    remover,
  };
}