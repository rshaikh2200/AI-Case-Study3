import React, { useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { Box, TextField, Button, Typography, Stack, CircularProgress } from '@mui/material';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async () => {
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        // Sign up
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        // Sign in
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="100vh"
    >
      <Typography variant="h4" gutterBottom>
        {isSignUp ? 'Sign Up' : 'Sign In'}
      </Typography>
      <Stack spacing={2} width="300px">
        <TextField
          label="Email"
          variant="outlined"
          fullWidth
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Password"
          type="password"
          variant="outlined"
          fullWidth
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <Typography color="error">{error}</Typography>}
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={handleAuth}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : isSignUp ? 'Sign Up' : 'Sign In'}
        </Button>
        <Button
          variant="contained"
          color="secondary"
          fullWidth
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign in with Google'}
        </Button>
        <Button
          color="inherit"
          onClick={() => setIsSignUp(!isSignUp)}
        >
          {isSignUp ? 'Already have an account? Sign In' : 'New user? Sign Up'}
        </Button>
      </Stack>
    </Box>
  );
}
