"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { useEffect, useRef, useState, useCallback } from "react";
import { getSessionId } from "@/lib/session";
import { sendTranscriptEmail } from "@/lib/email";

interface AIChatbotProps {
  onClose: () => void;
}

function getTextContent(message: UIMessage): string {
  for (const part of message.parts) {
    if (part.type === "text") return part.text;
  }
  return "";
}

export function AIChatbot({ onClose }: AIChatbotProps) {
  const [conversationId] = useState(() => crypto.randomUUID());
  const [sessionId] = useState(() => getSessionId());
  const [intakeComplete, setIntakeComplete] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
    messages: [
      {
        id: "greeting",
        role: "assistant" as const,
        parts: [
          {
            type: "text" as const,
            text: "Hi there! Welcome to CND Auto Service. I'm here to help get your service request started. What's your phone number?",
          },
        ],
        createdAt: new Date(),
      },
    ],
    onFinish: ({ message }) => {
      const text = getTextContent(message);
      if (text.includes("[INTAKE_COMPLETE]")) {
        setIntakeComplete(true);
      }
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  const saveConversation = useCallback(
    async (msgs: UIMessage[], convStatus = "active") => {
      try {
        const transcript = msgs.map((m) => ({
          role: m.role,
          content: getTextContent(m),
        }));
        await fetch("/api/conversation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            sessionId,
            transcript,
            status: convStatus,
          }),
        });
      } catch {
        // silent
      }
    },
    [conversationId, sessionId]
  );

  useEffect(() => {
    if (!intakeComplete) return;

    const run = async () => {
      setEmailStatus("sending");
      await saveConversation(messages, "completed");

      const transcript = messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: getTextContent(m),
      }));

      const success = await sendTranscriptEmail({
        conversationId,
        transcript,
      });

      setEmailStatus(success ? "sent" : "error");
    };

    run();
  }, [intakeComplete, messages, conversationId, saveConversation]);

  useEffect(() => {
    if (messages.length > 1 && !intakeComplete) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveConversation(messages);
      }, 3000);
    }
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [messages, intakeComplete, saveConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-full w-full flex-col bg-white sm:h-[80vh] sm:max-h-[700px] sm:w-full sm:max-w-[420px] sm:rounded-2xl sm:shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-sm font-semibold text-zinc-900">CND Auto Service</span>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Close chat"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="flex flex-col gap-3">
            {messages.map((m) => {
              const text = getTextContent(m).replace("[INTAKE_COMPLETE]", "").trim();
              const role = m.role as string;
              if (!text) return null;
              return (
                <div
                  key={m.id}
                  className={`flex ${role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-zinc-100 text-zinc-900"
                    }`}
                  >
                    {text}
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-zinc-100 px-4 py-2.5">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            {emailStatus === "sent" && (
              <div className="flex justify-center">
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs text-green-700">
                  Intake sent to service advisor
                </span>
              </div>
            )}
            {emailStatus === "error" && (
              <div className="flex justify-center">
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs text-red-700">
                  Email failed — please call 301-699-0001
                </span>
              </div>
            )}
            {error && (
              <div className="flex justify-center">
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs text-red-700">
                  Connection error — please try again
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {!intakeComplete && (
          <form
            onSubmit={handleSend}
            className="flex items-center gap-2 border-t border-zinc-200 px-4 py-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 rounded-full border border-zinc-300 px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none"
              disabled={isLoading}
              autoFocus
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              aria-label="Send message"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
