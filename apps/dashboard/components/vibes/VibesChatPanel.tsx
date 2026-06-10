import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface FileAttachment {
  name: string;
  type: string;  // mime type
  dataUrl: string;  // data:image/png;base64,... or data:application/...;base64,...
  isImage: boolean;
}

interface ChatMessage {
  id: string;
  type: "human" | "vibes";
  content: string;
  timestamp: Date;
  audioUrl?: string;
  isStreaming?: boolean;
  attachment?: FileAttachment;
}

type ChatState = "closed" | "open" | "minimized";
type PanelSize = "normal" | "expanded";

interface VibesChatPanelProps {
  externalOpen?: boolean;
  onExternalClose?: () => void;
  initialMessage?: string;  // Auto-send this message when opened
}

const API_BASE = "https://api.vibestribe.rocks";
const SESSION_ID = "dashboard-chat";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const getApiKey = () => typeof window !== "undefined" ? localStorage.getItem("hermes_api_key") || "" : "";

const VibesChatPanel: React.FC<VibesChatPanelProps> = ({ externalOpen, onExternalClose, initialMessage }) => {
  const [chatState, setChatState] = useState<ChatState>("closed");
  const [panelSize, setPanelSize] = useState<PanelSize>("normal");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<{ text: string; attachment?: FileAttachment } | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<FileAttachment | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);
  const inputModeRef = useRef<"text" | "voice">("text");
  const currentRunIdRef = useRef<string | null>(null);
  const initialMessageSentRef = useRef<string | null>(null);

  // External open trigger (from header button)
  const prevExternalOpen = useRef(false);
  useEffect(() => {
    if (externalOpen && !prevExternalOpen.current && chatState === "closed") {
      setChatState("open");
      onExternalClose?.();
    }
    prevExternalOpen.current = !!externalOpen;
  }, [externalOpen]);

  // Focus input when opened
  useEffect(() => {
    if (chatState === "open" && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [chatState]);

  // Auto-scroll messages container
  useEffect(() => {
    if (chatState === "open" && messagesEndRef.current) {
      const container = messagesEndRef.current.parentElement;
      if (container) container.scrollTop = container.scrollHeight;
    }
  }, [messages, chatState]);

  // Prevent page scroll when opening chat
  useEffect(() => {
    if (chatState === "open" || chatState === "minimized") {
      document.body.style.overflow = "";
    }
  }, [chatState]);

  // Stop audio/abort when closed
  useEffect(() => {
    if (chatState === "closed") {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      if (abortRef.current) abortRef.current.abort();
      onExternalClose?.();
    }
  }, [chatState === "closed"]);

  // Send queued message when loading finishes
  useEffect(() => {
    if (!isLoading && pendingMessage) {
      const msg = pendingMessage;
      setPendingMessage(null);
      sendMessage(msg.text, "text", msg.attachment);
    }
  }, [isLoading, pendingMessage]);

  // Ensure session exists before chatting (auto-creates if deleted)
  const sessionReadyRef = useRef(false);
  const ensureSession = useCallback(async () => {
    if (sessionReadyRef.current) return true;
    try {
      const headers: Record<string, string> = {};
      const key = getApiKey();
      if (key) headers["Authorization"] = `Bearer ${key}`;
      const res = await fetch(`${API_BASE}/api/sessions/${SESSION_ID}`, { headers });
      if (res.ok) {
        sessionReadyRef.current = true;
        return true;
      }
      if (res.status === 404) {
        const createHeaders: Record<string, string> = { "Content-Type": "application/json" };
        if (key) createHeaders["Authorization"] = `Bearer ${key}`;
        const createRes = await fetch(`${API_BASE}/api/sessions`, {
          method: "POST",
          headers: createHeaders,
          body: JSON.stringify({ session_id: SESSION_ID }),
        });
        if (createRes.ok) {
          sessionReadyRef.current = true;
          return true;
        }
      }
      console.warn("Session check failed:", res.status);
      return false;
    } catch (err) {
      console.warn("Session check error:", err);
      return false;
    }
  }, []);

  const openChat = useCallback(() => {
    setChatState("open");
    onExternalClose?.();
  }, [onExternalClose]);
  const minimizeChat = useCallback(() => setChatState("minimized"), []);
  const closeChat = useCallback(() => {
    // Abort any in-flight request
    if (abortRef.current) abortRef.current.abort();
    // Delete session so next open gets a fresh one (prevents context bloat)
    const key = getApiKey();
    if (key) {
      fetch(`${API_BASE}/api/sessions/${SESSION_ID}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${key}` },
      }).catch(() => {}); // silent - best effort
    }
    sessionReadyRef.current = false;
    setMessages([]);
    setChatState("closed");
    onExternalClose?.();
  }, [onExternalClose]);
  const toggleSize = useCallback(() => {
    setPanelSize((prev) => (prev === "normal" ? "expanded" : "normal"));
  }, []);

  const playAudio = useCallback((url: string) => {
    if (currentAudioRef.current) currentAudioRef.current.pause();
    const audio = new Audio(url);
    currentAudioRef.current = audio;
    audio.play().catch(console.warn);
  }, []);

  const generateTTS = useCallback(async (text: string, messageId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(getApiKey() ? { Authorization: `Bearer ${getApiKey()}` } : {}) },
        body: JSON.stringify({ text, voice: "en-US-AvaNeural", engine: "edge" }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.audio_url) {
        const audioUrl = data.audio_url.replace("http://127.0.0.1:8642", API_BASE);
        setMessages((prev) =>
          prev.map((m) => m.id === messageId ? { ...m, audioUrl } : m)
        );
        playAudio(audioUrl);
      }
    } catch (err) {
      console.warn("TTS failed:", err);
    }
  }, [playAudio]);

  const stopAgent = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setMessages((prev) =>
      prev.map((m) =>
        m.isStreaming ? { ...m, isStreaming: false, content: m.content + (m.content ? "\n\n[Stopped]" : "[Stopped]") } : m
      )
    );
    setIsLoading(false);
    currentRunIdRef.current = null;
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), type: "vibes" as const, content: `File too large (max 10MB). "${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)}MB.`, timestamp: new Date() },
      ]);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const isImage = file.type.startsWith("image/");
      setPendingAttachment({
        name: file.name,
        type: file.type,
        dataUrl,
        isImage,
      });
    };
    reader.readAsDataURL(file);
    // Reset the file input so the same file can be selected again
    e.target.value = "";
  }, []);

  const clearPendingAttachment = useCallback(() => setPendingAttachment(null), []);

  // Send message via SSE streaming
  const sendMessage = useCallback(async (
    text: string,
    mode: "text" | "voice" = "text",
    attachment?: FileAttachment,
  ) => {
    const hasText = text.trim().length > 0;
    const hasAttachment = !!attachment;
    if (!hasText && !hasAttachment) return;

    // Ensure session exists before sending
    const ready = await ensureSession();
    if (!ready) return;

    // If already loading, stop agent and queue
    if (isLoading) {
      stopAgent();
      setPendingMessage({ text: text.trim(), attachment });
      setInputValue("");
      setPendingAttachment(null);
      return;
    }

    inputModeRef.current = mode;

    // Build the display text for the user message bubble
    const displayText = hasText ? text.trim() : (attachment ? `📎 ${attachment.name}` : "");

    // Build the API message payload
    let apiMessage: any;
    if (hasAttachment && attachment!.isImage) {
      // Send as multimodal content: text + image_url parts
      const parts: any[] = [];
      if (hasText) parts.push({ type: "text", text: text.trim() });
      parts.push({
        type: "image_url",
        image_url: { url: attachment!.dataUrl },
      });
      apiMessage = parts;
    } else if (hasAttachment && !attachment!.isImage) {
      // Non-image file: send text with file info
      const base64Data = attachment!.dataUrl.split(",")[1] || "";
      const fileNote = `[Attached file: ${attachment!.name} (${attachment!.type}, ${(base64Data.length * 0.75 / 1024).toFixed(0)}KB)]`;
      apiMessage = hasText ? `${text.trim()}\n\n${fileNote}\n\n${base64Data}` : `${fileNote}\n\n${base64Data}`;
    } else {
      apiMessage = text.trim();
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      type: "human",
      content: displayText,
      timestamp: new Date(),
      attachment: attachment ? { name: attachment.name, type: attachment.type, dataUrl: attachment.dataUrl, isImage: attachment.isImage } : undefined,
    };
    const botMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: "vibes",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    };
    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInputValue("");
    setPendingAttachment(null);
    setIsLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;
    let fullText = "";

    try {
      const res = await fetch(
        `${API_BASE}/api/sessions/${SESSION_ID}/chat/stream`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(getApiKey() ? { Authorization: `Bearer ${getApiKey()}` } : {}) },
          body: JSON.stringify({ message: apiMessage }),
          signal: controller.signal,
        }
      );

      if (!res.ok || !res.body) {
        throw new Error(`API error: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr || jsonStr === "[DONE]") continue;

          try {
            const event = JSON.parse(jsonStr);

            if (event.run_id && !currentRunIdRef.current) {
              currentRunIdRef.current = event.run_id;
            }

            if (event.delta) {
              fullText += event.delta;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === botMsg.id ? { ...m, content: fullText } : m
                )
              );
            }

            if (event.content !== undefined && event.completed) {
              fullText = event.content || fullText;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === botMsg.id
                    ? { ...m, content: fullText, isStreaming: false }
                    : m
                )
              );
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === botMsg.id ? { ...m, isStreaming: false } : m
        )
      );

      if (fullText.trim() && inputModeRef.current === "voice") {
        generateTTS(fullText, botMsg.id);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMsg.id
              ? { ...m, content: "Sorry, I'm having trouble connecting. Try again?", isStreaming: false }
              : m
          )
        );
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
      currentRunIdRef.current = null;
    }
  }, [isLoading, generateTTS, stopAgent]);

  // Auto-send initialMessage when panel opens with one provided
  useEffect(() => {
    if (
      chatState === "open" &&
      initialMessage &&
      initialMessage !== initialMessageSentRef.current &&
      !isLoading
    ) {
      initialMessageSentRef.current = initialMessage;
      sendMessage(initialMessage, "text");
    }
  }, [chatState, initialMessage, isLoading, sendMessage]);

  // Voice input
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), type: "vibes" as const, content: "Voice input not supported in this browser. Try Chrome?", timestamp: new Date() },
      ]);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript.trim()) sendMessage(transcript, "voice");
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [isRecording, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isLoading) {
        if (inputValue.trim() || pendingAttachment) {
          stopAgent();
          setPendingMessage({ text: inputValue.trim(), attachment: pendingAttachment || undefined });
          setInputValue("");
          setPendingAttachment(null);
        }
      } else {
        sendMessage(inputValue, "text", pendingAttachment || undefined);
      }
    }
  };

  const unreadCount = chatState === "minimized"
    ? messages.filter(m => m.type === "vibes" && m.isStreaming).length
    : 0;

  if (chatState === "closed") return null;

  const chatRoot = document.body;

  if (chatState === "minimized") {
    return createPortal(
      <div className="vibes-chat-tab" onClick={openChat}>
        <span className="vibes-chat-tab__icon">🤖</span>
        <span className="vibes-chat-tab__label">Vibes</span>
        {unreadCount > 0 && <span className="vibes-chat-tab__badge">{unreadCount}</span>}
        <button
          className="vibes-chat-tab__close"
          onClick={(e) => { e.stopPropagation(); closeChat(); }}
          aria-label="Close chat"
        >
          ×
        </button>
      </div>,
      chatRoot
    );
  }

  const sizeClass = panelSize === "expanded" ? " vibes-chat-panel--expanded" : "";

  return createPortal(
    <div className={`vibes-chat-panel${sizeClass}`} ref={panelRef}>
      <header className="vibes-chat-panel__header">
        <div className="vibes-chat-panel__title">
          <span className="vibes-chat-panel__icon">🤖</span>
          <span>Vibes</span>
        </div>
        <div className="vibes-chat-panel__header-actions">
          <button
            className="vibes-chat-panel__expand"
            onClick={toggleSize}
            aria-label={panelSize === "normal" ? "Expand chat" : "Shrink chat"}
            title={panelSize === "normal" ? "Expand" : "Shrink"}
          >
            {panelSize === "normal" ? "⤢" : "⤡"}
          </button>
          <button className="vibes-chat-panel__minimize" onClick={minimizeChat} aria-label="Minimize chat" title="Minimize">−</button>
          <button className="vibes-chat-panel__close" onClick={closeChat} aria-label="Close chat" title="Close">×</button>
        </div>
      </header>

      <div className="vibes-chat-panel__messages">
        {messages.length === 0 && (
          <div className="vibes-chat-panel__message vibes-chat-panel__message--vibes">
            <div className="vibes-chat-panel__message-content">
              Hi! Type a message, tap the mic to talk, or attach a file.
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`vibes-chat-panel__message vibes-chat-panel__message--${msg.type}`}
          >
            <div className="vibes-chat-panel__message-content">
              {msg.attachment?.isImage && (
                <img
                  src={msg.attachment.dataUrl}
                  alt={msg.attachment.name}
                  className="vibes-chat-panel__image-preview"
                />
              )}
              {msg.attachment && !msg.attachment.isImage && (
                <div className="vibes-chat-panel__file-badge">
                  📎 {msg.attachment.name}
                </div>
              )}
              {msg.content}
              {msg.isStreaming && !msg.content && (
                <span className="vibes-chat-panel__typing">
                  <span></span><span></span><span></span>
                </span>
              )}
              {msg.audioUrl && (
                <button
                  className="vibes-chat-panel__play-btn"
                  onClick={() => playAudio(msg.audioUrl!)}
                  aria-label="Play audio"
                  title="Play audio"
                >
                  ▶
                </button>
              )}
            </div>
            <div className="vibes-chat-panel__message-time">
              {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        ))}
        {isLoading && !messages.some(m => m.isStreaming && m.content) && (
          <div className="vibes-chat-panel__message vibes-chat-panel__message--vibes">
            <div className="vibes-chat-panel__typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="vibes-chat-panel__input-area">
        {/* Pending attachment preview */}
        {pendingAttachment && (
          <div className="vibes-chat-panel__attachment-preview">
            {pendingAttachment.isImage ? (
              <img src={pendingAttachment.dataUrl} alt={pendingAttachment.name} className="vibes-chat-panel__attachment-thumb" />
            ) : (
              <span className="vibes-chat-panel__attachment-file">📎 {pendingAttachment.name}</span>
            )}
            <button
              className="vibes-chat-panel__attachment-remove"
              onClick={clearPendingAttachment}
              aria-label="Remove attachment"
              title="Remove"
            >
              ×
            </button>
          </div>
        )}
        <textarea
          ref={inputRef}
          className="vibes-chat-panel__input"
          placeholder={isLoading ? "Type to interrupt and redirect..." : "Ask Vibes anything..."}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <div className="vibes-chat-panel__button-row">
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            style={{ display: "none" }}
            accept="image/*,.pdf,.txt,.md,.csv,.json,.yaml,.yml,.xml,.html,.css,.js,.ts,.py,.go,.rs,.java,.c,.cpp,.h,.sh,.sql,.env,.log"
          />
          <button
            className="vibes-chat-panel__attach-btn"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach file"
            title="Attach file"
          >
            📎
          </button>
          <button
            className={`vibes-chat-panel__mic-btn${isRecording ? " vibes-chat-panel__mic-btn--recording" : ""}`}
            onClick={toggleRecording}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
            title={isRecording ? "Tap to stop" : "Tap to speak"}
          >
            {isRecording ? "⏹" : "🎤"}
          </button>
          {isLoading ? (
            <button
              className="vibes-chat-panel__stop"
              onClick={stopAgent}
              aria-label="Stop agent"
              title="Stop"
            >
              ■ Stop
            </button>
          ) : (
            <button
              className="vibes-chat-panel__send"
              onClick={() => sendMessage(inputValue, "text", pendingAttachment || undefined)}
              disabled={!inputValue.trim() && !pendingAttachment}
              aria-label="Send message"
            >
              Send
            </button>
          )}
        </div>
      </div>
    </div>,
    chatRoot
  );
};

export default VibesChatPanel;
