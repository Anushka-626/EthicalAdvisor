"use client"

import { useEffect, useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2, MessageCircle } from "lucide-react"
import { MINDALEERT_BRIEF, MAX_UNGUIDED_TURNS } from "@/lib/studyConfig"

interface Props {
  sessionId: string
  conditionOrder: "A_B" | "B_A"
  onComplete: () => void
}

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: string
}

export function UnguidedLLM({
  sessionId,
  conditionOrder,
  onComplete,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [riskRegister, setRiskRegister] = useState<any>(null)
  const [startedAt] = useState(Date.now())

  const turnCount = messages.filter(
    (message) => message.role === "user"
  ).length

  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content:
          "Hello. I am your AI ethics advisor. You can ask me questions about the ethical aspects of the MindAlert project. You decide what you would like to explore.",
        timestamp: new Date().toISOString(),
      },
    ])
  }, [])

  const sendMessage = async () => {
    const trimmed = input.trim()

    if (!trimmed || loading || finishing) {
      return
    }

    if (turnCount >= MAX_UNGUIDED_TURNS) {
      alert(
        `You have reached the maximum number of ${MAX_UNGUIDED_TURNS} questions for this activity.`
      )
      return
    }

    const userMessage: Message = {
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    }

    const updatedMessages = [...messages, userMessage]

    setMessages(updatedMessages)
    setInput("")
    setLoading(true)

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "chat",
          brief: MINDALEERT_BRIEF,
          session_id: sessionId,
          task_type: "unguided",
          condition_order: conditionOrder,
          messages: updatedMessages,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to receive a response from the AI."
        )
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [
        ...prev,
        assistantMessage,
      ])
    } catch (error) {
      console.error("Unguided chat error:", error)

      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong while contacting the AI."
      )
    } finally {
      setLoading(false)
    }
  }

  const finishAnalysis = async () => {
    if (finishing || loading) {
      return
    }

    if (turnCount === 0) {
      alert(
        "Please ask the AI assistant at least one question before finishing the analysis."
      )
      return
    }

    setFinishing(true)

    const durationMs = Date.now() - startedAt

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "generate_unguided",
          brief: MINDALEERT_BRIEF,
          session_id: sessionId,
          task_type: "unguided",
          condition_order: conditionOrder,
          messages,
          duration_ms: durationMs,
          turn_count: turnCount,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to generate the final risk register."
        )
      }

      setRiskRegister(data.register)

      /*
       * IMPORTANT:
       * The risk register is deliberately NOT displayed.
       *
       * The participant should not see the final structured
       * risk register because it could influence the later
       * condition.
       */

      setTimeout(() => {
        onComplete()
      }, 500)
    } catch (error) {
      console.error(
        "Final unguided risk register error:",
        error
      )

      alert(
        error instanceof Error
          ? error.message
          : "Failed to finish the analysis."
      )

      setFinishing(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              MindAlert Project Brief
            </CardTitle>

            <Badge variant="outline">
              {turnCount} / {MAX_UNGUIDED_TURNS} questions
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-lg bg-muted/40 p-5 text-sm leading-7 whitespace-pre-line">
            {MINDALEERT_BRIEF}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Unguided AI analysis</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={`${message.timestamp}-${index}`}
                className={`rounded-lg p-4 ${
                  message.role === "user"
                    ? "bg-primary/10 ml-8"
                    : "bg-muted/40 mr-8"
                }`}
              >
                <p className="text-xs font-semibold mb-2 uppercase tracking-wide">
                  {message.role === "user"
                    ? "You"
                    : "AI Ethics Advisor"}
                </p>

                <p className="text-sm leading-6 whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="unguided-question">
              Your question
            </Label>

            <Textarea
              id="unguided-question"
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              placeholder="Ask the AI assistant about an ethical aspect of the project..."
              rows={4}
              disabled={
                loading ||
                finishing ||
                turnCount >= MAX_UNGUIDED_TURNS
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey
                ) {
                  event.preventDefault()
                  sendMessage()
                }
              }}
            />

            <p className="text-xs text-muted-foreground">
              Press Enter to send. Use Shift + Enter for a
              new line.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={sendMessage}
              disabled={
                loading ||
                finishing ||
                !input.trim() ||
                turnCount >= MAX_UNGUIDED_TURNS
              }
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  AI is responding...
                </>
              ) : (
                "Ask AI"
              )}
            </Button>

            <Button
              onClick={finishAnalysis}
              disabled={
                loading ||
                finishing ||
                turnCount === 0
              }
              variant="outline"
              className="flex-1"
            >
              {finishing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Finishing analysis...
                </>
              ) : (
                "Finish analysis and generate risk register"
              )}
            </Button>
          </div>

          <div className="rounded-lg border p-4 bg-muted/20">
            <p className="text-sm text-muted-foreground">
              You do not need to write the final risk report
              yourself. When you finish, the application will
              automatically generate the structured risk
              register from the project brief and your complete
              conversation with the AI.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}