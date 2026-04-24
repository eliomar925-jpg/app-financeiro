/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function cadastro(nome, email, password) {
    const credencial = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", credencial.user.uid), {
      email: credencial.user.email,
      displayName: (nome || "").trim(),
      householdId: null,
      role: "owner",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return credencial;
  }

  function logout() {
    return signOut(auth);
  }

  function resetSenha(email) {
    return sendPasswordResetEmail(auth, email);
  }

  const refreshUserProfile = useCallback(async (uid = user?.uid) => {
    if (!uid) {
      setUserProfile(null);
      return null;
    }

    setLoadingProfile(true);

    try {
      const snap = await getDoc(doc(db, "users", uid));

      if (!snap.exists()) {
        setUserProfile(null);
        return null;
      }

      const profile = { id: snap.id, ...snap.data() };
      setUserProfile(profile);
      return profile;
    } finally {
      setLoadingProfile(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usuarioLogado) => {
      setUser(usuarioLogado);

      if (usuarioLogado) {
        await refreshUserProfile(usuarioLogado.uid);
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, [refreshUserProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loadingProfile,
        login,
        cadastro,
        logout,
        resetSenha,
        refreshUserProfile,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}