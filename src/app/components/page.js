'use client';

import React, { useState, useEffect } from 'react';
import {
  Avatar, Button, CssBaseline, TextField, FormControlLabel, Checkbox, Link,
  Paper, Box, Grid, Typography, CircularProgress, Divider
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import GoogleIcon from '@mui/icons-material/Google';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { googleProvider, auth } from '../firebase';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [typedResponse, setTypedResponse] = useState('');
  const [typing, setTyping] = useState(false);

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
      // Simulate AI response load and typing effect
      simulateAiResponse('Welcome to the platform!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const simulateAiResponse = (response) => {
    setAiResponse(response);
    setTypedResponse('');
    setTyping(true);
  };

  useEffect(() => {
    if (typing) {
      let currentIndex = 0;
      const typingInterval = setInterval(() => {
        if (currentIndex < aiResponse.length) {
          setTypedResponse((prev) => prev + aiResponse[currentIndex]);
          currentIndex++;
        } else {
          clearInterval(typingInterval);
          setTyping(false);
        }
      }, 50); // Adjust typing speed here
    }
  }, [typing, aiResponse]);

  return (
    <Grid container component="main" sx={{ height: '100vh' }}>
      <CssBaseline />
      <Grid
        item
        xs={false}
        sm={4}
        md={7}
        sx={{
          backgroundImage: 'url("/static/images/templates/templates-images/sign-in-side-bg.png")',
          backgroundColor: (t) =>
            t.palette.mode === 'light' ? t.palette.grey[50] : t.palette.grey[900],
          backgroundSize: 'cover',
          backgroundPosition: 'left',
        }}
      />
      <Grid item xs={12} sm={8} md={5} component={Paper} elevation={6} square>
        <Box
          sx={{
            my: 8,
            mx: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
            <LockOutlinedIcon />
          </Avatar>
          <Typography component="h1" variant="h5">
            {isSignUp ? 'Create Account' : 'Sign in'}
          </Typography>
          {error && <Typography color="error">{error}</Typography>}
          <Box component="form" noValidate onSubmit={handleAuth} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <FormControlLabel
              control={<Checkbox value="remember" color="primary" />}
              label="Remember me"
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Box
                    sx={{
                      width: '50%',
                      height: '4px',
                      bgcolor: 'primary.main',
                      animation: 'loadingBar 1.5s linear infinite',
                      '@keyframes loadingBar': {
                        '0%': { transform: 'scaleX(0)' },
                        '50%': { transform: 'scaleX(0.5)' },
                        '100%': { transform: 'scaleX(1)' },
                      }
                    }}
                  />
                </Box>
              ) : isSignUp ? 'Sign Up' : 'Sign In'}
            </Button>
            <Divider sx={{ width: '100%' }}>or</Divider>
            <Button
              variant="outlined"
              fullWidth
              onClick={handleGoogleSignIn}
              disabled={loading}
              startIcon={<GoogleIcon />}
              sx={{ mt: 2 }}
            >
              {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Box
                    sx={{
                      width: '50%',
                      height: '4px',
                      bgcolor: 'primary.main',
                      animation: 'loadingBar 1.5s linear infinite',
                      '@keyframes loadingBar': {
                        '0%': { transform: 'scaleX(0)' },
                        '50%': { transform: 'scaleX(0.5)' },
                        '100%': { transform: 'scaleX(1)' },
                      }
                    }}
                  />
                </Box>
              ) : 'Sign in with Google'}
            </Button>
            <Grid container sx={{ mt: 2 }}>
              <Grid item>
                <Link
                  variant="body2"
                  onClick={() => setIsSignUp(!isSignUp)}
                >
                  {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </Link>
              </Grid>
            </Grid>
          </Box>
          <Box sx={{ mt: 4 }}>
            <Typography variant="body1">
              {typing ? typedResponse : aiResponse}
            </Typography>
          </Box>
        </Box>
      </Grid>
    </Grid>
  );
}
