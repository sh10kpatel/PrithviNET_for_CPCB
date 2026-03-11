"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { CopilotResponse } from "@/types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const question = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);

    try {
      const res = await api.post<CopilotResponse>("/api/copilot/query", {
        question,
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.answer },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${(err as Error).message}. Make sure the ML service is running.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">AI Copilot</h1>
        <p className="text-sm text-gray-500">
          Ask questions about environmental data, compliance, and regulations.
          Powered by Google Gemini.
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-white p-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="mb-2 text-4xl">AI</div>
              <p>Ask about pollution levels, compliance status, or regulations.</p>
              <div className="mt-4 space-y-2 text-sm">
                <p className="rounded-lg bg-gray-50 px-3 py-2">
                  &quot;What is the current air quality in Delhi?&quot;
                </p>
                <p className="rounded-lg bg-gray-50 px-3 py-2">
                  &quot;Is Tata Steel Jamshedpur compliant with SO2 limits?&quot;
                </p>
                <p className="rounded-lg bg-gray-50 px-3 py-2">
                  &quot;What are the NAAQS limits for PM2.5?&quot;
                </p>
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`mb-4 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="mb-4 flex justify-start">
            <div className="rounded-xl bg-gray-100 px-4 py-2 text-sm text-gray-500">
              Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about environmental data..."
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
