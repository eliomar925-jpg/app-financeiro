import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export async function criarHousehold(nome, ownerUid) {
  const nomeFinal = (nome || "").trim();

  if (!nomeFinal) {
    throw new Error("Informe o nome da família.");
  }

  const ref = await addDoc(collection(db, "households"), {
    name: nomeFinal,
    ownerUid,
    memberUids: [ownerUid],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await updateDoc(doc(db, "users", ownerUid), {
    householdId: ref.id,
    role: "owner",
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

export async function entrarEmHousehold(householdId, uid) {
  const id = (householdId || "").trim();

  if (!id) {
    throw new Error("Informe o código da família.");
  }

  const householdRef = doc(db, "households", id);
  const householdSnap = await getDoc(householdRef);

  if (!householdSnap.exists()) {
    throw new Error("Família não encontrada.");
  }

  await updateDoc(householdRef, {
    memberUids: arrayUnion(uid),
    updatedAt: serverTimestamp(),
  });

  await updateDoc(doc(db, "users", uid), {
    householdId: id,
    role: "member",
    updatedAt: serverTimestamp(),
  });

  return householdSnap.data();
}

export async function buscarHousehold(householdId) {
  const ref = doc(db, "households", householdId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return null;
  }

  return { id: snap.id, ...snap.data() };
}