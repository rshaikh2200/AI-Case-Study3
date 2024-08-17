import React from 'react';
import { auth } from '../app/firebase';
import AuthPage from '../app/components/AuthPage';
import Home from '../app/components/page';
import { useAuthState } from '../app/hooks/useAuthState';
import { useRouter } from 'next/router';

export default function Index() {
  const { user } = useAuthState();
  const router = useRouter();

  // Function to handle sign-in button click
  const handleSignInClick = () => {
    router.push('/auth'); // Redirect to sign-in page
  };

  // Redirect to home page if user is authenticated
  React.useEffect(() => {
    if (user) {
      router.push('/home'); // Redirect to home page after authentication
    }
  }, [user]);

  return user ? (
    <Home />
  ) : (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>Welcome to Our App</h1>
      <p>Please sign in to continue</p>
      <button onClick={handleSignInClick} style={styles.signInButton}>
        Sign In
      </button>
    </div>
  );
}

const styles = {
  signInButton: {
    padding: '10px 20px',
    fontSize: '16px',
    color: '#fff',
    backgroundColor: '#007bff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};
