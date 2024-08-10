'use client'

import { useEffect, useState, useRef } from "react";
import { Box, Stack, TextField, Button, Paper, CircularProgress, Typography } from '@mui/material';

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

  return (
    <Box
      width="100vw"
      height="100vh"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      sx={{ bgcolor: 'background.default' }} // Correct usage of bgcolor
    >
      <Paper
        elevation={3}
        sx={{
          width: { xs: '90%', sm: '80%', md: '500px' },
          height: '700px',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <Stack
          direction="column"
          spacing={2}
          flexGrow={1}
          sx={{ overflow: 'auto', maxHeight: '100%', mb: 2 }}
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
                  borderRadius: 1,
                  p: 2,
                  maxWidth: '75%',
                }}
              >
                <Typography variant="body2">{message.content}</Typography>
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
          />
          <Button 
            variant="contained" 
            onClick={sendMessage}
            disabled={isLoading}
            sx={{ minWidth: '100px' }}
          >
            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Send'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
