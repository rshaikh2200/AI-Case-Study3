import React, { useState } from 'react';
import { googleProvider, auth } from '../firebase';  // Ensure these imports are correct
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
    <Box>
      <Stack spacing={2} alignItems="center">
        <Typography variant="h4">{isSignUp ? 'Sign Up' : 'Sign In'}</Typography>

        {error && <Typography color="error">{error}</Typography>}

        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
        />

        <Button variant="contained" color="primary" onClick={handleAuth} disabled={loading} fullWidth>
          {loading ? <CircularProgress size={24} /> : isSignUp ? 'Sign Up' : 'Sign In'}
        </Button>

        <Button variant="outlined" color="primary" onClick={handleGoogleSignIn} disabled={loading} fullWidth>
          {loading ? <CircularProgress size={24} /> : 'Sign in with Google'}
        </Button>

        <Button color="secondary" onClick={() => setIsSignUp(!isSignUp)}>
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </Button>
      </Stack>
    </Box>
  );
}
