
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider, CssBaseline, createTheme } from '@mui/material';
import { useMemo } from 'react';

function MyApp({ Component, pageProps }) {
  const theme = useMemo(() => createTheme(), []); // Default theme, you can customize it

  return (
    <ClerkProvider {...pageProps}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Component {...pageProps} />
      </ThemeProvider>
    </ClerkProvider>
  );
}

export default MyApp;
