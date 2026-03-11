"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Send, User, Lightbulb, AlertCircle } from "lucide-react";
import { queryCompliance } from "@/lib/api";
import type { ComplianceResponse } from "@/types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: ComplianceResponse;
  loading?: boolean;
}

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I'm PrithviNET's AI Compliance Copilot. I can help you analyze environmental data, simulate policy changes, and provide compliance recommendations. Try asking me about:\n\n- What happens if PM2.5 levels increase by 20%?\n- Which stations are non-compliant for noise levels?\n- Recommend actions for industrial zones exceeding AQI limits.",
    },
  ]);
  const [input, setInput] = useState("");
  const [stationId, setStationId] = useState("");
  const [parameter, setParameter] = useState("");
  const [changePercent, setChangePercent] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    const loadingMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      loading: true,
    };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput("");
    setSending(true);

    try {
      const response = await queryCompliance({
        query: input,
        station_id: stationId || undefined,
        parameter: parameter || undefined,
        change_percent: changePercent ? parseFloat(changePercent) : undefined,
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsg.id
            ? { ...m, content: response.analysis, response, loading: false }
            : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsg.id
            ? {
                ...m,
                content:
                  "Sorry, I encountered an error processing your request. Please check that the backend is running.",
                loading: false,
              }
            : m
        )
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center gap-3">
          <Bot className="h-8 w-8 text-purple-600" />
          <div>
            <h1 className="text-xl font-bold">AI Compliance Copilot</h1>
            <p className="text-sm text-muted-foreground">
              Powered by Google Gemini - Analyze and simulate environmental compliance scenarios
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat area */}
        <div className="flex flex-1 flex-col">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="mx-auto max-w-3xl space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100">
                      <Bot className="h-4 w-4 text-purple-600" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {msg.loading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-60" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                    ) : (
                      <>
                        <p className="whitespace-pre-wrap text-sm">
                          {msg.content}
                        </p>
                        {msg.response?.recommendations &&
                          msg.response.recommendations.length > 0 && (
                            <div className="mt-3 space-y-2 border-t pt-2">
                              <p className="flex items-center gap-1 text-xs font-medium">
                                <Lightbulb className="h-3 w-3" />{" "}
                                Recommendations:
                              </p>
                              <ul className="space-y-1">
                                {msg.response.recommendations.map(
                                  (rec, i) => (
                                    <li
                                      key={i}
                                      className="text-xs text-muted-foreground"
                                    >
                                      {i + 1}. {rec}
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}
                        {msg.response?.affected_stations &&
                          msg.response.affected_stations.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              <AlertCircle className="h-3 w-3 text-amber-500" />
                              {msg.response.affected_stations
                                .slice(0, 10)
                                .map((sid) => (
                                  <Badge
                                    key={sid}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {sid}
                                  </Badge>
                                ))}
                              {msg.response.affected_stations.length > 10 && (
                                <Badge variant="outline" className="text-xs">
                                  +{msg.response.affected_stations.length - 10} more
                                </Badge>
                              )}
                            </div>
                          )}
                      </>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Input area */}
          <div className="border-t p-4">
            <div className="mx-auto max-w-3xl">
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about compliance, simulate policy changes..."
                  className="min-h-[60px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  size="icon"
                  className="h-[60px] w-[60px]"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar params */}
        <div className="hidden w-64 border-l p-4 lg:block">
          <h3 className="mb-4 text-sm font-medium">Query Parameters</h3>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Station ID (optional)</Label>
              <Input
                value={stationId}
                onChange={(e) => setStationId(e.target.value)}
                placeholder="e.g. ST001"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Parameter (optional)</Label>
              <Input
                value={parameter}
                onChange={(e) => setParameter(e.target.value)}
                placeholder="e.g. aqi_pm25"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Change % (optional)</Label>
              <Input
                type="number"
                value={changePercent}
                onChange={(e) => setChangePercent(e.target.value)}
                placeholder="e.g. 20"
                className="mt-1"
              />
            </div>
            <Separator />
            <div className="text-xs text-muted-foreground space-y-2">
              <p className="font-medium">Example queries:</p>
              <p
                className="cursor-pointer hover:text-foreground"
                onClick={() =>
                  setInput("What happens if PM2.5 levels increase by 20% across industrial zones?")
                }
              >
                &quot;PM2.5 increase by 20% in industrial zones&quot;
              </p>
              <p
                className="cursor-pointer hover:text-foreground"
                onClick={() =>
                  setInput("Which stations are currently exceeding noise limits?")
                }
              >
                &quot;Stations exceeding noise limits&quot;
              </p>
              <p
                className="cursor-pointer hover:text-foreground"
                onClick={() =>
                  setInput("Suggest compliance actions for stations with Very Poor AQI")
                }
              >
                &quot;Compliance actions for Very Poor AQI&quot;
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
