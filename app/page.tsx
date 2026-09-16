"use client"

import { useEffect, useState } from "react"

import { Header } from "@/components/study/header"
import { Footer } from "@/components/study/footer"
import { StudyIntro } from "@/components/study/study-intro"

import { TaskA } from "@/components/study/taskAquestionnaire"
import { TaskB } from "@/components/study/task-b"

import { SurveyForm } from "@/components/study/survey-form"
import { StudyComplete } from "@/components/study/study-complete"

import {
  ConditionOrder,
  MINDALEERT_BRIEF,
} from "@/lib/studyConfig"

type StudyPhase =
  | "intro"
  | "taskA"
  | "surveyA"
  | "taskB"
  | "surveyB"
  | "comparison"
  | "complete"

const SESSION_ID_KEY = "session_id"
const CONDITION_ORDER_PREFIX = "condition_order_"

/**
 * Generate a random counterbalanced condition order.
 *
 * A_B:
 *   Unguided -> Survey -> Clarify-first -> Survey
 *
 * B_A:
 *   Clarify-first -> Survey -> Unguided -> Survey
 */
function generateConditionOrder(): ConditionOrder {
  return Math.random() < 0.5 ? "A_B" : "B_A"
}

/**
 * Get the condition order belonging to a specific session.
 *
 * The order is stored separately for each session so that:
 *
 * - refreshing the page keeps the same experimental condition
 * - starting a new session gets a new random assignment
 */
function getConditionOrderForSession(
  sessionId: string
): ConditionOrder {
  const key =
    `${CONDITION_ORDER_PREFIX}${sessionId}`

  const stored =
    localStorage.getItem(key)

  if (
    stored === "A_B" ||
    stored === "B_A"
  ) {
    return stored
  }

  const newOrder =
    generateConditionOrder()

  localStorage.setItem(
    key,
    newOrder
  )

  return newOrder
}

/**
 * Create a completely new study session.
 *
 * This is used when the participant starts the study
 * for the first time and when they explicitly restart
 * after completing the study.
 */
function createNewStudySession(): {
  sessionId: string
  conditionOrder: ConditionOrder
} {
  const newSessionId =
    crypto.randomUUID()

  const newConditionOrder =
    generateConditionOrder()

  localStorage.setItem(
    SESSION_ID_KEY,
    newSessionId
  )

  localStorage.setItem(
    `${CONDITION_ORDER_PREFIX}${newSessionId}`,
    newConditionOrder
  )

  return {
    sessionId: newSessionId,
    conditionOrder:
      newConditionOrder,
  }
}

