"use client"

import { useState } from "react"
import { MINDALEERT_BRIEF } from "@/lib/studyConfig"
import { CLARIFY_FIRST_QUESTIONS } from "@/lib/slots"

interface Props {
  mode: "one_shot" | "clarify_first"
  sessionId: string
  conditionOrder?: "A_B" | "B_A"
  onComplete: () => void
}

export function EthicsAdvisor({
  mode,
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

  const [result, setResult] = useState<any>(null)

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
       * Use the fixed clarification questions and their
       * predefined slot IDs.
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
          clarificationAnswers[question.slotId] =
            answers[index]
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
            action: "generate",

            /*
             * The same fixed MindAlert brief is used
             * for every participant.
             */
            brief:
              MINDALEERT_BRIEF,

            /*
             * Condition B is always clarify-first.
             */
            mode:
              "clarify_first",

            session_id:
              sessionId,

            task_type:
              "B",

            condition_order:
              conditionOrder,

            /*
             * The backend extracts the slots from
             * the fixed brief. We do not need to send
             * participant-generated slots here.
             */
            slots: [],

            /*
             * Answers are keyed by the fixed slot IDs.
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
          "Failed to generate risk register."
        )
      }

      setResult(
        data.register
      )

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

    } finally {
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
      {/* CLARIFY-FIRST                                         */}
      {/* ===================================================== */}

      {mode === "clarify_first" && !result && (

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

                  {index + 1}. {question.question}

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

      )}


      {/* ===================================================== */}
      {/* RESULT                                                */}
      {/* ===================================================== */}

      {result && (

        <div className="border rounded-lg p-6 bg-card space-y-6">

          <div>

            <h3 className="text-xl font-semibold">
              Ethical Risk Analysis
            </h3>

            <p className="text-sm text-muted-foreground mt-1">
              Your clarification answers have been provided
              to the AI advisor to generate this analysis.
            </p>

          </div>


          <div className="space-y-6">

            {result.risks?.map(
              (risk: any, index: number) => (

                <div
                  key={index}
                  className="border rounded-lg p-5 space-y-3"
                >

                  <div className="flex justify-between">

                    <h4 className="font-semibold">
                      Risk {index + 1}
                    </h4>

                    <span className="text-sm">
                      {risk.category}
                    </span>

                  </div>

                  <p className="text-sm">
                    {risk.description}
                  </p>

                  <p className="text-sm">
                    <strong>
                      Stakeholders:
                    </strong>{" "}
                    {risk.affectedStakeholders?.join(
                      ", "
                    )}
                  </p>

                  <p className="text-sm">
                    <strong>
                      Severity:
                    </strong>{" "}
                    {risk.severity}
                  </p>

                  <p className="text-sm">
                    <strong>
                      Likelihood:
                    </strong>{" "}
                    {risk.likelihood}
                  </p>

                  <div>

                    <strong className="text-sm">
                      Mitigations:
                    </strong>

                    <ul className="list-disc ml-5 text-sm mt-1">

                      {risk.mitigations?.map(
                        (
                          mitigation: string,
                          mitigationIndex: number
                        ) => (

                          <li
                            key={
                              mitigationIndex
                            }
                          >
                            {mitigation}
                          </li>

                        )
                      )}

                    </ul>

                  </div>

                </div>

              )
            )}

          </div>


          <button
            onClick={onComplete}
            className="w-full h-11 rounded-lg bg-black text-white font-medium"
          >
            Continue to Survey
          </button>

        </div>

      )}

    </div>
  )
}