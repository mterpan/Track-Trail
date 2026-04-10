/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Applications from '@/pages/Applications';
import ApplicationDetails from '@/pages/ApplicationDetails';
import Contacts from '@/pages/Contacts';
import Login from '@/pages/Login';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Toaster } from '@/components/ui/sonner';

import { motion, AnimatePresence } from 'motion/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Loading } from '@/components/ui/loading';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <Loading key="loading" fullPage text="Initializing Track&Trail..." />
      ) : !user ? (
        <motion.div
          key="login"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Login />
        </motion.div>
      ) : (
        <motion.div
          key="app"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="min-h-screen"
        >
          <ErrorBoundary>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="applications" element={<Applications />} />
                  <Route path="applications/:id" element={<ApplicationDetails />} />
                  <Route path="contacts" element={<Contacts />} />
                </Route>
              </Routes>
              <Toaster position="top-center" />
            </BrowserRouter>
          </ErrorBoundary>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
