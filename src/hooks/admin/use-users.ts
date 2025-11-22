"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

type UserItem = {
  uid: string;
  email?: string;
  displayName?: string;
};

type UseUsersResult = {
  users: UserItem[];
  loading: boolean;
  error: Error | null;
};

export default function useUsers(): UseUsersResult {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("email"));
    setLoading(true);
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => {
        const data = d.data() as any;
        return {
          uid: data.uid ?? d.id,
          email: data.email,
          displayName: data.displayName ?? data.name ?? data.fullName,
        } as UserItem;
      });
      setUsers(docs);
      setLoading(false);
    }, (err) => {
      setError(err as Error);
      setLoading(false);
    });

    return () => { try { unsub(); } catch {} };
  }, []);

  return { users, loading, error };
}
