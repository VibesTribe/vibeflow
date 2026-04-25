import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect, useCallback } from "react";
const API_BASE = "https://api.vibestribe.rocks";
const SESSION_ID = "dashboard-chat";
const VibesChatPanel = ({ isOpen, onClose }) => {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const currentAudioRef = useRef(null);
    const panelRef = useRef(null);
    const abortRef = useRef(null);
    const recognitionRef = useRef(null);
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
        if (!isOpen) {
            if (currentAudioRef.current) {
                currentAudioRef.current.pause();
                currentAudioRef.current = null;
            }
            if (abortRef.current) {
                abortRef.current.abort();
            }
        }
    }, [isOpen]);
    const playAudio = useCallback((url) => {
        if (currentAudioRef.current)
            currentAudioRef.current.pause();
        const audio = new Audio(url);
        currentAudioRef.current = audio;
        audio.play().catch(console.warn);
    }, []);
    // Generate TTS audio for a response
    const generateTTS = useCallback(async (text, messageId) => {
        try {
            const res = await fetch(`${API_BASE}/api/tts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, voice: "en-US-AvaNeural", engine: "edge" }),
            });
            if (!res.ok)
                return;
            const data = await res.json();
            if (data.audio_url) {
                // Convert localhost URL to tunnel URL
                const audioUrl = data.audio_url.replace("http://127.0.0.1:8642", API_BASE);
                setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, audioUrl } : m));
                playAudio(audioUrl);
            }
        }
        catch (err) {
            console.warn("TTS failed:", err);
        }
    }, [playAudio]);
    // Send message via SSE streaming
    const sendMessage = useCallback(async (text) => {
        if (!text.trim() || isLoading)
            return;
        const userMsg = {
            id: Date.now().toString(),
            type: "human",
            content: text.trim(),
            timestamp: new Date(),
        };
        const botMsg = {
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
            const res = await fetch(`${API_BASE}/api/sessions/${SESSION_ID}/chat/stream`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text.trim() }),
                signal: controller.signal,
            });
            if (!res.ok || !res.body) {
                throw new Error(`API error: ${res.status}`);
            }
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";
                for (const line of lines) {
                    if (!line.startsWith("data: "))
                        continue;
                    const jsonStr = line.slice(6).trim();
                    if (!jsonStr || jsonStr === "[DONE]")
                        continue;
                    try {
                        const event = JSON.parse(jsonStr);
                        // Handle delta (streaming text)
                        if (event.delta) {
                            fullText += event.delta;
                            setMessages((prev) => prev.map((m) => m.id === botMsg.id ? { ...m, content: fullText } : m));
                        }
                        // Handle final completion
                        if (event.content !== undefined && event.state === "final") {
                            fullText = event.content || fullText;
                            setMessages((prev) => prev.map((m) => m.id === botMsg.id
                                ? { ...m, content: fullText, isStreaming: false }
                                : m));
                        }
                    }
                    catch {
                        // skip malformed SSE lines
                    }
                }
            }
            // Mark streaming done and generate TTS
            setMessages((prev) => prev.map((m) => m.id === botMsg.id ? { ...m, isStreaming: false } : m));
            if (fullText.trim()) {
                generateTTS(fullText, botMsg.id);
            }
        }
        catch (err) {
            if (err.name !== "AbortError") {
                setMessages((prev) => prev.map((m) => m.id === botMsg.id
                    ? { ...m, content: "Sorry, I'm having trouble connecting. Try again?", isStreaming: false }
                    : m));
            }
        }
        finally {
            setIsLoading(false);
            abortRef.current = null;
        }
    }, [isLoading, generateTTS]);
    // Voice input using Web Speech API
    const toggleRecording = useCallback(() => {
        if (isRecording) {
            recognitionRef.current?.stop();
            setIsRecording(false);
            return;
        }
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setMessages((prev) => [
                ...prev,
                { id: Date.now().toString(), type: "vibes", content: "Voice input not supported in this browser. Try Chrome?", timestamp: new Date() },
            ]);
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (transcript.trim()) {
                sendMessage(transcript);
            }
        };
        recognition.onerror = () => {
            setIsRecording(false);
        };
        recognition.onend = () => {
            setIsRecording(false);
        };
        recognitionRef.current = recognition;
        recognition.start();
        setIsRecording(true);
    }, [isRecording, sendMessage]);
    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage(inputValue);
        }
    };
    if (!isOpen)
        return null;
    return (_jsx("div", { className: "vibes-chat-overlay", onClick: () => { window.scrollTo(0, 0); onClose(); }, children: _jsxs("div", { className: "vibes-chat-panel", ref: panelRef, onClick: (e) => e.stopPropagation(), children: [_jsxs("header", { className: "vibes-chat-panel__header", children: [_jsxs("div", { className: "vibes-chat-panel__title", children: [_jsx("span", { className: "vibes-chat-panel__icon", children: "\uD83E\uDD16" }), _jsx("span", { children: "Vibes" })] }), _jsx("button", { className: "vibes-chat-panel__close", onClick: onClose, "aria-label": "Close chat", children: "\u00D7" })] }), _jsxs("div", { className: "vibes-chat-panel__messages", children: [messages.length === 0 && (_jsx("div", { className: "vibes-chat-panel__message vibes-chat-panel__message--vibes", children: _jsx("div", { className: "vibes-chat-panel__message-content", children: "Hi! Type a message or tap the mic to talk." }) })), messages.map((msg) => (_jsxs("div", { className: `vibes-chat-panel__message vibes-chat-panel__message--${msg.type}`, children: [_jsxs("div", { className: "vibes-chat-panel__message-content", children: [msg.content, msg.isStreaming && !msg.content && (_jsxs("span", { className: "vibes-chat-panel__typing", children: [_jsx("span", {}), _jsx("span", {}), _jsx("span", {})] })), msg.audioUrl && (_jsx("button", { className: "vibes-chat-panel__play-btn", onClick: () => playAudio(msg.audioUrl), "aria-label": "Play audio", title: "Play audio", children: "\u25B6" }))] }), _jsx("div", { className: "vibes-chat-panel__message-time", children: msg.timestamp.toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    }) })] }, msg.id))), isLoading && !messages.some(m => m.isStreaming && m.content) && (_jsx("div", { className: "vibes-chat-panel__message vibes-chat-panel__message--vibes", children: _jsxs("div", { className: "vibes-chat-panel__typing", children: [_jsx("span", {}), _jsx("span", {}), _jsx("span", {})] }) })), _jsx("div", { ref: messagesEndRef })] }), _jsxs("div", { className: "vibes-chat-panel__input-area", children: [_jsx("input", { ref: inputRef, type: "text", className: "vibes-chat-panel__input", placeholder: "Ask Vibes anything...", value: inputValue, onChange: (e) => setInputValue(e.target.value), onKeyDown: handleKeyDown, disabled: isLoading }), _jsx("button", { className: `vibes-chat-panel__mic-btn${isRecording ? " vibes-chat-panel__mic-btn--recording" : ""}`, onClick: toggleRecording, disabled: isLoading, "aria-label": isRecording ? "Stop recording" : "Start recording", title: isRecording ? "Tap to stop" : "Tap to speak", children: isRecording ? "⏹" : "🎤" }), _jsx("button", { className: "vibes-chat-panel__send", onClick: () => sendMessage(inputValue), disabled: !inputValue.trim() || isLoading, "aria-label": "Send message", children: "Send" })] })] }) }));
};
export default VibesChatPanel;
