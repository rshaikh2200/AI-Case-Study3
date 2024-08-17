import React, { useState } from 'react';
import {
  Avatar, Button, CssBaseline, TextField, FormControlLabel, Checkbox, Link,
  Paper, Box, Grid, Typography, ThemeProvider, CircularProgress, Divider
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import GoogleIcon from '@mui/icons-material/Google';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { googleProvider, auth } from '../firebase'; // Ensure these imports are correct
import { defaultTheme } from './theme'; // Import your theme if you have one

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
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
    <ThemeProvider theme={defaultTheme}>
      <Grid container component="main" sx={{ height: '100vh' }}>
        <CssBaseline />
        <Grid
          item
          xs={false}
          sm={4}
          md={7}
          sx={{
               backgroundColor: (t) =>
              t.palette.mode === 'light' ? t.palette.grey[50] : t
