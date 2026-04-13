// Professional API Settings Component with Material UI Dialog

import { useState, useEffect } from 'react';
import { getCheapModels, testAPIKey, getAPIKey as getCurrentAPIKey } from '../../api/openRouter.js';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Stack,
  Divider,
  Chip,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

export function APISettings({ apiConfig, onConfigChange, onClose }) {
  const [localConfig, setLocalConfig] = useState(apiConfig);
  const [apiKey, setApiKey] = useState(() => {
    const storedKey = localStorage.getItem('nvidia_api_key') || localStorage.getItem('gemini_api_key') || localStorage.getItem('openrouter_api_key');
    return storedKey || import.meta.env.VITE_NVIDIA_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_OPENROUTER_API_KEY || '';
  });
  const [usingDefaultKey, setUsingDefaultKey] = useState(() => {
    const storedKey = localStorage.getItem('nvidia_api_key') || localStorage.getItem('gemini_api_key') || localStorage.getItem('openrouter_api_key');
    const envKey = import.meta.env.VITE_NVIDIA_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_OPENROUTER_API_KEY;
    return !storedKey && !envKey;
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    setLocalConfig(apiConfig);
  }, [apiConfig]);

  const handleSave = () => {
    onConfigChange(localConfig);
    if (apiKey) {
      localStorage.setItem('nvidia_api_key', apiKey);
    }
    if (onClose) onClose();
  };

  const handleTestKey = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      const keyToTest = apiKey || getCurrentAPIKey();
      const result = await testAPIKey(keyToTest);
      setTestResult(result);
    } catch (error) {
      setTestResult({
        valid: false,
        message: `Test failed: ${error.message}`,
        provider: 'nvidia'
      });
    } finally {
      setTesting(false);
    }
  };

  const provider = 'nvidia';
  const cheapModels = getCheapModels(provider);

  return (
    <Dialog
      open={true}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight={600}>
            API Configuration
          </Typography>
          <IconButton
            size="small"
            onClick={onClose}
            sx={{ color: 'text.secondary' }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3}>
          {/* API Key Section */}
          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              API Key
            </Typography>
            {usingDefaultKey && (
              <Alert severity="info" sx={{ mb: 2 }}>
                No saved NVIDIA API key found. Add one below or via `.env`.
              </Alert>
            )}
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <TextField
                type="password"
                fullWidth
                size="small"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setUsingDefaultKey(false);
                  setTestResult(null);
                }}
                placeholder="Enter your NVIDIA API key"
                variant="outlined"
              />
              <Button
                variant="outlined"
                onClick={handleTestKey}
                disabled={testing}
                sx={{ minWidth: 100 }}
              >
                {testing ? <CircularProgress size={20} /> : 'Test'}
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Active provider: <Chip label={provider} size="small" sx={{ ml: 0.5 }} />
            </Typography>
            {testResult && (
              <Alert
                severity={testResult.valid ? 'success' : 'error'}
                icon={testResult.valid ? <CheckCircleIcon /> : <ErrorIcon />}
                sx={{ mt: 1 }}
              >
                {testResult.message}
              </Alert>
            )}
          </Box>

          <Divider />

          {/* Model Selection */}
          <FormControl fullWidth size="small">
            <InputLabel>Model</InputLabel>
            <Select
              value={localConfig.model || ''}
              onChange={(e) => setLocalConfig({ ...localConfig, model: e.target.value || null })}
              label="Model"
            >
              <MenuItem value="">
                <em>Default (Auto-select cheapest)</em>
              </MenuItem>
              {cheapModels.map(model => (
                <MenuItem key={model} value={model}>{model}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Max Tokens */}
          <Box>
            <TextField
              type="number"
              fullWidth
              size="small"
              label="Max Tokens"
              value={localConfig.maxTokens}
              onChange={(e) => setLocalConfig({ ...localConfig, maxTokens: parseInt(e.target.value) || 2000 })}
              inputProps={{ min: 500, max: 8000, step: 100 }}
              helperText="Lower = cheaper. Recommended: 1500-2000 for free tier"
              variant="outlined"
            />
          </Box>

          {/* Provider Selection (fixed to NVIDIA) */}
          <FormControl fullWidth size="small" disabled>
            <InputLabel>Provider</InputLabel>
            <Select
              value="nvidia"
              label="Provider"
            >
              <MenuItem value="nvidia">NVIDIA</MenuItem>
            </Select>
          </FormControl>

          {/* Tips Section */}
          <Box
            sx={{
              p: 2,
              bgcolor: 'info.light',
              borderRadius: 1,
              borderLeft: '4px solid',
              borderColor: 'info.main',
            }}
          >
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Tips to Reduce Costs
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
              <Typography component="li" variant="body2">Use max_tokens: 1500-2000 for free tier</Typography>
              <Typography component="li" variant="body2">Try free models: {cheapModels[0]}</Typography>
              <Typography component="li" variant="body2">Reduce document content size</Typography>
              <Typography component="li" variant="body2">Run checks separately instead of both at once</Typography>
            </Box>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 1 }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained">
          Save Configuration
        </Button>
      </DialogActions>
    </Dialog>
  );
}