export default function Home() {
  const [phase, setPhase] =
    useState<StudyPhase>("intro")

  const [sessionId, setSessionId] =
    useState<string>("")

  const [conditionOrder, setConditionOrder] =
    useState<ConditionOrder>("A_B")

  const [comparisonAnswer, setComparisonAnswer] =
    useState("")

  const [comparisonSubmitting, setComparisonSubmitting] =
    useState(false)

  const [comparisonError, setComparisonError] =
    useState("")

  /*
   * Initialise the participant's session.
   *
   * If a session already exists:
   *   - keep that session
   *   - keep its condition order
   *
   * If no session exists:
   *   - create a new session
   *   - randomly assign A_B or B_A
   */
  useEffect(() => {
    let id =
      localStorage.getItem(
        SESSION_ID_KEY
      )

    if (!id) {
      const newSession =
        createNewStudySession()

      id = newSession.sessionId

      setSessionId(id)
      setConditionOrder(
        newSession.conditionOrder
      )

      return
    }

    const storedOrder =
      getConditionOrderForSession(id)

    setSessionId(id)
    setConditionOrder(
      storedOrder
    )
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  const handleStart = () => {
    if (!sessionId) return

    /*
     * The one-shot baseline is generated separately
     * on the backend and is NOT shown to participants.
     *
     * Experimental flow:
     *
     * A_B:
     *
     *   Unguided AI Analysis
     *   -> Survey A
     *   -> Clarify-first AI Analysis
     *   -> Survey B
     *   -> Final Comparison
     *
     * B_A:
     *
     *   Clarify-first AI Analysis
     *   -> Survey B
     *   -> Unguided AI Analysis
     *   -> Survey A
     *   -> Final Comparison
     */

    if (
      conditionOrder === "A_B"
    ) {
      setPhase("taskA")
    } else {
      setPhase("taskB")
    }

    scrollToTop()
  }

  /**
   * Task A has finished.
   *
   * What comes next depends on the counterbalancing order.
   */
  const handleTaskAComplete = () => {
    setPhase("surveyA")
    scrollToTop()
  }

  /**
   * Survey A has finished.
   *
   * A_B:
   *   A -> Survey A -> B
   *
   * B_A:
   *   B -> Survey B -> A -> Survey A -> Comparison
   */
  const handleSurveyAComplete = () => {
    if (
      conditionOrder === "A_B"
    ) {
      setPhase("taskB")
    } else {
      setPhase("comparison")
    }

    scrollToTop()
  }

  /**
   * Task B has finished.
   */
  const handleTaskBComplete = () => {
    setPhase("surveyB")
    scrollToTop()
  }

  /**
   * Survey B has finished.
   *
   * B_A:
   *   B -> Survey B -> A
   *
   * A_B:
   *   A -> Survey A -> B -> Survey B -> Comparison
   */
  const handleSurveyBComplete = () => {
    if (
      conditionOrder === "B_A"
    ) {
      setPhase("taskA")
    } else {
      setPhase("comparison")
    }

    scrollToTop()
  }

  /**
   * Save the final comparison response.
   */
  const handleComparisonSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()

    setComparisonError("")

    if (!comparisonAnswer.trim()) {
      setComparisonError(
        "Please answer the question before continuing."
      )
      return
    }

    if (!sessionId) {
      setComparisonError(
        "Session information is missing. Please restart the study."
      )
      return
    }

    try {
      setComparisonSubmitting(true)

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
                "save_comparison",

              brief:
                MINDALEERT_BRIEF,

              session_id:
                sessionId,

              condition_order:
                conditionOrder,

              answers: {
                approach_reflection:
                  comparisonAnswer.trim(),
              },
            }),
          }
        )

      if (!response.ok) {
        let message =
          "Failed to save your response."

        try {
          const data =
            await response.json()

          if (data?.error) {
            message =
              data.error
          }
        } catch {
          // Keep default error message.
        }

        throw new Error(message)
      }

      setPhase("complete")
      scrollToTop()
    } catch (submitError) {
      console.error(
        "COMPARISON SUBMISSION ERROR:",
        submitError
      )

      setComparisonError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save your response. Please try again."
      )
    } finally {
      setComparisonSubmitting(
        false
      )
    }
  }

  /**
   * Start a completely new study session.
   *
   * This is important for counterbalancing.
   * A restart must NOT reuse the previous participant/session.
   */
  const handleRestart = () => {
    const newSession =
      createNewStudySession()

    setSessionId(
      newSession.sessionId
    )

    setConditionOrder(
      newSession.conditionOrder
    )

    setComparisonAnswer("")
    setComparisonError("")
    setComparisonSubmitting(false)

    setPhase("intro")

    scrollToTop()
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {phase === "intro" && (
          <StudyIntro
            onStart={handleStart}
          />
        )}

        {phase === "taskA" && (
          <TaskA
            sessionId={sessionId}
            conditionOrder={
              conditionOrder
            }
            onComplete={
              handleTaskAComplete
            }
          />
        )}

        {phase === "surveyA" && (
          <SurveyForm
            taskType="surveyA"
            conditionOrder={
              conditionOrder
            }
            sessionId={sessionId}
            onComplete={
              handleSurveyAComplete
            }
          />
        )}

        {phase === "taskB" && (
          <TaskB
            sessionId={sessionId}
            conditionOrder={
              conditionOrder
            }
            onComplete={
              handleTaskBComplete
            }
          />
        )}

        {phase === "surveyB" && (
          <SurveyForm
            taskType="surveyB"
            conditionOrder={
              conditionOrder
            }
            sessionId={sessionId}
            onComplete={
              handleSurveyBComplete
            }
          />
        )}

        {phase === "comparison" && (
          <div className="container mx-auto max-w-3xl px-4 py-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                  Final Comparison
                </h1>

                <p className="text-muted-foreground">
                  You have now completed both AI-supported
                  approaches. Please compare your experience.
                </p>
              </div>

              <form
                onSubmit={
                  handleComparisonSubmit
                }
                className="space-y-6"
              >
                <div className="space-y-4 rounded-lg border p-5">
                  <div className="space-y-1">
                    <p className="font-medium">
                      Which approach helped you think more
                      carefully about the ethical risks, and why?
                    </p>
                  </div>

                  <textarea
                    value={
                      comparisonAnswer
                    }
                    onChange={(event) =>
                      setComparisonAnswer(
                        event.target.value
                      )
                    }
                    placeholder="Please explain briefly..."
                    rows={6}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                  />
                </div>

                {comparisonError && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                    {comparisonError}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={
                      comparisonSubmitting
                    }
                    className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {comparisonSubmitting
                      ? "Saving..."
                      : "Continue"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {phase === "complete" && (
          <StudyComplete
            onRestart={
              handleRestart
            }
          />
        )}
      </main>

      <Footer />
    </div>
  )
}