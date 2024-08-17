'use client';

import { useEffect, useState, useRef } from "react";
import { Box, Stack, TextField, Button, Paper, Typography, IconButton, Avatar } from '@mui/material';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import LogoutIcon from '@mui/icons-material/Logout';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import image1 from '../../images/image1.jpg';

// Dark mode theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1A73E8',
    },
    secondary: {
      main: '#9C27B0',
    },
    background: {
      default: '#121212',
      paper: '#1D1D1D',
    },
    text: {
      primary: '#E0E0E0',
      secondary: '#B0B0B0',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm Alex, A AI English Learning Assistance. How can I help you today?",
    },
  ]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const user = auth.currentUser;

  const sendMessage = async () => {
    if (!message.trim()) return;
    if (isLoading) return;

    setIsLoading(true);
    const newMessage = { role: 'user', content: message };

    try {
      setMessages((prevMessages) => [
        ...prevMessages,
        newMessage,
        { role: 'assistant', content: '...' },
      ]);

      const response = await fetch('/api/claude-bedrock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: newMessage.content }),
      });

      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(`Network response was not ok: ${response.status} ${errorMessage}`);
      }

      const data = await response.json();

      setMessages((prevMessages) => {
        const updatedMessages = [...prevMessages];
        updatedMessages[updatedMessages.length - 1] = {
          role: 'assistant',
          content: data.response || "No response received.",
        };
        return updatedMessages;
      });

    } catch (error) {
      console.error('Error:', error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: 'assistant', content: "I'm sorry, but I encountered an error. Please try again later." },
      ]);
    } finally {
      setIsLoading(false);
      setMessage('');
      scrollToBottom();
    }
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
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box
        width="100vw"
        height="100vh"
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        sx={{ bgcolor: 'background.default', p: 2 }}
      >
        <Paper
          elevation={6}
          sx={{
            width: { xs: '100%', sm: '90%', md: '600px' },
            height: '80vh',
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            borderRadius: 2,
            boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
            bgcolor: 'background.paper',
          }}
        >
          <IconButton
            onClick={handleLogout}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              color: 'grey.400',
              '&:hover': {
                color: 'grey.100',
              },
            }}
          >
            <LogoutIcon />
          </IconButton>

          <Stack
            direction="column"
            alignItems="center"
            sx={{ mb: 3 }}
          >
            <Avatar
              alt="AI Support Agent"
              src={image1} // Replace with the actual image path
              sx={{ width: 56, height: 56 }}
            />
            <Typography variant="h6" sx={{ mt: 1, color: 'text.primary' }}>
              Alex
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              AI Support Agent
            </Typography>
          </Stack>

          <Stack
            direction="column"
            spacing={2}
            flexGrow={1}
            sx={{ overflowY: 'auto', maxHeight: 'calc(100% - 80px)', p: 1, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 'inset 0 0 10px rgba(0,0,0,0.1)' }}
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
                    bgcolor: message.role === 'assistant' ? 'primary.main' : 'secondary.main',
                    color: 'white',
                    borderRadius: 2,
                    p: 2,
                    maxWidth: '70%',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    wordWrap: 'break-word',
                  }}
                >
                  <Typography variant="body2">{message.content}</Typography>
                </Box>
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </Stack>

          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="Type your message..."
              fullWidth
              variant="outlined"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              multiline
              maxRows={4}
              sx={{ bgcolor: 'background.default', borderRadius: 2 }}
            />
            <Button
              variant="contained"
              onClick={sendMessage}
              sx={{
                minWidth: '100px',
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
              }}
            >
              Send
            </Button>
          </Stack>
        </Paper>
      </Box>
    </ThemeProvider>
  );
}
