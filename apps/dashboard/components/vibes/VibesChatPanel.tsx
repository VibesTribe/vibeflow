import React, { useState, useRef, useEffect } from "react";

interface ChatMessage {
  id: string;
  type: "human" | "vibes";
  content: string;
  timestamp: Date;
}

interface VibesChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const VibesChatPanel: React.FC<VibesChatPanelProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      type: "vibes",
      content: "Hi! I'm Vibes, your VibePilot assistant. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "human",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/vibes/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();

      const vibesMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "vibes",
        content: data.response || "I'm thinking about that...",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, vibesMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "vibes",
        content: "Sorry, I had trouble processing that. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="vibes-chat-overlay" onClick={onClose}>
      <div className="vibes-chat-panel" onClick={(e) => e.stopPropagation()}>
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
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`vibes-chat-panel__message vibes-chat-panel__message--${msg.type}`}
            >
              <div className="vibes-chat-panel__message-content">
                {msg.content}
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
