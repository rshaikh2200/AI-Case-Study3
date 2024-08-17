'use client';

import { useEffect, useState, useRef } from "react";
import { Box, Stack, TextField, Button, Paper, Typography, IconButton, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import { auth, db } from '../firebase'; // Ensure these imports are correct
import { signOut } from 'firebase/auth';
import LogoutIcon from '@mui/icons-material/Logout';
import { collection, doc, getDoc, setDoc } from 'firebase/firestore';


const translations = {
  en: {
    greeting: "Hi! I'm the AI English Learning Assistant. How can I help you today?",
    chatWithSupport: "Chat with Support",
    typeMessage: "Type your message...",
    send: "Send",
    error: "I'm sorry, but I encountered an error. Please try again later.",
    noResponse: "No response received.",
  },
  hi: {
    greeting: "नमस्ते! मैं एआई इंग्लिश लर्निंग असिस्टेंट हूं। मैं आज आपकी कैसे मदद कर सकता हूं?",
    chatWithSupport: "सपोर्ट से चैट करें",
    typeMessage: "अपना संदेश लिखें...",
    send: "भेजें",
    error: "मुझे खेद है, लेकिन मुझे एक त्रुटि का सामना करना पड़ा। कृपया बाद में पुनः प्रयास करें।",
    noResponse: "कोई प्रतिक्रिया प्राप्त नहीं हुई।",
  },
  es: {
    greeting: "¡Hola! Soy el Asistente de Aprendizaje de Inglés de IA. ¿Cómo puedo ayudarte hoy?",
    chatWithSupport: "Chatear con Soporte",
    typeMessage: "Escribe tu mensaje...",
    send: "Enviar",
    error: "Lo siento, pero encontré un error. Por favor, inténtalo de nuevo más tarde.",
    noResponse: "No se recibió respuesta.",
  },
  fr: {
    greeting: "Salut! Je suis l'Assistant d'apprentissage de l'anglais IA. Comment puis-je vous aider aujourd'hui?",
    chatWithSupport: "Chat avec le Support",
    typeMessage: "Tapez votre message...",
    send: "Envoyer",
    error: "Je suis désolé, mais j'ai rencontré une erreur. Veuillez réessayer plus tard.",
    noResponse: "Aucune réponse reçue.",
  },
  de: {
    greeting: "Hallo! Ich bin der KI-Englisch-Lernassistent. Wie kann ich Ihnen heute helfen?",
    chatWithSupport: "Mit Support chatten",
    typeMessage: "Geben Sie Ihre Nachricht ein...",
    send: "Senden",
    error: "Es tut mir leid, aber es gab einen Fehler. Bitte versuchen Sie es später noch einmal.",
    noResponse: "Keine Antwort erhalten.",
  },
  ar: {
    greeting: "مرحبًا! أنا مساعد تعلم اللغة الإنجليزية بالذكاء الاصطناعي. كيف يمكنني مساعدتك اليوم؟",
    chatWithSupport: "الدردشة مع الدعم",
    typeMessage: "اكتب رسالتك...",
    send: "إرسال",
    error: "عذرًا، واجهت خطأ. يرجى المحاولة مرة أخرى لاحقًا.",
    noResponse: "لم يتم استلام أي رد.",
  },
};

export default function Home() {
  const [language, setLanguage] = useState('en');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: translations[language].greeting,
    },
  ]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const user = auth.currentUser;

  const sendMessage = async () => {
    if (!message.trim()) return;  // Don't send empty messages
    if (isLoading) return; // Prevent multiple simultaneous requests

    setIsLoading(true);
    const newMessage = { role: 'user', content: message };

    try {
      // Translate the user's message to English before sending
      const translationResponse = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: message, targetLanguage: 'en' }),
      });

      const translatedMessage = await translationResponse.json();
      newMessage.content = translatedMessage.translatedText;

      // Update messages state before sending to backend
      setMessages((prevMessages) => [
        ...prevMessages,
        newMessage,
        { role: 'assistant', content: '...' },  // Placeholder for the assistant's response
      ]);

      const response = await fetch('/api/claude-bedrock', {  // Update this endpoint if necessary
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: newMessage.content, language }),
      });

      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(`Network response was not ok: ${response.status} ${errorMessage}`);
      }

      const data = await response.json();

      // Translate the assistant's response back to the user's selected language
      const translatedResponse = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: data.response, targetLanguage: language }),
      });

      const finalResponse = await translatedResponse.json();

      // Update the assistant's message with the actual translated response
      setMessages((prevMessages) => {
        const updatedMessages = [...prevMessages];
        updatedMessages[updatedMessages.length - 1] = {
          role: 'assistant',
          content: finalResponse.translatedText || translations[language].noResponse,
        };
        return updatedMessages;
      });

    } catch (error) {
      console.error('Error:', error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: 'assistant', content: translations[language].error },
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
        }}
      >
        <IconButton
          onClick={handleLogout}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            color: 'grey.600',
            '&:hover': {
              color: 'grey.900',
            },
          }}
        >
          <LogoutIcon />
        </IconButton>

        <FormControl sx={{ mb: 2, minWidth: 120 }}>
          <InputLabel id="language-select-label">Language</InputLabel>
          <Select
            labelId="language-select-label"
            value={language}
            label="Language"
            onChange={(e) => setLanguage(e.target.value)}
          >
            <MenuItem value="en">English</MenuItem>
            <MenuItem value="hi">Hindi</MenuItem>
            <MenuItem value="es">Spanish</MenuItem>
            <MenuItem value="fr">French</MenuItem>
            <MenuItem value="de">German</MenuItem>
            <MenuItem value="ar">Arabic</MenuItem>
          </Select>
        </FormControl>

        <Typography variant="h6" gutterBottom sx={{ textAlign: 'center', color: 'text.primary' }}>
          {translations[language].chatWithSupport}
        </Typography>

        <Stack
          direction="column"
          spacing={2}
          flexGrow={1}
          sx={{ overflowY: 'auto', maxHeight: 'calc(100% - 80px)', p: 1, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)' }}
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
            label={translations[language].typeMessage}
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
            {translations[language].send}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}