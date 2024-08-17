import React from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { auth } from '../app/firebase'; 
import AuthPage from '../app/components/AuthPage'; 
import Home from '../app/components/page'; 
import { useAuthState } from '../app/hooks/useAuthState';

const defaultTheme = createTheme(); // Create a default theme

export default function Index() {
  const { user } = useAuthState();

  return (
    <ThemeProvider theme={defaultTheme}>
      {user ? <Home /> : <AuthPage />}
    </ThemeProvider>
  );
}
