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

import {
  Loader2,
  MessageCircle,
} from "lucide-react"

import {
  MINDALEERT_BRIEF,
  MAX_UNGUIDED_TURNS,
} from "@/lib/studyConfig"

import type { RiskRegister } from "@/lib/slots"

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
  const [messages, setMessages] =
    useState<Message[]>([])

  const [input, setInput] =
    useState("")

  const [loading, setLoading] =
    useState(false)

  const [finishing, setFinishing] =
    useState(false)

  const [register, setRegister] =
    useState<RiskRegister | null>(null)

  const [error, setError] =
    useState<string | null>(null)

  const [startedAt] =
    useState(Date.now())

  const turnCount =
    messages.filter(
      (message) =>
        message.role === "user"
    ).length

  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content:
          "Hello. I am an AI assistant helping you think about the MindAlert project. You can ask me questions about the project and its possible ethical implications. You decide what you would like to explore and which questions to ask. You may ask follow-up questions if needed.",
        timestamp:
          new Date().toISOString(),
      },
    ])
  }, [])

  /* ---------------------------------------------------------------------- */
  /* CHAT                                                                    */
  /* ---------------------------------------------------------------------- */

  const sendMessage = async () => {
    const trimmed =
      input.trim()

    if (
      !trimmed ||
      loading ||
      finishing
    ) {
      return
    }

    if (
      turnCount >=
      MAX_UNGUIDED_TURNS
    ) {
      alert(
        `You have reached the maximum number of ${MAX_UNGUIDED_TURNS} questions for this activity.`
      )

      return
    }

    const userMessage: Message = {
      role: "user",
      content: trimmed,
      timestamp:
        new Date().toISOString(),
    }

    const updatedMessages = [
      ...messages,
      userMessage,
    ]

    setMessages(
      updatedMessages
    )

    setInput("")
    setLoading(true)
    setError(null)

    try {
      const response =
        await fetch(
          "/api/analyze",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              action: "chat",

              brief:
                MINDALEERT_BRIEF,

              session_id:
                sessionId,

              task_type:
                "unguided",

              condition_order:
                conditionOrder,

              messages:
                updatedMessages,
            }),
          }
        )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to receive a response from the AI."
        )
      }

      const assistantMessage:
        Message = {
        role: "assistant",
        content:
          data.response,
        timestamp:
          new Date().toISOString(),
      }

      setMessages(
        (previous) => [
          ...previous,
          assistantMessage,
        ]
      )
    } catch (error) {
      console.error(
        "Unguided chat error:",
        error
      )

      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong while contacting the AI."
      )
    } finally {
      setLoading(false)
    }
  }

  /* ---------------------------------------------------------------------- */
  /* FINISH CHAT + GENERATE FINAL RISK REGISTER                             */
  /* ---------------------------------------------------------------------- */

  const finishAnalysis =
    async () => {
      if (
        finishing ||
        loading
      ) {
        return
      }

      if (
        turnCount === 0
      ) {
        alert(
          "Please ask the AI assistant at least one question before finishing the analysis."
        )

        return
      }

      setFinishing(true)
      setError(null)

      const durationMs =
        Date.now() -
        startedAt

      try {
        const response =
          await fetch(
            "/api/analyze",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                action:
                  "generate_unguided",

                brief:
                  MINDALEERT_BRIEF,

                session_id:
                  sessionId,

                task_type:
                  "unguided",

                condition_order:
                  conditionOrder,

                messages,

                duration_ms:
                  durationMs,

                turn_count:
                  turnCount,
              }),
            }
          )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Failed to generate the final risk register."
          )
        }

        /*
         * IMPORTANT:
         *
         * Do NOT call onComplete() here.
         *
         * The participant must first see and review
         * the generated risk register.
         */
        if (!data.register) {
          throw new Error(
            "The AI generated a response, but no risk register was returned."
          )
        }

        setRegister(
          data.register
        )
      } catch (error) {
        console.error(
          "Final unguided risk register error:",
          error
        )

        setError(
          error instanceof Error
            ? error.message
            : "Failed to finish the analysis."
        )

        setFinishing(false)
      }
    }

  /* ---------------------------------------------------------------------- */
  /* RISK REGISTER RESULT                                                   */
  /* ---------------------------------------------------------------------- */

  if (register) {
    return (
      <div className="space-y-6">

        <Card>

          <CardHeader>

            <CardTitle>
              Generated Ethical Risk Register
            </CardTitle>

            <p className="text-sm text-muted-foreground">
              Please review the generated ethical
              risk analysis carefully before
              continuing to the survey.
            </p>

          </CardHeader>

          <CardContent className="space-y-6">

            {/* Project information */}

            <div className="border-b border-gray-100 pb-3">

              <h2 className="text-base font-semibold text-gray-900">
                {register.projectTitle}
              </h2>

              <p className="text-xs text-gray-400 mt-0.5">
                Unguided AI Analysis ·{" "}
                {new Date(
                  register.generatedAt
                ).toLocaleString()}
              </p>

            </div>


            {/* Risks */}

            <div className="space-y-3">

              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Identified Risks (
                {register.risks.length}
                )
              </p>

              {register.risks.map(
                (risk, index) => {

                  const severityStyles: Record<
                    string,
                    string
                  > = {
                    critical:
                      "bg-red-100 text-red-800 border-red-200",

                    high:
                      "bg-orange-100 text-orange-800 border-orange-200",

                    medium:
                      "bg-yellow-100 text-yellow-800 border-yellow-200",

                    low:
                      "bg-green-100 text-green-800 border-green-200",
                  }

                  const severityClass =
                    severityStyles[
                      risk.severity
                    ] ??
                    "bg-gray-100 text-gray-700 border-gray-200"

                  return (
                    <div
                      key={index}
                      className="rounded-lg border border-gray-200 p-4 space-y-3 bg-white"
                    >

                      {/* Risk header */}

                      <div className="flex items-center justify-between gap-2 flex-wrap">

                        <span className="text-sm font-semibold capitalize text-gray-900">
                          {risk.category}
                        </span>

                        <div className="flex items-center gap-2">

                          <span
                            className={`rounded border px-2 py-0.5 text-xs font-semibold uppercase ${severityClass}`}
                          >
                            {risk.severity}
                          </span>

                          <span className="text-xs text-gray-400 capitalize">
                            {risk.likelihood.replace(
                              /_/g,
                              " "
                            )}
                          </span>

                        </div>

                      </div>


                      {/* Description */}

                      <p className="text-sm text-gray-700 leading-relaxed">
                        {risk.description}
                      </p>


                      {/* Stakeholders */}

                      <p className="text-xs text-gray-500">

                        <span className="font-medium">
                          Affected:{" "}
                        </span>

                        {risk.affectedStakeholders.join(
                          ", "
                        )}

                      </p>


                      {/* Mitigations */}

                      {risk.mitigations.length >
                        0 && (
                        <ul className="mt-1 space-y-1 pt-2 border-t border-gray-100">

                          {risk.mitigations.map(
                            (
                              mitigation,
                              mitigationIndex
                            ) => (
                              <li
                                key={
                                  mitigationIndex
                                }
                                className="flex gap-2 text-xs text-gray-600"
                              >

                                <span className="text-green-500 shrink-0 mt-0.5">
                                  ✓
                                </span>

                                <span>
                                  {mitigation}
                                </span>

                              </li>
                            )
                          )}

                        </ul>
                      )}

                    </div>
                  )
                }
              )}

            </div>


            {/* Prioritised actions */}

            {register
              .prioritisedActions
              .length > 0 && (
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">

                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Prioritised Actions
                </p>

                <ol className="space-y-2 list-decimal list-inside">

                  {register.prioritisedActions.map(
                    (
                      action,
                      index
                    ) => (
                      <li
                        key={index}
                        className="text-sm text-gray-700 leading-relaxed"
                      >
                        {action}
                      </li>
                    )
                  )}

                </ol>

              </div>
            )}


            {/* Continue */}

            <Button
              type="button"
              onClick={onComplete}
              className="w-full"
            >
              Continue to Survey →
            </Button>

          </CardContent>

        </Card>

      </div>
    )
  }


  /* ---------------------------------------------------------------------- */
  /* ERROR                                                                  */
  /* ---------------------------------------------------------------------- */

  if (error) {
    return (
      <div className="space-y-6">

        <Card>

          <CardHeader>

            <CardTitle>
              Something went wrong
            </CardTitle>

          </CardHeader>

          <CardContent className="space-y-4">

            <div className="rounded-lg border border-red-200 bg-red-50 p-4">

              <p className="text-sm text-red-700">
                {error}
              </p>

            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setError(null)
                setFinishing(false)
              }}
            >
              Try again
            </Button>

          </CardContent>

        </Card>

      </div>
    )
  }


  /* ---------------------------------------------------------------------- */
  /* CHAT UI                                                                */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="space-y-6">

      {/* Project brief */}

      <Card>

        <CardHeader>

          <div className="flex items-center justify-between gap-4">

            <CardTitle className="flex items-center gap-2">

              <MessageCircle className="w-5 h-5" />

              MindAlert Project Brief

            </CardTitle>

            <Badge variant="outline">
              {turnCount} /{" "}
              {MAX_UNGUIDED_TURNS}{" "}
              questions
            </Badge>

          </div>

        </CardHeader>

        <CardContent>

          <div className="rounded-lg bg-muted/40 p-5 text-sm leading-7 whitespace-pre-line">
            {MINDALEERT_BRIEF}
          </div>

        </CardContent>

      </Card>


      {/* Unguided conversation */}

      <Card>

        <CardHeader>

          <CardTitle>
            Unguided AI analysis
          </CardTitle>

        </CardHeader>

        <CardContent className="space-y-6">

          {/* Conversation */}

          <div className="space-y-4">

            {messages.map(
              (
                message,
                index
              ) => (

                <div
                  key={`${message.timestamp}-${index}`}
                  className={`rounded-lg p-4 ${
                    message.role ===
                    "user"
                      ? "bg-primary/10 ml-8"
                      : "bg-muted/40 mr-8"
                  }`}
                >

                  <p className="text-xs font-semibold mb-2 uppercase tracking-wide">
                    {message.role ===
                    "user"
                      ? "You"
                      : "AI Assistant"}
                  </p>

                  <p className="text-sm leading-6 whitespace-pre-wrap">
                    {message.content}
                  </p>

                </div>

              )
            )}

          </div>


          {/* Question input */}

          <div className="space-y-2">

            <Label htmlFor="unguided-question">
              Your question
            </Label>

            <Textarea
              id="unguided-question"
              value={input}
              onChange={(event) =>
                setInput(
                  event.target.value
                )
              }
              placeholder="Ask the AI assistant about an ethical aspect of the project..."
              rows={4}
              disabled={
                loading ||
                finishing ||
                turnCount >=
                  MAX_UNGUIDED_TURNS
              }
              onKeyDown={(event) => {

                if (
                  event.key ===
                    "Enter" &&
                  !event.shiftKey
                ) {
                  event.preventDefault()
                  sendMessage()
                }

              }}
            />

            <p className="text-xs text-muted-foreground">
              Press Enter to send. Use
              Shift + Enter for a new line.
            </p>

          </div>


          {/* Buttons */}

          <div className="flex flex-col sm:flex-row gap-3">

            <Button
              onClick={
                sendMessage
              }
              disabled={
                loading ||
                finishing ||
                !input.trim() ||
                turnCount >=
                  MAX_UNGUIDED_TURNS
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
              onClick={
                finishAnalysis
              }
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
                  Generating risk register...
                </>
              ) : (
                "Finish analysis and generate risk register"
              )}

            </Button>

          </div>


          {/* Explanation */}

          <div className="rounded-lg border p-4 bg-muted/20">

            <p className="text-sm text-muted-foreground">
              You do not need to write the final
              risk report yourself. When you finish,
              the application will automatically
              generate the structured risk register
              from the project brief and your complete
              conversation with the AI.
            </p>

          </div>

        </CardContent>

      </Card>

    </div>
  )
}