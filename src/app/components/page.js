'use client';

import React, { useEffect, useState, useRef } from "react";
import { Box, Stack, TextField, Button, Paper, Typography, Avatar, List, ListItem, ListItemText, Divider, IconButton } from '@mui/material';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import LogoutIcon from '@mui/icons-material/Logout';
import AddIcon from '@mui/icons-material/Add';
import MenuIcon from '@mui/icons-material/Menu';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { CircularProgress } from '@mui/material';
import CircleIcon from '@mui/icons-material/Circle';

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
  const [chats, setChats] = useState([{
    id: Date.now(),
    messages: [
      {
        role: 'assistant',
        content: "Hi! I'm Alex, an AI English Learning Assistant.",
      },
    ],
  }]);
  const [currentChatId, setCurrentChatId] = useState(chats[0].id);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [typingMessage, setTypingMessage] = useState('');
  const [isSidebarVisible, setIsSidebarVisible] = useState(true); // Sidebar visibility state
  const messagesEndRef = useRef(null);
  const user = auth.currentUser;

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  const sendMessage = async () => {
    if (message.trim() === '') return;

    const updatedChats = chats.map(chat => {
      if (chat.id === currentChatId) {
        return {
          ...chat,
          messages: [...chat.messages, { role: 'user', content: message }]
        };
      }
      return chat;
    });

    setChats(updatedChats);
    setMessage('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        role: 'assistant',
        content: "I'm processing your request...",
      };

      const updatedChatsWithResponse = updatedChats.map(chat => {
        if (chat.id === currentChatId) {
          return {
            ...chat,
            messages: [...chat.messages, aiResponse]
          };
        }
        return chat;
      });

      setChats(updatedChatsWithResponse);
      setIsLoading(false);
      scrollToBottom();
    }, 1000);
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
  }, [chats, currentChatId]);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const createNewChat = () => {
    const newChat = {
      id: Date.now(),
      messages: [
        {
          role: 'assistant',
          content: "New chat created! How can I assist you?",
        },
      ],
    };

    setChats([...chats, newChat]);
    setCurrentChatId(newChat.id);
  };

  const selectChat = (id) => {
    setCurrentChatId(id);
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box
        width="100vw"
        height="100vh"
        display="flex"
      >
        {isSidebarVisible && (
          <Paper
            elevation={6}
            sx={{
              width: { xs: '100%', sm: '30%', md: '20%' }, // Responsive width
              height: '100%',
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              bgcolor: 'background.paper',
              position: { xs: 'absolute', sm: 'static' }, // Adjust position on small screens
              zIndex: { xs: 1000, sm: 'auto' }, // Ensure sidebar is on top on small screens
            }}
          >
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={createNewChat}
              sx={{
                mb: 2,
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
              }}
            >
              New Chat
            </Button>

            <List sx={{ overflowY: 'auto', flexGrow: 1 }}>
              {chats.map((chat) => (
                <React.Fragment key={chat.id}>
                  <ListItem
                    button
                    selected={chat.id === currentChatId}
                    onClick={() => selectChat(chat.id)}
                    sx={{
                      bgcolor: chat.id === currentChatId ? 'primary.dark' : 'inherit',
                      '&:hover': {
                        bgcolor: 'primary.light',
                      },
                    }}
                  >
                    <ListItemText
                      primary={`Chat ${chats.indexOf(chat) + 1}`}
                      secondary={chat.messages[0].content.substring(0, 20) + '...'}
                    />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>

            <Button
              variant="contained"
              onClick={handleLogout}
              sx={{
                mt: 2,
                bgcolor: 'secondary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'secondary.dark',
                },
              }}
            >
              Logout
            </Button>
          </Paper>
        )}

        <Paper
          elevation={6}
          sx={{
            width: isSidebarVisible ? { xs: '100%', sm: '70%', md: '80%' } : '100%', // Adjust width based on sidebar visibility
            height: '100%',
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            borderRadius: 2,
            boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
            bgcolor: 'background.paper',
            ml: { xs: isSidebarVisible ? 'auto' : 0 }, // Adjust margin when sidebar is visible on small screens
          }}
        >
          {/* Toggle Button */}
          <IconButton
            onClick={toggleSidebar}
            sx={{
              position: 'absolute',
              top: 8,
              left: isSidebarVisible ? 240 : 8, // Adjust the left position based on sidebar visibility
              bgcolor: 'background.paper',
              color: 'primary.main',
              zIndex: 2000, // Ensure the button is on top of all elements
            }}
          >
            <MenuIcon />
          </IconButton>

          {/* Header with AI Support Assistance, image, and online status */}
          <Box
            sx={{
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              pl: isSidebarVisible ? 56 : 8, // Adjust padding based on sidebar visibility
            }}
          >
            <Box display="flex" alignItems="center">
              <Avatar
                alt="AI Avatar"
                src="/src/app/images/image1.jpg" // Adjust the path to your image file
                sx={{ width: 32, height: 32, mr: 1 }}
              />
              <Typography variant="h6" sx={{ color: 'text.primary' }}>
                AI Support Assistance
              </Typography>
            </Box>
            <Box display="flex" alignItems="center">
              <CircleIcon sx={{ color: 'green', fontSize: 14, mr: 1 }} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Online
              </Typography>
            </Box>
          </Box>

          <Stack
            direction="column"
            spacing={2}
            flexGrow={1}
            sx={{ overflowY: 'auto', maxHeight: 'calc(100% - 80px)', p: 1, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 'inset 0 0 10px rgba(0,0,0,0.1)' }}
          >
            {chats.find(chat => chat.id === currentChatId)?.messages.map((message, index) => (
              <Box
                key={index}
                display="flex"
                justifyContent={
                  message.role === 'assistant' ? 'flex-start' : 'flex-end'
                }
                sx={{ mb: 1 }}
              >
                {message.role === 'assistant' && (
                  <Avatar
                    alt="AI Avatar"
                    src="/src/app/ai-avatar.png" // Adjust the path to your image file
                    sx={{ width: 24, height: 24, mr: 1 }}
                  />
                )}
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
                  <Typography variant="body2">
                    {message.role === 'assistant' && isLoading && index === chats.find(chat => chat.id === currentChatId)?.messages.length - 1
                      ? <CircularProgress size={14} sx={{ color: 'white' }} />
                      : message.content}
                  </Typography>
                </Box>
              </Box>
            ))}
            {isLoading && typingMessage && (
              <Box
                display="flex"
                justifyContent="flex-start"
                sx={{ mb: 1 }}
              >
                <Avatar
                  alt="AI Avatar"
                  src="/src/app/ai-avatar.png" // Adjust the path to your image file
                  sx={{ width: 24, height: 24, mr: 1 }}
                />
                <Box
                  sx={{
                    bgcolor: 'primary.main',
                    color: 'white',
                    borderRadius: 2,
                    p: 2,
                    maxWidth: '70%',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    wordWrap: 'break-word',
                  }}
                >
                  <Typography variant="body2">{typingMessage}</Typography>
                </Box>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Stack>

          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="Chat with AI Assistance"
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
