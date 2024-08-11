'use client'

import { useEffect, useState, useRef } from "react";
import { Box, Stack, TextField, Button, Paper, CircularProgress, Typography, IconButton } from '@mui/material';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import LogoutIcon from '@mui/icons-material/Logout';
import { collection, doc, getDoc, setDoc } from 'firebase/firestore';

export default function Home() {

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm the Headstarter support assistant. How can I help you today?",
    },
  ]);

  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const user = auth.currentUser;

  useEffect(() => {
    const loadChatHistory = async () => {
      if (user) {
        const chatDoc = doc(db, 'chats', user.uid);
        const chatSnapshot = await getDoc(chatDoc);
        if (chatSnapshot.exists()) {
          setMessages(chatSnapshot.data().messages);
        } else {
          setMessages([
            {
              role: 'assistant',
              content: "Hi! I'm the Headstarter support assistant. How can I help you today?",
            },
          ]);
        }
      }
    };
  
    loadChatHistory();
  }, [user]);

  const sendMessage = async () => {
    if (!message.trim() || isLoading) return; 
    setMessage('');  
    setIsLoading(true);
    setMessages((messages) => [
      ...messages,
      { role: 'user', content: message },  
    ]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-type': 'application/json',
        },
        body: JSON.stringify({ body: message }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessages((messages) => [
          ...messages,
          { role: 'assistant', content: data.output },
        ]);
      } else {
        setMessages((messages) => [
          ...messages,
          { role: 'assistant', content: data.error || "Error occurred while processing your request." },
        ]);
      }

    } catch (error) {
      console.log("Post request error: %s", error);
      setMessages((messages) => [
        ...messages,
        { role: 'assistant', content: "I'm sorry, but I encountered an error. Please try again later." },
      ]);
    }

    try {
      if (user) {
        await setDoc(doc(db, 'chats', user.uid), { messages });
      }
    } catch (err) {
      console.log("Error saving chat history: %s", err);
    }

    setIsLoading(false);
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <Box
      width="100vw"
      height="100vh"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      sx={{ bgcolor: '#f5f5f5' }}
    >
      <Paper
        elevation={4}
        sx={{
          width: { xs: '95%', sm: '85%', md: '600px' },
          height: '700px',
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          borderRadius: '12px',
          boxShadow: '0 6px 18px rgba(0,0,0,0.1)',
        }}
      >
        <IconButton
          onClick={handleLogout}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            color: '#333',
          }}
        >
          <LogoutIcon />
        </IconButton>

        <Stack
          direction="column"
          spacing={2}
          flexGrow={1}
          sx={{ overflowY: 'auto', maxHeight: '100%', mb: 2 }}
        >
          {messages.map((message, index) => (
            <Box
              key={index}
              display="flex"
              justifyContent={
                message.role === 'assistant' ? 'flex-start' : 'flex-end'
              }
              sx={{ mb: 1 }}
            >
              <Box
                sx={{
                  bgcolor: message.role === 'assistant' ? '#1976d2' : '#673ab7',
                  color: 'white',
                  borderRadius: '12px',
                  p: 2,
                  maxWidth: '70%',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              >
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{message.content}</Typography>
              </Box>
            </Box>
          ))}
          <div ref={messagesEndRef} />
        </Stack>
        <Stack direction="row" spacing={2}>
          <TextField
            label="Type your message..."
            fullWidth
            variant="outlined"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            multiline
            maxRows={4}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              },
            }}
          />
          <Button
            variant="contained"
            onClick={sendMessage}
            disabled={isLoading}
            sx={{
              minWidth: '120px',
              bgcolor: '#1976d2',
              '&:hover': { bgcolor: '#1565c0' },
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          >
            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Send'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
