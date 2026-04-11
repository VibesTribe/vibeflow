import React, { useState, useRef, useEffect } from "react";

interface ChatMessage {
  id: string;
  type: "human" | "vibes";
  content: string;
  timestamp: Date;
  audioUrl?: string;
}

interface VibesChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const PIPELINE_URL = "https://vibes.vibestribe.rocks";

const ACK_RESPONSES = [
  "On it, thinking...",
  "Let me work on that...",
  "Processing, this may take a moment...",
  "Got it, working on it...",
  "Give me a sec...",
];

function randomAck(): string {
  return ACK_RESPONSES[Math.floor(Math.random() * ACK_RESPONSES.length)];
}

const VibesChatPanel: React.FC<VibesChatPanelProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Stop audio when panel closes
  useEffect(() => {
    if (!isOpen && currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
  }, [isOpen]);

  const playAudio = (url: string) => {
    if (currentAudioRef.current) currentAudioRef.current.pause();
    const audio = new Audio(url);
    currentAudioRef.current = audio;
    audio.play().catch(console.warn);
  };

  // --- Send text to pipeline ---
  const sendTextToPipeline = async (text: string): Promise<string> => {
    const res = await fetch(`${PIPELINE_URL}/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, mode: "vibes", audio: true }),
    });
    if (!res.ok) throw new Error(`Pipeline error: ${res.status}`);
    const data = await res.json();
    // Poll for audio in background (TTS generates async)
    if (data.audio_id) {
      const audioId = data.audio_id;
      const tryAudio = async () => {
        for (let i = 0; i < 10; i++) {
          await new Promise(r => setTimeout(r, 3000));
          try {
            const check = await fetch(`${PIPELINE_URL}/audio/${audioId}_out.wav`, { method: "HEAD" });
            if (check.ok) {
              playAudio(`${PIPELINE_URL}/audio/${audioId}_out.wav`);
              return;
            }
          } catch {}
        }
      };
      tryAudio(); // fire and forget
    }
    // Poll for Hermes action result in background
    if (data.action_id) {
      const actionId = data.action_id;
      const pollAction = async () => {
        for (let i = 0; i < 20; i++) {
          await new Promise(r => setTimeout(r, 5000));
          try {
            const check = await fetch(`${PIPELINE_URL}/action/${actionId}`);
            const result = await check.json();
            if (result.status === "completed" && result.hermes_reply) {
              // Add Hermes response as a new chat message
              setMessages(prev => [
                ...prev,
                { id: `hermes-${Date.now()}`, type: "vibes", content: `Hermes: ${result.hermes_reply}`, timestamp: new Date() },
              ]);
              return;
            }
          } catch {}
        }
      };
      pollAction(); // fire and forget
    }
    return data.reply || "Hmm, couldn't get a response.";
  };

  // --- Send audio to pipeline ---
  const sendAudioToPipeline = async (audioBlob: Blob): Promise<{ transcript: string; reply: string }> => {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");
    const res = await fetch(`${PIPELINE_URL}/chat`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error(`Pipeline error: ${res.status}`);
    const data = await res.json();
    // Poll for audio in background
    if (data.audio_id) {
      const audioId = data.audio_id;
      const tryAudio = async () => {
        for (let i = 0; i < 10; i++) {
          await new Promise(r => setTimeout(r, 3000));
          try {
            const check = await fetch(`${PIPELINE_URL}/audio/${audioId}_out.wav`, { method: "HEAD" });
            if (check.ok) {
              playAudio(`${PIPELINE_URL}/audio/${audioId}_out.wav`);
              return;
            }
          } catch {}
        }
      };
      tryAudio();
    }
    return {
      transcript: data.transcript || "(couldn't understand)",
      reply: data.reply || "Hmm, couldn't get a response.",
    };
  };

  // --- Handle text send ---
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    const text = inputValue.trim();

    // Show user message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      type: "human",
      content: text,
      timestamp: new Date(),
    };
    // Show ack immediately
    const ackMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: "vibes",
      content: randomAck(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg, ackMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      const replyText = await sendTextToPipeline(text);
      // Replace ack with real response
      setMessages((prev) =>
        prev.map((m) => m.id === ackMsg.id ? { ...m, content: replyText } : m)
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === ackMsg.id
            ? { ...m, content: "Sorry, I'm having trouble connecting. Try again?" }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handle mic recording ---
  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });

        // Show ack
        const ackMsg: ChatMessage = {
          id: (Date.now() + 2).toString(),
          type: "vibes",
          content: "Listening... give me a sec...",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, ackMsg]);
        setIsLoading(true);

        try {
          const { transcript, reply } = await sendAudioToPipeline(blob);

          // Replace ack with transcript + reply
          setMessages((prev) => [
            ...prev.filter((m) => m.id !== ackMsg.id),
            { id: Date.now().toString(), type: "human", content: transcript, timestamp: new Date() },
            { id: (Date.now() + 1).toString(), type: "vibes", content: reply, timestamp: new Date() },
          ]);
        } catch {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === ackMsg.id
                ? { ...m, content: "Couldn't process that. Try again?" }
                : m
            )
          );
        } finally {
          setIsLoading(false);
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      // Mic denied - just show a message
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), type: "vibes", content: "Can't access mic. Try typing instead?", timestamp: new Date() },
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Don't render at all if never opened
  if (!isOpen) return null;

  return (
    <div className="vibes-chat-overlay" onClick={() => { window.scrollTo(0, 0); onClose(); }}>
      <div className="vibes-chat-panel" ref={panelRef} onClick={(e) => e.stopPropagation()}>
        <header className="vibes-chat-panel__header">
          <div className="vibes-chat-panel__title">
            <span className="vibes-chat-panel__icon">🤖</span>
            <span>Vibes</span>
          </div>
          <button
            className="vibes-chat-panel__close"
            onClick={onClose}
            aria-label="Close chat"
          >
            ×
          </button>
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
          {isLoading && (
            <div className="vibes-chat-panel__message vibes-chat-panel__message--vibes">
              <div className="vibes-chat-panel__typing">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="vibes-chat-panel__input-area">
          <input
            ref={inputRef}
            type="text"
            className="vibes-chat-panel__input"
            placeholder="Ask Vibes anything..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <button
            className={`vibes-chat-panel__mic-btn${isRecording ? " vibes-chat-panel__mic-btn--recording" : ""}`}
            onClick={toggleRecording}
            disabled={isLoading}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
            title={isRecording ? "Tap to stop" : "Tap to speak"}
          >
            {isRecording ? "⏹" : "🎤"}
          </button>
          <button
            className="vibes-chat-panel__send"
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            aria-label="Send message"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default VibesChatPanel;
