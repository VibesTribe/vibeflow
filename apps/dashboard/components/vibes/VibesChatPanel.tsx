import React, { useState, useRef, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";

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

const MOCK_RESPONSES: Record<string, string> = {
  roi: "Your ROI this week is $127.40! You've saved that compared to API rates. 94% success rate across 156 tasks.",
  status: "All systems operational! 3 active tasks, 2 pending review. Kimi and DeepSeek are performing well.",
  project: "The current project is 73% complete with 12 tasks done this week. 3 tasks are pending review.",
  help: "I can help you check ROI, project status, task progress, model performance, and more. Just ask!",
  default: "I'm here to help! You can ask me about your projects, ROI, task status, or anything about VibePilot.",
};

function getMockResponse(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("roi") || lower.includes("cost") || lower.includes("saving")) return MOCK_RESPONSES.roi;
  if (lower.includes("status") || lower.includes("how")) return MOCK_RESPONSES.status;
  if (lower.includes("project") || lower.includes("progress")) return MOCK_RESPONSES.project;
  if (lower.includes("help") || lower.includes("what can")) return MOCK_RESPONSES.help;
  return MOCK_RESPONSES.default;
}

const VibesChatPanel: React.FC<VibesChatPanelProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      type: "vibes",
      content: "Hi! I'm Vibes, your VibePilot assistant. Ask me about your projects, ROI, or task status!",
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
      let responseText: string;

      if (isSupabaseConfigured() && supabase) {
        const { data, error } = await supabase.rpc("vibes_query", {
          p_user_id: "anonymous",
          p_question: userMessage.content,
          p_context: {},
        });

        if (error) {
          console.warn("Supabase vibes_query error, using mock:", error);
          responseText = getMockResponse(userMessage.content);
        } else {
          responseText = data?.response || getMockResponse(userMessage.content);
        }
      } else {
        await new Promise((r) => setTimeout(r, 500));
        responseText = getMockResponse(userMessage.content);
      }

      const vibesMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "vibes",
        content: responseText,
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
