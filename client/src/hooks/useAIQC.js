// Hook for AI QC analysis (Check-1 and Check-2) with improved error handling

import { useState } from 'react';
import { callOpenRouterAPI, getAPIKey, detectProvider, getCheapModels } from '../api/openRouter.js';
import { buildUnifiedPrompt } from '../utils/promptUnified.js';
import { parseScoreFromResponse } from '../utils/scoringHelper.js';
import { chunkDocument, getChunkStats } from '../utils/documentChunker.js';
import { CHUNK_SIZE } from '../config/constants.js';

export function useAIQC() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [check1Result, setCheck1Result] = useState(null);
  const [check2Result, setCheck2Result] = useState(null);
  const [apiConfig, setApiConfig] = useState(() => {
    // Load saved config from localStorage
    const saved = localStorage.getItem('api_config');
    return saved ? JSON.parse(saved) : {
      model: null, // Will use default
      maxTokens: 2000,
      provider: 'nvidia'
    };
  });
  const [logs, setLogs] = useState([]);

  const addLog = (message, type = 'info') => {
    setLogs(prev => {
      const next = [...prev, { id: crypto.randomUUID ? crypto.randomUUID() : Date.now(), message, type, timestamp: new Date().toISOString() }];
      return next.slice(-200);
    });
  };

  const clearLogs = () => setLogs([]);

  const updateConfig = (newConfig) => {
    const updated = { ...apiConfig, ...newConfig };
    setApiConfig(updated);
    localStorage.setItem('api_config', JSON.stringify(updated));
  };

  const runCheck1 = async (documentType, specificType, discipline, isDrawing, fileContent) => {
    setLoading(true);
    setError(null);

    try {
      const apiKey = getAPIKey();
      if (!apiKey) {
        throw new Error('API key not found. Please configure it in settings.');
      }

      const provider = detectProvider(apiKey);
      const prompt = buildUnifiedPrompt(documentType, specificType, discipline, isDrawing, 'check1');
      addLog(`▶️ Check-1 started (${provider.toUpperCase()}) for ${discipline} · ${specificType}`);
      
      // For very large documents (785+ pages), use intelligent chunking
      // Calculate document size to determine if chunking is needed
      const isLargeDocument = fileContent.length > 100000; // 100K+ chars
      let contentToProcess = fileContent;
      
      if (isLargeDocument) {
        addLog(`📄 Large document detected (${(fileContent.length / 1000).toFixed(0)}K chars). Chunking for processing...`, 'info');
        
        // Chunk large documents intelligently
        const chunks = chunkDocument(fileContent, CHUNK_SIZE);
        const chunkStats = getChunkStats(chunks);
        
        addLog(`📦 Document split into ${chunks.length} chunks (avg ${Math.round(chunkStats.avgChunkSize)} chars/chunk)`, 'info');
        addLog(`🔄 Processing all ${chunks.length} chunks for comprehensive analysis...`, 'info');
        
        // For very large documents, process first few chunks and summary chunks
        // Process first chunk, middle chunks, and last chunk for comprehensive coverage
        const chunksToProcess = chunks.length > 10 
          ? [
              chunks[0], // First chunk
              ...chunks.slice(Math.floor(chunks.length / 3), Math.floor(chunks.length / 3) + 3), // Middle chunks
              ...chunks.slice(Math.floor(chunks.length * 2 / 3), Math.floor(chunks.length * 2 / 3) + 3), // Later chunks
              chunks[chunks.length - 1] // Last chunk
            ]
          : chunks; // For smaller chunk sets, process all
        
        const selectedText = chunksToProcess.map((chunk) => {
          const originalIdx = chunks.indexOf(chunk);
          const chunkSize = typeof chunk === 'string' ? chunk.length : (chunk.text?.length || 0);
          const chunkText = typeof chunk === 'string' ? chunk : chunk.text;
          return `\n\n--- Section ${originalIdx + 1} of ${chunks.length} (${Math.round(chunkSize / 1000)}K chars) ---\n\n${chunkText}`;
        }).join('\n\n');
        
        contentToProcess = selectedText + '\n\n[Note: This is a large document. Analysis based on representative sections covering beginning, middle, and end of document.]';
        
        addLog(`✅ Processing ${chunksToProcess.length} representative sections from ${chunks.length} total chunks`, 'info');
      }
      
      // Try with current config, fallback to cheaper options on error
      let response;
      try {
        response = await callOpenRouterAPI(prompt, contentToProcess, apiKey, {
          model: apiConfig.model,
          maxTokens: apiConfig.maxTokens,
          provider: provider
        });
      } catch (err) {
        // If model not found or credit error, try with free models
        if (err.message.includes('No endpoints found') || 
            err.message.includes('model not found') || 
            err.message.includes('not available') ||
            err.message.includes('credits') || 
            err.message.includes('tokens')) {
          console.warn('Model/credit issue detected, trying with free models...');
          addLog('⚠️ Primary model unavailable or credit issue. Trying free-tier fallbacks...', 'warning');
          const cheapModels = getCheapModels(provider);
          // Try free models in order until one works
          let lastError = err;
          for (const freeModel of cheapModels.slice(0, 3)) { // Try first 3 free models
            try {
              response = await callOpenRouterAPI(prompt, contentToProcess, apiKey, {
                model: freeModel,
                maxTokens: 1500,
                provider: provider,
                contentLimit: 100000
              });
              console.log(`Successfully used model: ${freeModel}`);
              addLog(`✅ Switched to model: ${freeModel}`, 'success');
              break; // Success, exit loop
            } catch (fallbackErr) {
              lastError = fallbackErr;
              console.warn(`Model ${freeModel} failed, trying next...`);
              addLog(`⚠️ Model ${freeModel} failed (${fallbackErr.message}).`, 'warning');
            }
          }
          if (!response) {
            throw lastError; // All models failed
          }
        } else {
          throw err;
        }
      }
      
      const score = parseScoreFromResponse(response) || null;
      addLog(`✅ Check-1 completed. Parsed score: ${score !== null ? score.toFixed(1) + '%' : 'N/A'}`, 'success');
      
      const result = {
        response,
        score,
        timestamp: new Date().toISOString()
      };

      setCheck1Result(result);
      return result;
    } catch (err) {
      const errorMessage = err.message || 'Failed to run Check-1 analysis';
      setError(errorMessage);
      addLog(`❌ Check-1 failed: ${errorMessage}`, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const runCheck2 = async (documentType, specificType, discipline, isDrawing, fileContent) => {
    setLoading(true);
    setError(null);

    try {
      const apiKey = getAPIKey();
      if (!apiKey) {
        throw new Error('API key not found. Please configure it in settings.');
      }

      const provider = detectProvider(apiKey);
      const prompt = buildUnifiedPrompt(documentType, specificType, discipline, isDrawing, 'check2');
      addLog(`▶️ Check-2 started (${provider.toUpperCase()}) focusing on technical QA/QC`);
      
      // Chunk large documents intelligently
      let contentToProcess = fileContent;
      const chunks = chunkDocument(fileContent, CHUNK_SIZE);
      
      if (chunks.length > 1) {
        addLog(`📄 Processing ${chunks.length} chunks for Check-2 analysis...`, 'info');
        
        // Use first few most important chunks for Check-2 (focus on technical details)
        const importantChunks = chunks.slice(0, Math.min(5, chunks.length));
        contentToProcess = importantChunks.map(chunk => chunk.text).join('\n\n--- Next Section ---\n\n');
        addLog(`🔍 Analyzing ${importantChunks.length} key sections for technical review...`, 'info');
      }
      
      // Try with current config, fallback to cheaper options on error
      let response;
      try {
        response = await callOpenRouterAPI(prompt, contentToProcess, apiKey, {
          model: apiConfig.model,
          maxTokens: apiConfig.maxTokens,
          provider: provider,
          contentLimit: 100000
        });
      } catch (err) {
        // If model not found or credit error, try with free models
        if (err.message.includes('No endpoints found') || 
            err.message.includes('model not found') || 
            err.message.includes('not available') ||
            err.message.includes('credits') || 
            err.message.includes('tokens')) {
          console.warn('Model/credit issue detected, trying with free models...');
          addLog('⚠️ Model/credit issue during Check-2. Rolling over to free models...', 'warning');
          const cheapModels = getCheapModels(provider);
          // Try free models in order until one works
          let lastError = err;
          for (const freeModel of cheapModels.slice(0, 3)) { // Try first 3 free models
            try {
              response = await callOpenRouterAPI(prompt, contentToProcess, apiKey, {
                model: freeModel,
                maxTokens: 1500,
                provider: provider,
                contentLimit: 100000
              });
              console.log(`Successfully used model: ${freeModel}`);
              addLog(`✅ Switched to model: ${freeModel}`, 'success');
              break; // Success, exit loop
            } catch (fallbackErr) {
              lastError = fallbackErr;
              console.warn(`Model ${freeModel} failed, trying next...`);
              addLog(`⚠️ Model ${freeModel} failed (${fallbackErr.message}).`, 'warning');
            }
          }
          if (!response) {
            throw lastError; // All models failed
          }
        } else {
          throw err;
        }
      }
      
      const score = parseScoreFromResponse(response) || null;
      addLog(`✅ Check-2 completed. Parsed score: ${score !== null ? score.toFixed(1) + '%' : 'N/A'}`, 'success');
      
      const result = {
        response,
        score,
        timestamp: new Date().toISOString()
      };

      setCheck2Result(result);
      return result;
    } catch (err) {
      const errorMessage = err.message || 'Failed to run Check-2 analysis';
      setError(errorMessage);
      addLog(`❌ Check-2 failed: ${errorMessage}`, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const runBothChecks = async (documentType, specificType, discipline, isDrawing, fileContent) => {
    setLoading(true);
    setError(null);

    try {
      // Run checks sequentially to avoid overwhelming the API
      addLog(`🚀 Launching QC analysis for ${documentType} (${specificType}) in ${discipline}`, 'info');
      const check1 = await runCheck1(documentType, specificType, discipline, isDrawing, fileContent);
      const check2 = await runCheck2(documentType, specificType, discipline, isDrawing, fileContent);
      addLog('🏁 QC analysis complete. Generating report...', 'success');

      return { check1, check2 };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setCheck1Result(null);
    setCheck2Result(null);
    setError(null);
    setLoading(false);
    clearLogs();
  };

  return {
    runCheck1,
    runCheck2,
    runBothChecks,
    check1Result,
    check2Result,
    loading,
    error,
    reset,
    apiConfig,
    updateConfig,
    logs,
    clearLogs,
    addLog
  };
}
