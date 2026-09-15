"use client"

import { useState } from "react"

import {
  ConditionOrder,
  MINDALEERT_BRIEF,
} from "@/lib/studyConfig"

interface Props {
  taskType: "surveyA" | "surveyB"
  conditionOrder: ConditionOrder
  sessionId: string
  onComplete: () => void
}

type AnswerValue = number | string

interface SurveyQuestion {
  id: string
  text: string
  type: "scale" | "text"
  minLabel?: string
  maxLabel?: string
}

const commonQuestions: SurveyQuestion[] = [
  {
    id: "educational_value",
    text: "How much did this activity help you understand ethical risks in AI systems?",
    type: "scale",
    minLabel: "1 = Not at all",
    maxLabel: "5 = Very much",
  },
  {
    id: "quality",
    text: "How would you rate the quality of the ethical risk analysis produced in this activity?",
    type: "scale",
    minLabel: "1 = Very poor",
    maxLabel: "5 = Excellent",
  },
  {
    id: "workload",
    text: "How much effort did this activity require from you?",
    type: "scale",
    minLabel: "1 = Very little effort",
    maxLabel: "5 = Very high effort",
  },
  {
    id: "confidence",
    text: "How confident were you in your ethical risk-analysis answers?",
    type: "scale",
    minLabel: "1 = Not at all confident",
    maxLabel: "5 = Very confident",
  },
  {
    id: "usefulness",
    text: "How useful was the AI support for identifying and analysing ethical risks?",
    type: "scale",
    minLabel: "1 = Not useful at all",
    maxLabel: "5 = Very useful",
  },
]

export function SurveyForm({
  taskType,
  conditionOrder,
  sessionId,
  onComplete,
}: Props) {
  const [answers, setAnswers] =
    useState<Record<string, AnswerValue>>({})

  const [submitting, setSubmitting] =
    useState(false)

  const [error, setError] =
    useState<string>("")

  const conditionName =
    taskType === "surveyA"
      ? "Unguided AI Analysis"
      : "Clarify-first AI Analysis"

  // Only condition-specific questions are shown here.
  // The final comparison question is asked after BOTH
  // conditions have been completed.
  const questions = commonQuestions

  const updateAnswer = (
    questionId: string,
    value: AnswerValue
  ) => {
    setAnswers((previous) => ({
      ...previous,
      [questionId]: value,
    }))
  }

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()

    setError("")

    const unanswered = questions.some(
      (question) => {
        const value =
          answers[question.id]

        if (question.type === "text") {
          return (
            typeof value !== "string" ||
            value.trim().length === 0
          )
        }

        return value === undefined
      }
    )

    if (unanswered) {
      setError(
        "Please answer all questions before continuing."
      )
      return
    }

    try {
      setSubmitting(true)

      const response = await fetch(
        "/api/analyze",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            action: "save_survey",
            brief:
              MINDALEERT_BRIEF,
            session_id:
              sessionId,
            task_type:
              taskType,
            condition_name:
              conditionName,
            condition_order:
              conditionOrder,
            answers,
          }),
        }
      )

      if (!response.ok) {
        let message =
          "Failed to save the survey."

        try {
          const data =
            await response.json()

          if (
            data?.error
          ) {
            message =
              data.error
          }
        } catch {
          // Keep default error message.
        }

        throw new Error(
          message
        )
      }

      onComplete()
    } catch (submitError) {
      console.error(
        "SURVEY SUBMISSION ERROR:",
        submitError
      )

      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save the survey. Please try again."
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Post-Task Questionnaire
          </h1>

          <p className="text-muted-foreground">
            Please answer the following questions about:
          </p>

          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="font-medium">
              {conditionName}
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {questions.map(
            (
              question,
              questionIndex
            ) => (
              <div
                key={question.id}
                className="space-y-4 rounded-lg border p-5"
              >
                <div className="space-y-1">
                  <p className="font-medium">
                    {questionIndex + 1}.{" "}
                    {question.text}
                  </p>
                </div>

                {question.type ===
                  "scale" && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>
                        {question.minLabel}
                      </span>

                      <span>
                        {question.maxLabel}
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map(
                        (value) => {
                          const selected =
                            answers[
                              question.id
                            ] === value

                          return (
                            <label
                              key={value}
                              className={`flex cursor-pointer items-center justify-center rounded-md border px-3 py-3 text-sm font-medium transition-colors ${
                                selected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "hover:bg-muted"
                              }`}
                            >
                              <input
                                type="radio"
                                name={
                                  question.id
                                }
                                value={value}
                                checked={
                                  selected
                                }
                                onChange={() =>
                                  updateAnswer(
                                    question.id,
                                    value
                                  )
                                }
                                className="sr-only"
                              />

                              {value}
                            </label>
                          )
                        }
                      )}
                    </div>
                  </div>
                )}

                {question.type ===
                  "text" && (
                  <textarea
                    value={
                      typeof answers[
                        question.id
                      ] === "string"
                        ? (answers[
                            question.id
                          ] as string)
                        : ""
                    }
                    onChange={(
                      event
                    ) =>
                      updateAnswer(
                        question.id,
                        event.target.value
                      )
                    }
                    placeholder="Please explain briefly..."
                    rows={5}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                  />
                )}
              </div>
            )
          )}

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "Saving..."
                : "Continue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}