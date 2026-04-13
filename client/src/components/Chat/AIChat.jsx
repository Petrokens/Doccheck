// AI Chat Component for asking questions

import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Stack,
  Typography,
  Avatar,
  Chip,
  Collapse,
  CircularProgress
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import ChatIcon from '@mui/icons-material/Chat';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import { callOpenRouterAPI, getAPIKey } from '../../api/openRouter.js';
import './AIChat.css';

export function AIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant. I can help you with questions about QC analysis, document processing, engineering standards, or anything related to your work. How can I assist you today?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const apiKey = getAPIKey();
      if (!apiKey) {
        throw new Error('API key not configured. Please set it in API Settings.');
      }

      // Build context-aware prompt
      const systemPrompt = `You are an expert AI assistant for a Quality Control (QC) platform for engineering documents. 
You help users with:
- Questions about QC analysis and results
- Engineering document standards and best practices
- Understanding QC scores and categories
- Document classification and types
- Technical questions about Process, Piping, Civil, Mechanical, Electrical, Instrumentation, HSE disciplines
- General questions about the platform

Be helpful, concise, and professional. If asked about specific documents, provide general guidance as you don't have access to the user's current document content.`;

      // Build conversation history (exclude system message and current user message)
      const conversationHistory = messages
        .slice(1, -1) // Exclude first system message and last user message
        .slice(-6) // Last 6 messages for context (3 exchanges)
        .map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        }));

      const response = await callOpenRouterAPI(
        userMessage.content, // User's question as prompt
        '', // No document content for chat
        apiKey,
        {
          model: null, // Use default
          maxTokens: 2000,
          provider: 'nvidia',
          systemPrompt: systemPrompt, // Custom system prompt for chat
          conversationHistory: conversationHistory
        }
      );

      const assistantMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      // Format error message - if it already contains helpful guidance, use it as-is
      let errorContent = error.message;
      
      // If it's a generic error, add helpful context
      if (!error.message.includes('API Key') && 
          !error.message.includes('Solutions:') && 
          !error.message.includes('Please try')) {
        errorContent = `Sorry, I encountered an error: ${error.message}\n\n` +
          `Please check your API key configuration in API Settings (⚙️ button) or try again later.`;
      }
      
      const errorMessage = {
        role: 'assistant',
        content: errorContent,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!open && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000
          }}
        >
          <IconButton
            onClick={() => setOpen(true)}
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              width: 56,
              height: 56,
              boxShadow: 3,
              '&:hover': {
                bgcolor: 'primary.dark',
                transform: 'scale(1.1)'
              },
              transition: 'all 0.3s'
            }}
          >
            <ChatIcon />
          </IconButton>
        </Box>
      )}

      {/* Chat Window */}
      <Collapse in={open} orientation="vertical">
        <Paper
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: { xs: 'calc(100vw - 48px)', sm: 400, md: 500 },
            height: { xs: 'calc(100vh - 100px)', sm: 600 },
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            boxShadow: 6
          }}
        >
          {/* Header */}
          <Box
            sx={{
              p: 2,
              bgcolor: 'primary.main',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderRadius: '4px 4px 0 0'
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <SmartToyIcon />
              <Typography variant="h6" fontWeight={600}>
                AI Assistant
              </Typography>
            </Stack>
            <IconButton
              size="small"
              onClick={() => setOpen(false)}
              sx={{ color: 'white' }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Messages */}
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              p: 2,
              bgcolor: 'grey.50'
            }}
          >
            <Stack spacing={2}>
              {messages.map((message, index) => (
                <Stack
                  key={index}
                  direction="row"
                  spacing={1}
                  justifyContent={message.role === 'user' ? 'flex-end' : 'flex-start'}
                >
                  {message.role === 'assistant' && (
                    <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                      <SmartToyIcon fontSize="small" />
                    </Avatar>
                  )}
                  <Paper
                    sx={{
                      p: 1.5,
                      maxWidth: '75%',
                      bgcolor: message.role === 'user' ? 'primary.main' : 'white',
                      color: message.role === 'user' ? 'white' : 'text.primary',
                      borderRadius: 2
                    }}
                  >
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {message.content}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        mt: 0.5,
                        opacity: 0.7,
                        fontSize: '0.7rem'
                      }}
                    >
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </Typography>
                  </Paper>
                  {message.role === 'user' && (
                    <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                      <PersonIcon fontSize="small" />
                    </Avatar>
                  )}
                </Stack>
              ))}
              {loading && (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                    <SmartToyIcon fontSize="small" />
                  </Avatar>
                  <Paper sx={{ p: 1.5, bgcolor: 'white' }}>
                    <CircularProgress size={16} />
                  </Paper>
                </Stack>
              )}
              <div ref={messagesEndRef} />
            </Stack>
          </Box>

          {/* Input */}
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'white' }}>
            <Stack direction="row" spacing={1}>
              <TextField
                inputRef={inputRef}
                fullWidth
                size="small"
                placeholder="Ask me anything about QC, documents, or engineering..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
                multiline
                maxRows={3}
              />
              <IconButton
                color="primary"
                onClick={handleSend}
                disabled={!input.trim() || loading}
                sx={{ alignSelf: 'flex-end' }}
              >
                <SendIcon />
              </IconButton>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Press Enter to send, Shift+Enter for new line
            </Typography>
          </Box>
        </Paper>
      </Collapse>
    </>
  );
}

