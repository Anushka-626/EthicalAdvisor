"use client"

import { useState } from "react"

import {
  MINDALEERT_BRIEF,
  FIXED_CLARIFICATION_QUESTIONS,
  CLARIFICATION_INSTRUCTIONS,
} from "@/lib/studyConfig"

interface Props {
  sessionId: string
  conditionOrder?: "A_B" | "B_A"
  onComplete: () => void
}

/* -------------------------------------------------------------------------- */
/* Risk register types                                                         */
/* -------------------------------------------------------------------------- */

interface Risk {
  category?: string
  description?: string
  affectedStakeholders?: string[]
  severity?: string
  likelihood?: string
  mitigations?: string[]
}

interface RiskRegister {
  projectTitle?: string
  generatedAt?: string
  mode?: string
  slots?: unknown[]
  risks?: Risk[]
  prioritisedActions?: string[]
}

/* -------------------------------------------------------------------------- */
/* Helper functions                                                            */
/* -------------------------------------------------------------------------- */

function formatCategory(category?: string) {
  if (!category) return "Ethical Risk"

  return category
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    )
}

function formatLevel(level?: string) {
  if (!level) return "Not specified"

  return level
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    )
}

function getSeverityClass(severity?: string) {
  const value = severity?.toLowerCase()

  if (value === "high" || value === "critical") {
    return "bg-red-100 text-red-800 border-red-200"
  }

  if (value === "medium") {
    return "bg-amber-100 text-amber-800 border-amber-200"
  }

  if (value === "low") {
    return "bg-green-100 text-green-800 border-green-200"
  }

  return "bg-muted text-muted-foreground border-border"
}

