// src/app/pages/index.js
import React, { useEffect, useState } from 'react';
import { auth } from '../firebase'; // Corrected the import path
import AuthPage from '../components/AuthPage'; // Corrected the import path
import Home from '../components/page'; // Ensure correct import path

export default function Index() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });

    return () => unsubscribe();
  }, []);

  return user ? <Home /> : <AuthPage />;
}
