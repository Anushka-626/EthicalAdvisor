"use client"

import { useState } from "react"

import { MINDALEERT_BRIEF } from "@/lib/studyConfig"
import { CLARIFY_FIRST_QUESTIONS } from "@/lib/slots"

interface Props {
  sessionId: string
  conditionOrder?: "A_B" | "B_A"
  onComplete: () => void
}

export function EthicsAdvisor({
  sessionId,
  conditionOrder,
  onComplete,
}: Props) {
  const [answers, setAnswers] = useState<string[]>([
    "",
    "",
    "",
  ])

  const [loading, setLoading] = useState(false)

  const handleAnswerChange = (
    index: number,
    value: string
  ) => {
    setAnswers((previous) => {
      const updated = [...previous]

      updated[index] = value

      return updated
    })
  }

  const handleGenerate = async () => {
    if (
      answers.some(
        (answer) => !answer.trim()
      )
    ) {
      alert(
        "Please answer all three clarification questions before continuing."
      )

      return
    }

    setLoading(true)

    try {
      /*
       * The three clarification questions are fixed
       * and identical for every participant.
       *
       * Q1 -> provenance
       * Q2 -> automation
       * Q3 -> consequences
       */
      const clarificationAnswers: Record<
        string,
        string
      > = {}

      CLARIFY_FIRST_QUESTIONS.forEach(
        (question, index) => {
          clarificationAnswers[
            question.slotId
          ] = answers[index]
        }
      )

      const response = await fetch(
        "/api/analyze",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            /*
             * Participant-facing clarify-first
             * generation.
             */
            action: "generate",

            /*
             * Standardised MindAlert brief.
             */
            brief: MINDALEERT_BRIEF,

            /*
             * Condition B is always clarify-first.
             */
            mode: "clarify_first",

            session_id: sessionId,

            task_type: "B",

            condition_order:
              conditionOrder,

            /*
             * No participant-generated slot
             * extraction is used here.
             */
            slots: [],

            /*
             * Answers to the exact three
             * standardised questions.
             */
            clarificationAnswers,
          }),
        }
      )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to generate the ethical risk register."
        )
      }

      /*
       * IMPORTANT:
       *
       * The final risk register is stored by the
       * server but is deliberately NOT shown to
       * the participant.
       *
       * The participant goes directly to the survey.
       */
      onComplete()
    } catch (error) {
      console.error(
        "Condition B error:",
        error
      )

      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      )

      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">

      {/* ===================================================== */}
      {/* STANDARDISED PROJECT BRIEF                            */}
      {/* ===================================================== */}

      <div className="border rounded-lg p-6 bg-card space-y-4">

        <h3 className="text-xl font-semibold">
          MindAlert Project Brief
        </h3>

        <div className="text-sm leading-7 whitespace-pre-line text-muted-foreground">
          {MINDALEERT_BRIEF}
        </div>

      </div>


      {/* ===================================================== */}
      {/* CONDITION B — CLARIFY-FIRST                           */}
      {/* ===================================================== */}

      <div className="border rounded-lg p-6 bg-card space-y-8">

        <div>

          <h3 className="text-xl font-semibold">
            Clarify-first AI analysis
          </h3>

          <p className="text-sm text-muted-foreground mt-2">
            Please answer the following three questions
            after reading the project brief above. These
            questions are fixed for all participants.
          </p>

        </div>


        {CLARIFY_FIRST_QUESTIONS.map(
          (question, index) => (

            <div
              key={question.slotId}
              className="space-y-3"
            >

              <label
                className="text-sm font-medium leading-6 block"
              >
                {index + 1}.{" "}
                {question.question}
              </label>

              <textarea
                value={answers[index]}
                onChange={(event) =>
                  handleAnswerChange(
                    index,
                    event.target.value
                  )
                }
                placeholder="Write your answer here..."
                rows={5}
                disabled={loading}
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />

            </div>

          )
        )}


        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full h-11 rounded-lg bg-black text-white font-medium disabled:opacity-50"
        >
          {loading
            ? "Generating ethical risk register..."
            : "Generate Ethical Risk Register"}
        </button>

      </div>

    </div>
  )
}