function getLikelihoodClass(likelihood?: string) {
  const value = likelihood?.toLowerCase()

  if (
    value === "high" ||
    value === "likely" ||
    value === "almost_certain"
  ) {
    return "bg-orange-100 text-orange-800 border-orange-200"
  }

  if (
    value === "medium" ||
    value === "possible"
  ) {
    return "bg-amber-100 text-amber-800 border-amber-200"
  }

  if (
    value === "low" ||
    value === "unlikely"
  ) {
    return "bg-green-100 text-green-800 border-green-200"
  }

  return "bg-muted text-muted-foreground border-border"
}

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

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

  const [riskRegister, setRiskRegister] =
    useState<RiskRegister | null>(null)

  const [showResult, setShowResult] =
    useState(false)

  // ----------------------------------------------------------
  // Handle answer changes
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // Generate final Condition B risk register
  // ----------------------------------------------------------

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
      // ------------------------------------------------------
      // Store answers using the exact fixed question IDs.
      // ------------------------------------------------------

      const clarificationAnswers: Record<
        string,
        string
      > = {}

      FIXED_CLARIFICATION_QUESTIONS.forEach(
        (question, index) => {
          clarificationAnswers[
            question.id
          ] = answers[index]
        }
      )

      // ------------------------------------------------------
      // Generate the final risk register.
      // ------------------------------------------------------

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

            // Same standardized brief for everyone.
            brief: MINDALEERT_BRIEF,

            // Condition B = clarify-first.
            mode: "clarify_first",

            session_id: sessionId,

            task_type: "B",

            condition_order:
              conditionOrder,

            // Fixed questions are already defined by
            // the study design, so no dynamic slot
            // extraction is required here.
            slots: [],

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

      // ------------------------------------------------------
      // Show the generated risk register BEFORE the survey.
      // ------------------------------------------------------

      if (!data?.register) {
        throw new Error(
          "The AI generated a result, but no risk register was returned."
        )
      }

      setRiskRegister(
        data.register as RiskRegister
      )

      setShowResult(true)
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

  // ----------------------------------------------------------
  // Continue to survey after participant has seen
  // the generated risk register.
  // ----------------------------------------------------------

  const handleContinue = () => {
    onComplete()
  }

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------

  return (
    <div className="space-y-8">

      {/* ==================================================== */}
      {/* STANDARDISED PROJECT BRIEF                           */}
      {/* ==================================================== */}

      <div className="border rounded-lg p-6 bg-card space-y-4">

        <h3 className="text-xl font-semibold">
          MindAlert Project Brief
        </h3>

        <div className="text-sm leading-7 whitespace-pre-line text-muted-foreground">
          {MINDALEERT_BRIEF}
        </div>

      </div>

      {/* ==================================================== */}
      {/* CONDITION B — CLARIFY-FIRST                          */}
      {/* ==================================================== */}

      {!showResult && (
        <div className="border rounded-lg p-6 bg-card space-y-8">

          <div className="space-y-3">

            <h3 className="text-xl font-semibold">
              Clarify-first AI analysis
            </h3>

            <p className="text-sm text-muted-foreground">
              Please answer the following three
              questions after reading the project
              brief above.
            </p>

            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {CLARIFICATION_INSTRUCTIONS}
            </p>

          </div>

          {/* ------------------------------------------------ */}
          {/* Fixed clarification questions                    */}
          {/* ------------------------------------------------ */}

          {FIXED_CLARIFICATION_QUESTIONS.map(
            (question, index) => (

              <div
                key={question.id}
                className="space-y-3"
              >

                <label className="text-sm font-medium leading-6 block">
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

          {/* ------------------------------------------------ */}
          {/* Generate button                                  */}
          {/* ------------------------------------------------ */}

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

      {/* ==================================================== */}
      {/* GENERATED RISK REGISTER                             */}
      {/* ==================================================== */}

      {showResult && riskRegister && (
        <div className="border rounded-lg p-6 bg-card space-y-8">

          {/* ------------------------------------------------ */}
          {/* Header                                           */}
          {/* ------------------------------------------------ */}

          <div className="space-y-2">

            <h3 className="text-xl font-semibold">
              Ethical Risk Register
            </h3>

            <p className="text-sm text-muted-foreground">
              Based on the project brief and your
              clarification answers, the AI assistant
              generated the following ethical risk analysis.
            </p>

          </div>

          {/* ------------------------------------------------ */}
          {/* Project information                              */}
          {/* ------------------------------------------------ */}

          <div className="rounded-lg border bg-muted/30 p-5 space-y-2">

            <div className="text-sm text-muted-foreground">
              Project
            </div>

            <div className="text-base font-semibold">
              {riskRegister.projectTitle ||
                "MindAlert"}
            </div>

          </div>

          {/* ------------------------------------------------ */}
          {/* Identified risks                                 */}
          {/* ------------------------------------------------ */}

          <div className="space-y-5">

            <div>

              <h4 className="text-lg font-semibold">
                Identified Risks
                {Array.isArray(
                  riskRegister.risks
                )
                  ? ` (${riskRegister.risks.length})`
                  : ""}
              </h4>

              <p className="text-sm text-muted-foreground mt-1">
                The following ethical risks were
                identified from the project and your
                clarification answers.
              </p>

            </div>

            {Array.isArray(
              riskRegister.risks
            ) &&
            riskRegister.risks.length > 0 ? (

              <div className="space-y-5">

                {riskRegister.risks.map(
                  (risk, index) => (

                    <div
                      key={`${risk.category}-${index}`}
                      className="rounded-lg border bg-background p-5 space-y-5"
                    >

                      {/* Risk heading */}

                      <div className="flex items-start justify-between gap-4">

                        <div className="space-y-1">

                          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Risk {index + 1}
                          </div>

                          <h5 className="text-lg font-semibold">
                            {formatCategory(
                              risk.category
                            )}
                          </h5>

                        </div>

                      </div>

                      {/* Severity / likelihood */}

                      <div className="flex flex-wrap gap-2">

                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${getSeverityClass(
                            risk.severity
                          )}`}
                        >
                          Severity:{" "}
                          {formatLevel(
                            risk.severity
                          )}
                        </span>

                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${getLikelihoodClass(
                            risk.likelihood
                          )}`}
                        >
                          Likelihood:{" "}
                          {formatLevel(
                            risk.likelihood
                          )}
                        </span>

                      </div>

                      {/* Description */}

                      {risk.description && (
                        <div className="space-y-2">

                          <h6 className="text-sm font-semibold">
                            Description
                          </h6>

                          <p className="text-sm text-muted-foreground leading-6">
                            {risk.description}
                          </p>

                        </div>
                      )}

                      {/* Affected stakeholders */}

                      {Array.isArray(
                        risk.affectedStakeholders
                      ) &&
                      risk
                        .affectedStakeholders
                        .length > 0 && (

                        <div className="space-y-2">

                          <h6 className="text-sm font-semibold">
                            Affected Stakeholders
                          </h6>

                          <div className="flex flex-wrap gap-2">

                            {risk.affectedStakeholders.map(
                              (
                                stakeholder,
                                stakeholderIndex
                              ) => (

                                <span
                                  key={
                                    stakeholderIndex
                                  }
                                  className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
                                >
                                  {stakeholder}
                                </span>

                              )
                            )}

                          </div>

                        </div>

                      )}

                      {/* Mitigations */}

                      {Array.isArray(
                        risk.mitigations
                      ) &&
                      risk.mitigations.length > 0 && (

                        <div className="space-y-2">

                          <h6 className="text-sm font-semibold">
                            Possible Mitigations
                          </h6>

                          <ul className="list-disc pl-5 space-y-1.5">

                            {risk.mitigations.map(
                              (
                                mitigation,
                                mitigationIndex
                              ) => (

                                <li
                                  key={
                                    mitigationIndex
                                  }
                                  className="text-sm text-muted-foreground leading-6"
                                >
                                  {mitigation}
                                </li>

                              )
                            )}

                          </ul>

                        </div>

                      )}

                    </div>

                  )
                )}

              </div>

            ) : (

              <div className="rounded-lg border bg-muted/30 p-5">

                <p className="text-sm text-muted-foreground">
                  No ethical risks were returned
                  by the AI assistant.
                </p>

              </div>

            )}

          </div>

          {/* ------------------------------------------------ */}
          {/* Prioritised actions                              */}
          {/* ------------------------------------------------ */}

          {Array.isArray(
            riskRegister.prioritisedActions
          ) &&
          riskRegister.prioritisedActions.length > 0 && (

            <div className="rounded-lg border bg-muted/30 p-5 space-y-4">

              <div>

                <h4 className="text-base font-semibold">
                  Prioritised Actions
                </h4>

                <p className="text-sm text-muted-foreground mt-1">
                  Suggested actions for addressing the
                  identified ethical risks.
                </p>

              </div>

              <ol className="list-decimal pl-5 space-y-2">

                {riskRegister.prioritisedActions.map(
                  (
                    action,
                    index
                  ) => (

                    <li
                      key={index}
                      className="text-sm text-muted-foreground leading-6"
                    >
                      {action}
                    </li>

                  )
                )}

              </ol>

            </div>

          )}

          {/* ------------------------------------------------ */}
          {/* Continue to survey                               */}
          {/* ------------------------------------------------ */}

          <button
            onClick={handleContinue}
            className="w-full h-11 rounded-lg bg-black text-white text-sm font-medium"
          >
            Continue to Survey →
          </button>

        </div>
      )}

    </div>
  )
}