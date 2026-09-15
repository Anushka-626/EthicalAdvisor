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
  getStoredConditionOrder,
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

  useEffect(() => {
    let id = localStorage.getItem("session_id")

    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem("session_id", id)
    }

    setSessionId(id)

    const storedOrder =
      getStoredConditionOrder()

    setConditionOrder(storedOrder)
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
     * The one-shot baseline is generated separately on the backend
     * and is NOT shown to participants.
     *
     * Experimental flow:
     *
     * A_B:
     *   Unguided AI Analysis
     *   -> Survey
     *   -> Clarify-first AI Analysis
     *   -> Survey
     *   -> Final Comparison
     *
     * B_A:
     *   Clarify-first AI Analysis
     *   -> Survey
     *   -> Unguided AI Analysis
     *   -> Survey
     *   -> Final Comparison
     */
    if (conditionOrder === "A_B") {
      setPhase("taskA")
    } else {
      setPhase("taskB")
    }

    scrollToTop()
  }

  const handleTaskAComplete = () => {
    setPhase("surveyA")
    scrollToTop()
  }

  const handleSurveyAComplete = () => {
    /*
     * If the participant started with A,
     * continue to B.
     *
     * If the participant started with B,
     * A is the second condition, so continue
     * to the final comparison question.
     */
    if (conditionOrder === "A_B") {
      setPhase("taskB")
    } else {
      setPhase("comparison")
    }

    scrollToTop()
  }

  const handleTaskBComplete = () => {
    setPhase("surveyB")
    scrollToTop()
  }

  const handleSurveyBComplete = () => {
    /*
     * If the participant started with B,
     * continue to A.
     *
     * If the participant started with A,
     * B is the second condition, so continue
     * to the final comparison question.
     */
    if (conditionOrder === "B_A") {
      setPhase("taskA")
    } else {
      setPhase("comparison")
    }

    scrollToTop()
  }

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

      const response = await fetch(
        "/api/analyze",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            action: "save_comparison",
            brief:
              MINDALEERT_BRIEF,
            session_id:
              sessionId,
            task_type:
              "comparison",
            condition_name:
              "Final Comparison",
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
            message = data.error
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
      setComparisonSubmitting(false)
    }
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
            conditionOrder={conditionOrder}
            onComplete={handleTaskAComplete}
          />
        )}

        {phase === "surveyA" && (
          <SurveyForm
            taskType="surveyA"
            conditionOrder={conditionOrder}
            sessionId={sessionId}
            onComplete={handleSurveyAComplete}
          />
        )}

        {phase === "taskB" && (
          <TaskB
            sessionId={sessionId}
            conditionOrder={conditionOrder}
            onComplete={handleTaskBComplete}
          />
        )}

        {phase === "surveyB" && (
          <SurveyForm
            taskType="surveyB"
            conditionOrder={conditionOrder}
            sessionId={sessionId}
            onComplete={handleSurveyBComplete}
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
                    value={comparisonAnswer}
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
            onRestart={() => {
              setPhase("intro")
            }}
          />
        )}
      </main>

      <Footer />
    </div>
  )
}