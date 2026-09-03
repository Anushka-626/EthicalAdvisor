"use client"

import { useEffect, useRef, useState } from "react"

import {
  Slot,
  ClarificationQuestion,
  RiskRegister,
  CLARIFY_FIRST_QUESTIONS,
} from "@/lib/slots"

interface EthicsAdvisorProps {
  mode: "one_shot" | "clarify_first"
  sessionId?: string
  onComplete?: () => void
}

/* -------------------------------------------------------------------------- */
/* MindAlert project brief                                                    */
/* -------------------------------------------------------------------------- */

const MINDALEERT_BRIEF = `
MindAlert is an AI-powered mental health risk detection system being developed
by CampusCare Solutions for use in university settings.

The system is designed to predict the mental health risk level of students
on a weekly basis. It combines multiple sources of student-related data,
including academic records, attendance information, student support
interactions, and other behavioural or engagement indicators.

The model produces a risk score that may be used by university support staff
to identify students who may need additional support.

The intended goal is to enable earlier intervention and improve student
wellbeing by helping support teams identify students who may be at higher risk.

The system will process sensitive information about students and may influence
decisions about which students receive outreach or additional support.

The project is intended to operate within a university environment and will
involve interaction between the AI system and human support staff.

Important details such as exact data collection procedures, consent practices,
the reversibility of decisions, and whether model outputs are reused for
future training or automated processes may require further clarification.
`

/* -------------------------------------------------------------------------- */
/* Participant instructions                                                   */
/* -------------------------------------------------------------------------- */

const PARTICIPANT_INSTRUCTIONS = `
Review the project information carefully and consider the ethical risks that
could arise from the proposed AI system.

Focus on issues such as fairness, privacy, transparency, security and
accountability.

For the clarification-first condition, answer each question based only on
what you understand from the project context and your own reasonable
interpretation.
`

/* -------------------------------------------------------------------------- */
/* Session / condition helpers                                                */
/* -------------------------------------------------------------------------- */

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") {
    return ""
  }

  const existing = localStorage.getItem("ethical_advisor_session_id")

  if (existing) {
    return existing
  }

  const newSessionId = crypto.randomUUID()

  localStorage.setItem(
    "ethical_advisor_session_id",
    newSessionId
  )

  return newSessionId
}

function getConditionOrder(): "A_B" | "B_A" {
  if (typeof window === "undefined") {
    return "A_B"
  }

  const existing = localStorage.getItem(
    "ethical_advisor_condition_order"
  )

  if (existing === "A_B" || existing === "B_A") {
    return existing
  }

  const order = Math.random() < 0.5 ? "A_B" : "B_A"

  localStorage.setItem(
    "ethical_advisor_condition_order",
    order
  )

  return order
}

/* -------------------------------------------------------------------------- */
/* Main component                                                             */
/* -------------------------------------------------------------------------- */

