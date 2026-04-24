import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { dedupeLancamentos } from "../utils/dedupeLancamentos";
import { normalizeLancamento } from "../utils/lancamentoModel";

const COLLECTION_NAME = "lancamentos";

export async function listarLancamentos(context) {
  const { householdId, userId } = context || {};

  let q;

  if (householdId) {
    q = query(
      collection(db, COLLECTION_NAME),
      where("householdId", "==", householdId)
    );
  } else {
    q = query(
      collection(db, COLLECTION_NAME),
      where("userId", "==", userId)
    );
  }

  const snap = await getDocs(q);

  const lista = snap.docs.map((item) =>
    normalizeLancamento(
      { id: item.id, ...item.data() },
      { householdId, userId }
    )
  );

  return dedupeLancamentos(lista);
}

export async function salvarLancamento(raw, context) {
  const payload = normalizeLancamento(raw, context);

  return addDoc(collection(db, COLLECTION_NAME), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function atualizarLancamento(id, raw, context) {
  const payload = normalizeLancamento(raw, context);

  await updateDoc(doc(db, COLLECTION_NAME, id), {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

export async function excluirLancamento(id) {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
}