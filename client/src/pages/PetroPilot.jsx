import { useState, useRef } from 'react';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SendIcon from '@mui/icons-material/Send';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import { callOpenRouterAPI, getAPIKey } from '../api/openRouter.js';
import { extractTextFromFile } from '../utils/documentClassifier.js';
import './PetroPilot.css';

const SYSTEM_PROMPT = `You are Petro Pilot, a senior engineering QA/QC assistant for Petrolenz. 
- Always produce structured, professional answers with actionable guidance.
- When documents are attached, summarize key observations before answering questions.
- Reference engineering standards (NFPA, API, ASME, IEC, etc.) when relevant.
- If information is missing or corrupted, clearly state the gap and suggest what is needed.
- Keep tone confident, concise, and expert.`;

const MAX_ATTACHMENT_CHARS = 20000; // limit per file to avoid prompt overflow for free tier
const CHAT_MODEL = 'meta/llama-3.1-70b-instruct';

const QUICK_PROMPTS = [
  'Summarize key NFPA compliance gaps.',
  'What QA/QC risks exist in this document?',
  'Draft action items for the fire protection team.',
  'Outline inputs needed before issuing IFR.',
];

export function PetroPilot() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "I'm Petro Pilot, your engineering QA/QC co-pilot. Upload deliverables, ask questions, and I'll generate structured reviews, action items, or summaries inspired by the Petrolenz workflow.",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const getPreviewText = (text) =>
    typeof MAX_ATTACHMENT_CHARS === 'number' ? text.slice(0, MAX_ATTACHMENT_CHARS) : text;

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setError('');

    const processed = [];
    for (const file of files) {
      try {
        const text = await extractTextFromFile(file);
        processed.push({
          id: crypto.randomUUID ? crypto.randomUUID() : `${file.name}-${Date.now()}`,
          name: file.name,
          size: file.size,
          preview: getPreviewText(text),
          fullText: text
        });
      } catch (err) {
        console.error('Attachment read error:', err);
        setError(`Failed to read ${file.name}. Try another format.`);
      }
    }

    setAttachments((prev) => [...prev, ...processed]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setUploading(false);
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((att) => att.id !== id));
  };

  const buildConversationHistory = () =>
    messages
      .slice(-8)
      .map((msg) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }));

  const buildAttachmentContext = () =>
    attachments
      .map(
        (doc, index) =>
          `Document ${index + 1}: ${doc.name}\nContent Preview:\n${doc.preview}`
      )
      .join('\n\n');

  const handleSend = async (presetMessage) => {
    const question = presetMessage || input.trim();
    if (!question) return;

    setError('');
    setLoading(true);

    const userMessage = {
      role: 'user',
      content: question,
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    try {
      const apiKey = getAPIKey();
      if (!apiKey) {
        throw new Error('API key missing. Set it via ⚙️ API Settings.');
      }

      const attachmentContext = buildAttachmentContext();
      const conversationHistory = buildConversationHistory();

      const responseText = await callOpenRouterAPI(
        question,
        attachmentContext,
        apiKey,
        {
          provider: 'nvidia',
          model: CHAT_MODEL,
          systemPrompt: SYSTEM_PROMPT,
          conversationHistory,
          maxTokens: 600
        }
      );

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: responseText,
          timestamp: new Date().toISOString()
        }
      ]);
    } catch (err) {
      console.error('Petro Pilot chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ ${err.message || 'Unable to get response right now.'}`,
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="qwen-chat-page">
      <section className="qwen-hero">
        <div>
          <p className="eyebrow">Petro Pilot Workspace · Petrolenz</p>
          <h1>
            Engineering QA/QC copiloted <span>by Petro Pilot</span>
          </h1>
          <p className="subtitle">
            Upload deliverables, ask nuanced questions, and let the Petro Pilot assistant
            craft structured reviews, action lists, and compliance insights—just like the
            real platform.
          </p>
          <div className="hero-quick-prompts">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSend(prompt)}
                className="quick-prompt-btn"
                disabled={loading}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
        <div className="hero-accent-card">
          <p>Live Model</p>
          <h3>Petro Pilot Assistant</h3>
          <p className="accent-footnote">
            Powered by NVIDIA · Structured outputs · Document-aware
          </p>
        </div>
      </section>

      <section className="qwen-chat-layout">
        <div className="chat-column">
          <div className="chat-feed">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`chat-bubble ${message.role === 'assistant' ? 'assistant' : 'user'}`}
              >
                <div className="bubble-meta">
                  <span>{message.role === 'assistant' ? 'Petro Pilot' : 'You'}</span>
                  <span>
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <div className="bubble-content">
                  <pre>{message.content}</pre>
                </div>
              </div>
            ))}
            {loading && (
              <div className="loading-indicator">
                <CircularProgress size={20} />
                <span>Petro Pilot is thinking...</span>
              </div>
            )}
          </div>

          <div className="chat-input-bar">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about compliance gaps, action items, or standards..."
              rows={2}
              disabled={loading}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || (!input.trim() && !attachments.length)}
              className="send-btn"
            >
              {loading ? <CircularProgress size={18} /> : <SendIcon fontSize="small" />}
            </button>
          </div>
          {error && <p className="chat-error">{error}</p>}
        </div>

        <div className="attachment-column">
          <div className="attach-card">
            <h3>Upload Engineering Deliverables</h3>
            <p>
              Drop PDFs, Word files, or spreadsheets. Petro Pilot converts them to text automatically
              (first few thousand characters) and blends them into the next response.
            </p>
            <label className="upload-dropzone">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
                multiple
                ref={fileInputRef}
                onChange={handleFileSelect}
                disabled={uploading}
              />
              {uploading ? (
                <>
                  <CircularProgress size={22} />
                  <span>Reading document...</span>
                </>
              ) : (
                <>
                  <CloudUploadIcon />
                  <span>Click or drag files here</span>
                </>
              )}
            </label>
            <div className="attachment-list">
              {attachments.length === 0 && (
                <p className="empty-state">No files uploaded yet.</p>
              )}
              {attachments.map((file) => (
                <div key={file.id} className="attachment-item">
                  <div className="attachment-meta">
                    <InsertDriveFileIcon />
                    <div>
                      <p>{file.name}</p>
                      <small>{(file.size / 1024).toFixed(1)} KB</small>
                    </div>
                  </div>
                  <Tooltip title="Remove attachment">
                    <button className="icon-btn" onClick={() => removeAttachment(file.id)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </button>
                  </Tooltip>
                </div>
              ))}
            </div>
            <p className="footnote">
              {typeof MAX_ATTACHMENT_CHARS === 'number'
                ? `Only the first ${MAX_ATTACHMENT_CHARS.toLocaleString()} characters per file feed Petro Pilot to keep within token limits. Highlight the most critical pages for best answers.`
                : 'Entire document text is used for analysis. Consider trimming oversized files if you run into token limits.'}
            </p>
          </div>

          <div className="prompt-card">
            <h4>Default Prompt (auto-applied)</h4>
            <p>
              Petro Pilot automatically enforces the Petrolenz QA/QC instructions, referencing NFPA/API/ASME
              and capturing missing data. No manual prompt engineering needed.
            </p>
            <button
              className="quick-prompt-btn full-width"
              onClick={() =>
                handleSend('Produce a QA/QC summary based on the uploaded deliverables.')
              }
            >
              Generate QA/QC Summary
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

