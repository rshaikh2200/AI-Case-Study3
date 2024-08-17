import React, { useState } from 'react';
import { googleProvider, auth } from '../firebase'; // Ensure these imports are correct
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { Box, TextField, Button, Typography, Stack, CircularProgress, Paper, Divider, IconButton } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';

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
      sx={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        padding: 2,
      }}
    >
      <Paper
        elevation={6}
        sx={{
          padding: 4,
          maxWidth: 400,
          width: '100%',
          borderRadius: 2,
          backgroundColor: '#fff',
        }}
      >
        <Stack spacing={3} alignItems="center">
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </Typography>

          {error && <Typography color="error" sx={{ textAlign: 'center' }}>{error}</Typography>}

          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            variant="outlined"
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            variant="outlined"
          />

          <Button
            variant="contained"
            color="primary"
            onClick={handleAuth}
            disabled={loading}
            fullWidth
            sx={{
              padding: '10px 0',
              fontSize: '16px',
              borderRadius: '8px',
            }}
          >
            {loading ? <CircularProgress size={24} /> : isSignUp ? 'Sign Up' : 'Sign In'}
          </Button>

          <Divider sx={{ width: '100%' }}>or</Divider>

          <Button
            variant="outlined"
            color="primary"
            onClick={handleGoogleSignIn}
            disabled={loading}
            fullWidth
            startIcon={<GoogleIcon />}
            sx={{
              padding: '10px 0',
              fontSize: '16px',
              borderRadius: '8px',
              borderColor: '#1976d2',
            }}
          >
            {loading ? <CircularProgress size={24} /> : 'Sign in with Google'}
          </Button>

          <Typography
            variant="body2"
            color="textSecondary"
            sx={{ cursor: 'pointer', mt: 2 }}
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
