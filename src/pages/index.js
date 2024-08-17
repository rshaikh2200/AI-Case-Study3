import React from 'react';
import { auth } from '../app/firebase'; 
import Home from '../app/components/page'; 
import { useAuthState } from '../app/hooks/useAuthState';

export default function Index() {
  const { user } = useAuthState();

  return user ? <Home /> : null;
}
