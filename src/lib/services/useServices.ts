import { useState, useEffect } from 'react';
import { db } from '../firebase/client';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { SERVICES } from '../../consts';

export interface Service {
  id: string;
  name: string;
  description: string;
  icon: string;
  jobs: string[];
  note?: string;
  order?: number;
}

interface UseServicesReturn {
  services: Service[];
  loading: boolean;
  error: Error | null;
}

/**
 * React hook for fetching services from Firestore with real-time updates.
 * Falls back to SERVICES from consts.ts if Firestore is empty or unavailable.
 */
export function useServices(): UseServicesReturn {
  const [services, setServices] = useState<Service[]>(SERVICES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'skills'), orderBy('order', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const firestoreServices = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Service[];
          setServices(firestoreServices);
        }
        // If empty, keep fallback SERVICES from consts.ts
        setLoading(false);
      },
      (err) => {
        console.warn('useServices: Failed to fetch from Firestore, using fallback', err);
        setError(err);
        setLoading(false);
        // Keep using SERVICES fallback
      }
    );

    return () => unsubscribe();
  }, []);

  return { services, loading, error };
}
