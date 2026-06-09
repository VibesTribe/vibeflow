import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface ChatMessage {
  id: string;
  type: "human" | "vibes";
  content: string;
  timestamp: Date;
  audioUrl?: string;
  isStreaming?: boolean;
}

type ChatState = "closed" | "open" | "minimized";
type PanelSize = "normal" | "expanded";

interface VibesChatPanelProps {
  externalOpen?: boolean;
  onExternalClose?: () => void;
}

const API_BASE = "https://api.vibestribe.rocks";
const SESSION_ID = "dashboard-chat";

const getApiKey = () => typeof window !== "undefined" ? localStorage.getItem("hermes_api_key") || "" : "";

const VibesChatPanel: React.FC<VibesChatPanelProps> = ({ externalOpen, onExternalClose }) => {
  const [chatState, setChatState] = useState<ChatState>("closed");
  const [panelSize, setPanelSize] = useState<PanelSize>("normal");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);
  const inputModeRef = useRef<"text" | "voice">("text");
  const currentRunIdRef = useRef<string | null>(null);

  // External open trigger (from header button)
  const prevExternalOpen = useRef(false);
  useEffect(() => {
    if (externalOpen && !prevExternalOpen.current && chatState === "closed") {
      setChatState("open");
      onExternalClose?.(); // reset parent trigger immediately
    }
    prevExternalOpen.current = !!externalOpen;
  }, [externalOpen]);

  // Focus input when opened
  useEffect(() => {
    if (chatState === "open" && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [chatState]);

  // Auto-scroll messages container (not the page)
  useEffect(() => {
    if (chatState === "open" && messagesEndRef.current) {
      const container = messagesEndRef.current.parentElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [messages, chatState]);

  // Prevent page scroll when opening chat
  useEffect(() => {
    if (chatState === "open" || chatState === "minimized") {
      document.body.style.overflow = "";
    }
  }, [chatState]);

  // Stop audio/abort when closed completely
  useEffect(() => {
    if (chatState === "closed") {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      if (abortRef.current) {
        abortRef.current.abort();
      }
      onExternalClose?.();
    }
  }, [chatState === "closed"]);

  // Send queued message when loading finishes
  useEffect(() => {
    if (!isLoading && pendingMessage) {
      const msg = pendingMessage;
      setPendingMessage(null);
      sendMessage(msg);
    }
  }, [isLoading, pendingMessage]);

  const openChat = useCallback(() => {
    setChatState("open");
    onExternalClose?.();
  }, [onExternalClose]);
  const minimizeChat = useCallback(() => setChatState("minimized"), []);
  const closeChat = useCallback(() => {
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

  // Generate TTS audio for a response
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
          prev.map((m) =>
            m.id === messageId ? { ...m, audioUrl } : m
          )
        );
        playAudio(audioUrl);
      }
    } catch (err) {
      console.warn("TTS failed:", err);
    }
  }, [playAudio]);

  // Stop the current agent response
  const stopAgent = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    // Mark streaming messages as stopped
    setMessages((prev) =>
      prev.map((m) =>
        m.isStreaming ? { ...m, isStreaming: false, content: m.content + (m.content ? "\n\n[Stopped]" : "[Stopped]") } : m
      )
    );
    setIsLoading(false);
    currentRunIdRef.current = null;
  }, []);

  // Send message via SSE streaming
  const sendMessage = useCallback(async (text: string, mode: "text" | "voice" = "text") => {
    if (!text.trim()) return;

    // If already loading, queue the message for after current response
    if (isLoading) {
      stopAgent();
      setPendingMessage(text.trim());
      setInputValue("");
      return;
    }

    inputModeRef.current = mode;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      type: "human",
      content: text.trim(),
      timestamp: new Date(),
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
          body: JSON.stringify({ message: text.trim() }),
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
          // Handle SSE named events: "event: name\ndata: json"
          // And plain data lines: "data: json"
          if (line.startsWith("event: ")) {
            // Named event -- the next data line carries the payload
            continue;
          }
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr || jsonStr === "[DONE]") continue;

          try {
            const event = JSON.parse(jsonStr);

            // Capture run_id from any event
            if (event.run_id && !currentRunIdRef.current) {
              currentRunIdRef.current = event.run_id;
            }

            // Handle named SSE events from session chat stream
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
      if (transcript.trim()) {
        sendMessage(transcript, "voice");
      }
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
        // Queue message while agent is working
        if (inputValue.trim()) {
          stopAgent();
          setPendingMessage(inputValue.trim());
          setInputValue("");
        }
      } else {
        sendMessage(inputValue);
      }
    }
  };

  const unreadCount = chatState === "minimized"
    ? messages.filter(m => m.type === "vibes" && m.isStreaming).length
    : 0;

  // CLOSED: show nothing (parent shows the trigger button)
  if (chatState === "closed") return null;

  const chatRoot = document.body;

  // MINIMIZED: small floating tab at bottom-right
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

  // OPEN: full chat panel at bottom-right
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
          <button
            className="vibes-chat-panel__minimize"
            onClick={minimizeChat}
            aria-label="Minimize chat"
            title="Minimize"
          >
            −
          </button>
          <button
            className="vibes-chat-panel__close"
            onClick={closeChat}
            aria-label="Close chat"
            title="Close"
          >
            ×
          </button>
        </div>
      </header>

      <div className="vibes-chat-panel__messages">
        {messages.length === 0 && (
          <div className="vibes-chat-panel__message vibes-chat-panel__message--vibes">
            <div className="vibes-chat-panel__message-content">
              Hi! Type a message or tap the mic to talk.
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`vibes-chat-panel__message vibes-chat-panel__message--${msg.type}`}
          >
            <div className="vibes-chat-panel__message-content">
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
              {msg.timestamp.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
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
              onClick={() => sendMessage(inputValue)}
              disabled={!inputValue.trim()}
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
