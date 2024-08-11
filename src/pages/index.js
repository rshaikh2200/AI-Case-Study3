import React from 'react';
import { auth } from '../app/firebase'; // Corrected the import path
import AuthPage from '../app/components/AuthPage'; // Corrected the import path
import Home from '../app/components/page'; // Ensure correct import path
import { useAuthState } from '../app/hooks/useAuthState';
import { Box, CircularProgress } from '@mui/material'; // Import Box and CircularProgress from MUI

export default function Index() {
  const { user, loading } = useAuthState();

  if (loading) {
    return (
      <Box
        width="100vw"
        height="100vh"
        display="flex"
        justifyContent="center"
        alignItems="center"
      >
        <CircularProgress />
      </Box>
    );
  }

  return user ? <Home /> : <AuthPage />;
}
