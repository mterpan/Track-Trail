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
import { isDemoMode } from '@/lib/db';

import { motion, AnimatePresence } from 'motion/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Loading } from '@/components/ui/loading';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoActive, setDemoActive] = useState(isDemoMode());

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      // If we sign in for real, disable demo mode
      if (currentUser) setDemoActive(false);
    });
    return () => unsubscribe();
  }, []);

  // Listen for demo mode changes (e.g. from Login page)
  useEffect(() => {
    const handleStorageChange = () => {
      setDemoActive(isDemoMode());
    };
    window.addEventListener('storage', handleStorageChange);
    // Custom event for same-tab updates
    window.addEventListener('demoModeChanged', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('demoModeChanged', handleStorageChange);
    };
  }, []);

  const isAuthenticated = !!user || demoActive;

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <Loading key="loading" fullPage text="Initializing Track&Trail..." />
      ) : !isAuthenticated ? (
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
