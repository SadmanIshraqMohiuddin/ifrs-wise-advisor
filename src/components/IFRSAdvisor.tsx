import React, { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Trash2, Plus, Send, AlertTriangle, Loader2, ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "@/hooks/use-toast";

interface AnswerMessage {
  type: "answer";
  question_number: number;
  question: string;
  answer: string;
  timestamp?: string;
}

interface SummaryMessage {
  type: "summary";
  summary: string;
  timestamp?: string;
  sent_in_order?: boolean;
}

type IncomingMessage = AnswerMessage | SummaryMessage | Record<string, any>;

const TypingDots = () => (
  <div className="flex items-center gap-1 px-3 py-2">
    <span className="inline-block h-2 w-2 rounded-full bg-foreground/60 animate-bounce [animation-delay:-0.2s]" />
    <span className="inline-block h-2 w-2 rounded-full bg-foreground/60 animate-bounce" />
    <span className="inline-block h-2 w-2 rounded-full bg-foreground/60 animate-bounce [animation-delay:0.2s]" />
  </div>
);

const MessageBubble = ({
  side,
  content,
  timestamp,
  label,
}: {
  side: "left" | "right";
  content: React.ReactNode;
  timestamp?: string;
  label?: string;
}) => {
  return (
    <div className={`flex ${side === "right" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] md:max-w-[70%] rounded-lg border shadow-sm px-4 py-3 ${
          side === "right"
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        {label && (
          <div className="text-xs opacity-80 mb-1">
            {label}
          </div>
        )}
        <div className="whitespace-pre-wrap break-words">
          {content}
        </div>
        {timestamp && (
          <div className={`mt-2 text-xs opacity-70 ${side === "right" ? "text-primary-foreground" : "text-muted-foreground"}`}>
            {new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>
    </div>
  );
};

const IFRSAdvisor: React.FC = () => {
  const [background, setBackground] = useState("");
  const [questions, setQuestions] = useState<string[]>([""]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<number, AnswerMessage>>({});
  const [typing, setTyping] = useState<Record<number, boolean>>({});
  const [summary, setSummary] = useState<SummaryMessage | null>(null);
  const [sentInOrder, setSentInOrder] = useState<boolean | null>(null);

  const chatRef = useRef<HTMLDivElement | null>(null);

  const sortedAnswers = useMemo(() => {
    return Object.values(answers).sort((a, b) => a.question_number - b.question_number);
  }, [answers]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [sortedAnswers.length, summary]);

  useEffect(() => {
    return () => {
      ws?.close();
    };
  }, [ws]);

  const addQuestion = () => {
    setQuestions((qs) => [...qs, ""]);
  };

  const removeQuestion = (idx: number) => {
    setQuestions((qs) => qs.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx: number, value: string) => {
    setQuestions((qs) => qs.map((q, i) => (i === idx ? value : q)));
  };

  const handleSubmit = () => {
    const trimmedQuestions = questions.map((q) => q.trim()).filter((q) => q.length > 0);
    if (!background.trim()) {
      toast({ title: "Background is required", description: "Please describe your IFRS scenario." });
      return;
    }
    if (trimmedQuestions.length === 0) {
      toast({ title: "Add at least one question", description: "Please include one or more questions." });
      return;
    }

    // Reset state for new session
    setAnswers({});
    setTyping(Object.fromEntries(trimmedQuestions.map((_, i) => [i + 1, true])));
    setSummary(null);
    setSentInOrder(null);
    setSessionLoading(true);

    const socket = new WebSocket("wss://104.248.169.227:8443/ws/rag/");
    setWs(socket);

    socket.onopen = () => {
      const payload = {
        type: "process_questions",
        background: background.trim(),
        questions: trimmedQuestions,
        model: "gpt-4o-mini",
      };
      socket.send(JSON.stringify(payload));
    };

    socket.onmessage = (event) => {
      try {
        const data: IncomingMessage = JSON.parse(event.data);
        if (typeof (data as any).sent_in_order === "boolean") {
          setSentInOrder((data as any).sent_in_order);
        }
        if ((data as any).type === "answer") {
          const msg = data as AnswerMessage;
          setAnswers((prev) => ({ ...prev, [msg.question_number]: msg }));
          setTyping((t) => ({ ...t, [msg.question_number]: false }));
        } else if ((data as any).type === "summary") {
          const msg = data as SummaryMessage;
          setSummary(msg);
          setSessionLoading(false);
        }
      } catch (e) {
        console.error("Failed to parse message", e);
      }
    };

    socket.onerror = () => {
      setSessionLoading(false);
      toast({ title: "Connection error", description: "Could not connect to IFRS Advisor. Please try again.", });
    };

    socket.onclose = () => {
      setSessionLoading(false);
    };
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">IFRS Wise Advisor</h1>
        <p className="text-muted-foreground mt-2">Provide background and questions, then receive AI-driven IFRS guidance.</p>
      </header>

      <main>
        <section aria-labelledby="background" className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle id="background">Background</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                rows={6}
                placeholder={'Describe your IFRS scenario here (e.g., "Company A owns an office building...")'}
              />
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="questions" className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle id="questions">Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {questions.map((q, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Input
                      value={q}
                      onChange={(e) => updateQuestion(idx, e.target.value)}
                      placeholder={`Question ${idx + 1}`}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={`Remove question ${idx + 1}`}
                      onClick={() => removeQuestion(idx)}
                      className="shrink-0"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
                <div>
                  <Button variant="secondary" onClick={addQuestion}>
                    <Plus className="mr-1" /> Add Another Question
                  </Button>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <Button onClick={handleSubmit}>
                  <Send className="mr-2" /> Submit to IFRS Advisor
                </Button>
                {sessionLoading && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="animate-spin" />
                    <span>Processing session…</span>
                  </div>
                )}
              </div>

              {sentInOrder === false && (
                <div className="mt-3 flex items-center gap-2 text-sm text-foreground">
                  <AlertTriangle className="text-destructive" />
                  Results may arrive out of order; they will be sorted by question number.
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="chat-output" className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle id="chat-output">Assistant Responses</CardTitle>
            </CardHeader>
            <CardContent>
              <div ref={chatRef} className="max-h-[50vh] overflow-y-auto pr-2 space-y-4">
                {sortedAnswers.map((msg) => (
                  <div key={`q-${msg.question_number}`} className="space-y-2">
                    <MessageBubble
                      side="right"
                      label={`Question ${msg.question_number}`}
                      content={<span>{msg.question}</span>}
                      timestamp={msg.timestamp}
                    />
                    <MessageBubble
                      side="left"
                      label="IFRS Advisor"
                      content={<span>{msg.answer}</span>}
                      timestamp={msg.timestamp}
                    />
                  </div>
                ))}

                {/* Typing indicators for unanswered questions */}
                {Object.entries(typing)
                  .filter(([, v]) => v)
                  .map(([key]) => (
                    <div key={`typing-${key}`} className="space-y-2">
                      <MessageBubble
                        side="right"
                        label={`Question ${key}`}
                        content={<span>Sending…</span>}
                      />
                      <MessageBubble side="left" label="IFRS Advisor" content={<TypingDots />} />
                    </div>
                  ))}

                {!sessionLoading && sortedAnswers.length === 0 && !summary && (
                  <p className="text-sm text-muted-foreground">Your answers will appear here after submission.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {summary && (
          <section aria-labelledby="summary" className="mb-12">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle id="summary">Session Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <Collapsible defaultOpen>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="mb-3">
                      <ChevronDown className="mr-2" /> Toggle Summary
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="prose max-w-none prose-sm md:prose-base">
                      <ReactMarkdown>{summary.summary}</ReactMarkdown>
                    </div>
                    {summary.timestamp && (
                      <div className="mt-3 text-sm text-muted-foreground">
                        {new Date(summary.timestamp).toLocaleString()}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          </section>
        )}
      </main>
    </div>
  );
};

export default IFRSAdvisor;