export function EthicsAdvisor({
  mode,
  sessionId,
  onComplete,
}: EthicsAdvisorProps) {
  const [slots, setSlots] = useState<Slot[]>([])

  const [clarificationQuestions, setClarificationQuestions] =
    useState<ClarificationQuestion[]>([])

  const [answers, setAnswers] =
    useState<Record<string, string>>({})

  const [register, setRegister] =
    useState<RiskRegister | null>(null)

  const [loading, setLoading] = useState(false)

  const [extracting, setExtracting] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const [latencyMs, setLatencyMs] =
    useState<number | null>(null)

  const [conditionOrder, setConditionOrder] =
    useState<"A_B" | "B_A">("A_B")

  const [currentSessionId, setCurrentSessionId] =
    useState<string>("")

  const extractionStarted = useRef(false)

  /* ---------------------------------------------------------------------- */
  /* Initialise session + condition order                                  */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const id = sessionId || getOrCreateSessionId()

    setCurrentSessionId(id)

    const order = getConditionOrder()

    setConditionOrder(order)
  }, [sessionId])

  /* ---------------------------------------------------------------------- */
  /* Clarify-first: extract slots once                                      */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (mode !== "clarify_first") {
      return
    }

    if (!currentSessionId) {
      return
    }

    if (extractionStarted.current) {
      return
    }

    extractionStarted.current = true

    async function extractSlots() {
      try {
        setExtracting(true)
        setError(null)

        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "extract_slots",
            brief: MINDALEERT_BRIEF,
            mode: "clarify_first",
            session_id: currentSessionId,
            task_type: "B",
            condition_order: conditionOrder,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Failed to analyse the project brief."
          )
        }

        const extractedSlots: Slot[] =
          Array.isArray(data?.slots)
            ? data.slots
            : []

        setSlots(extractedSlots)

        /*
         * IMPORTANT:
         *
         * The experimental questions are fixed.
         * We do NOT use questions dynamically selected
         * by the LLM.
         */

        setClarificationQuestions(
          CLARIFY_FIRST_QUESTIONS
        )
      } catch (err) {
        console.error(
          "Slot extraction error:",
          err
        )

        setError(
          err instanceof Error
            ? err.message
            : "Failed to prepare clarification questions."
        )
      } finally {
        setExtracting(false)
      }
    }

    extractSlots()
  }, [
    mode,
    currentSessionId,
    conditionOrder,
  ])

  /* ---------------------------------------------------------------------- */
  /* Update clarification answer                                           */
  /* ---------------------------------------------------------------------- */

  function handleAnswerChange(
    slotId: string,
    value: string
  ) {
    setAnswers((previous) => ({
      ...previous,
      [slotId]: value,
    }))
  }

  /* ---------------------------------------------------------------------- */
  /* Generate risk register                                                 */
  /* ---------------------------------------------------------------------- */

  async function handleGenerate() {
    try {
      setError(null)

      /* -------------------------------------------------------------- */
      /* Validate clarification answers                                  */
      /* -------------------------------------------------------------- */

      if (mode === "clarify_first") {
        const missingAnswers =
          clarificationQuestions.filter(
            (question) =>
              !answers[question.slotId] ||
              answers[question.slotId].trim() === ""
          )

        if (missingAnswers.length > 0) {
          setError(
            "Please answer all clarification questions before generating the risk register."
          )

          return
        }
      }

      setLoading(true)

      const startTime = performance.now()

      /* -------------------------------------------------------------- */
      /* ONE-SHOT                                                       */
      /* -------------------------------------------------------------- */

      if (mode === "one_shot") {
        const response = await fetch(
          "/api/analyze",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action: "generate",

              brief: MINDALEERT_BRIEF,

              mode: "one_shot",

              session_id: currentSessionId,

              task_type: "A",

              condition_order: conditionOrder,

              /*
               * IMPORTANT:
               *
               * One-shot must not perform slot extraction.
               * The brief goes directly to the final
               * risk-register generation.
               */

              slots: [],

              clarificationAnswers: {},
            }),
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Failed to generate the risk register."
          )
        }

        const endTime = performance.now()

        setLatencyMs(
          typeof data?.latencyMs === "number"
            ? data.latencyMs
            : Math.round(endTime - startTime)
        )

        setRegister(data.register)

        /*
         * IMPORTANT:
         *
         * Do NOT call onComplete() here.
         *
         * The participant must first see the
         * generated risk register.
         */

        return
      }

      /* -------------------------------------------------------------- */
      /* CLARIFY-FIRST                                                  */
      /* -------------------------------------------------------------- */

      const response = await fetch(
        "/api/analyze",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "generate",

            brief: MINDALEERT_BRIEF,

            mode: "clarify_first",

            session_id: currentSessionId,

            task_type: "B",

            condition_order: conditionOrder,

            /*
             * Slots extracted during the first
             * clarification step.
             */

            slots,

            /*
             * Answers provided by the participant.
             */

            clarificationAnswers: answers,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to generate the risk register."
        )
      }

      const endTime = performance.now()

      setLatencyMs(
        typeof data?.latencyMs === "number"
          ? data.latencyMs
          : Math.round(endTime - startTime)
      )

      setRegister(data.register)

      /*
       * Do NOT navigate to the survey yet.
       * The participant must review the risk register
       * first.
       */
    } catch (err) {
      console.error(
        "Risk register generation error:",
        err
      )

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while generating the risk register."
      )
    } finally {
      setLoading(false)
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Continue to survey                                                     */
  /* ---------------------------------------------------------------------- */

  function handleContinueToSurvey() {
    if (!register) {
      return
    }

    onComplete?.()
  }

  /* ---------------------------------------------------------------------- */
  /* Severity helpers                                                       */
  /* ---------------------------------------------------------------------- */

  function getSeverityClasses(
    severity: string
  ) {
    switch (severity?.toLowerCase()) {
      case "low":
        return {
          badge:
            "bg-green-100 text-green-800 border-green-300",
          border:
            "border-green-300",
        }

      case "medium":
        return {
          badge:
            "bg-yellow-100 text-yellow-800 border-yellow-300",
          border:
            "border-yellow-300",
        }

      case "high":
        return {
          badge:
            "bg-orange-100 text-orange-800 border-orange-300",
          border:
            "border-orange-300",
        }

      case "critical":
        return {
          badge:
            "bg-red-100 text-red-800 border-red-300",
          border:
            "border-red-300",
        }

      default:
        return {
          badge:
            "bg-gray-100 text-gray-800 border-gray-300",
          border:
            "border-gray-300",
        }
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Error                                                                  */
  /* ---------------------------------------------------------------------- */

  if (error) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h2 className="mb-2 text-lg font-semibold text-red-800">
            Something went wrong
          </h2>

          <p className="text-sm text-red-700">
            {error}
          </p>

          <button
            type="button"
            onClick={() => {
              setError(null)
            }}
            className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  /* ---------------------------------------------------------------------- */
  /* RISK REGISTER RESULT                                                   */
  /* ---------------------------------------------------------------------- */

  if (register) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        {/* Header -------------------------------------------------------- */}

        <div className="mb-8">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
              {mode === "one_shot"
                ? "Condition A — One-shot"
                : "Condition B — Clarify-first"}
            </span>

            {latencyMs !== null && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                Analysis time:{" "}
                {Math.round(latencyMs)} ms
              </span>
            )}
          </div>

          <h1 className="text-3xl font-bold text-gray-900">
            Ethical Risk Register
          </h1>

          <p className="mt-2 text-gray-600">
            Please review the generated ethical risk
            analysis carefully before continuing to
            the survey.
          </p>
        </div>

        {/* Project ------------------------------------------------------- */}

        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Project
          </h2>

          <p className="mt-2 text-gray-700">
            {register.projectTitle}
          </p>
        </div>

        {/* Severity legend ---------------------------------------------- */}

        <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">
            Severity levels
          </h2>

          <div className="flex flex-wrap gap-3">
            {[
              "low",
              "medium",
              "high",
              "critical",
            ].map((severity) => {
              const classes =
                getSeverityClasses(severity)

              return (
                <span
                  key={severity}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase ${classes.badge}`}
                >
                  {severity}
                </span>
              )
            })}
          </div>
        </div>

        {/* Risks --------------------------------------------------------- */}

        <div className="space-y-6">
          {register.risks?.map(
            (risk, index) => {
              const severityClasses =
                getSeverityClasses(
                  risk.severity
                )

              return (
                <div
                  key={`${risk.category}-${index}`}
                  className={`rounded-xl border-2 bg-white p-6 shadow-sm ${severityClasses.border}`}
                >
                  {/* Risk header -------------------------------------- */}

                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase text-blue-800">
                        {risk.category}
                      </span>

                      <h2 className="mt-3 text-xl font-semibold text-gray-900">
                        Risk {index + 1}
                      </h2>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase ${severityClasses.badge}`}
                      >
                        Severity:{" "}
                        {risk.severity}
                      </span>

                      <span className="rounded-full border border-gray-300 bg-gray-100 px-3 py-1 text-xs font-semibold uppercase text-gray-800">
                        Likelihood:{" "}
                        {risk.likelihood}
                      </span>
                    </div>
                  </div>

                  {/* Description ------------------------------------- */}

                  <div className="mb-5">
                    <h3 className="mb-2 text-sm font-semibold text-gray-900">
                      Description
                    </h3>

                    <p className="leading-7 text-gray-700">
                      {risk.description}
                    </p>
                  </div>

                  {/* Stakeholders ------------------------------------- */}

                  <div className="mb-5">
                    <h3 className="mb-2 text-sm font-semibold text-gray-900">
                      Affected stakeholders
                    </h3>

                    {risk.affectedStakeholders
                      ?.length > 0 ? (
                      <ul className="list-disc space-y-1 pl-5 text-gray-700">
                        {risk.affectedStakeholders.map(
                          (
                            stakeholder,
                            stakeholderIndex
                          ) => (
                            <li
                              key={
                                stakeholderIndex
                              }
                            >
                              {stakeholder}
                            </li>
                          )
                        )}
                      </ul>
                    ) : (
                      <p className="text-gray-500">
                        No stakeholders specified.
                      </p>
                    )}
                  </div>

                  {/* Mitigations -------------------------------------- */}

                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-gray-900">
                      Possible mitigations
                    </h3>

                    {risk.mitigations
                      ?.length > 0 ? (
                      <ul className="list-disc space-y-1 pl-5 text-gray-700">
                        {risk.mitigations.map(
                          (
                            mitigation,
                            mitigationIndex
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
                    ) : (
                      <p className="text-gray-500">
                        No mitigations specified.
                      </p>
                    )}
                  </div>
                </div>
              )
            }
          )}
        </div>

        {/* Prioritised actions ------------------------------------------ */}

        {register.prioritisedActions?.length >
          0 && (
          <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Prioritised actions
            </h2>

            <ol className="list-decimal space-y-2 pl-5 text-gray-700">
              {register.prioritisedActions.map(
                (action, index) => (
                  <li key={index}>{action}</li>
                )
              )}
            </ol>
          </div>
        )}

        {/* Continue button ---------------------------------------------- */}

        <div className="mt-10 flex justify-end border-t border-gray-200 pt-6">
          <button
            type="button"
            onClick={
              handleContinueToSurvey
            }
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Continue to Survey
          </button>
        </div>
      </div>
    )
  }

  /* ---------------------------------------------------------------------- */
  /* CLARIFY-FIRST SCREEN                                                   */
  /* ---------------------------------------------------------------------- */

  if (mode === "clarify_first") {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        {/* Header -------------------------------------------------------- */}

        <div className="mb-8">
          <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800">
            Condition B — Clarify-first
          </span>

          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            Ethical Risk Analysis
          </h1>

          <p className="mt-3 leading-7 text-gray-600">
            {PARTICIPANT_INSTRUCTIONS}
          </p>
        </div>

        {/* Project brief ------------------------------------------------ */}

        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            MindAlert Project Brief
          </h2>

          <div className="whitespace-pre-line leading-7 text-gray-700">
            {MINDALEERT_BRIEF}
          </div>
        </div>

        {/* Loading extraction ------------------------------------------ */}

        {extracting ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />

              <p className="text-sm text-blue-800">
                Preparing clarification
                questions...
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Clarification questions ------------------------------- */}

            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Please provide some additional
                  information
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Answer all three questions before
                  generating the ethical risk register.
                </p>
              </div>

              {clarificationQuestions.map(
                (question, index) => (
                  <div
                    key={question.slotId}
                    className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
                  >
                    <label
                      htmlFor={`question-${question.slotId}`}
                      className="block"
                    >
                      <span className="text-sm font-semibold text-gray-900">
                        {index + 1}.{" "}
                        {question.question}
                      </span>
                    </label>

                    <textarea
                      id={`question-${question.slotId}`}
                      value={
                        answers[
                          question.slotId
                        ] || ""
                      }
                      onChange={(event) =>
                        handleAnswerChange(
                          question.slotId,
                          event.target.value
                        )
                      }
                      rows={5}
                      className="mt-4 w-full rounded-lg border border-gray-300 p-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      placeholder="Enter your answer..."
                    />
                  </div>
                )
              )}
            </div>

            {/* Generate ------------------------------------------------ */}

            <div className="mt-8 flex justify-end">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Generating risk register..."
                  : "Generate Risk Register"}
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  /* ---------------------------------------------------------------------- */
  /* ONE-SHOT SCREEN                                                        */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      {/* Header ---------------------------------------------------------- */}

      <div className="mb-8">
        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
          Condition A — One-shot
        </span>

        <h1 className="mt-4 text-3xl font-bold text-gray-900">
          Ethical Risk Analysis
        </h1>

        <p className="mt-3 leading-7 text-gray-600">
          {PARTICIPANT_INSTRUCTIONS}
        </p>
      </div>

      {/* Project brief -------------------------------------------------- */}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          MindAlert Project Brief
        </h2>

        <div className="whitespace-pre-line leading-7 text-gray-700">
          {MINDALEERT_BRIEF}
        </div>
      </div>

      {/* Generate ------------------------------------------------------- */}

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !currentSessionId}
          className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Generating risk register..."
            : "Generate Risk Register"}
        </button>
      </div>
    </div>
  )
}