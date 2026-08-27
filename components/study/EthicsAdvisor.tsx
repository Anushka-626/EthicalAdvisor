"use client"

import { useState } from "react"

import {
  Slot,
  ClarificationQuestion,
  RiskRegister,
} from "@/lib/slots"


type Step =
  | "brief"
  | "clarifying"
  | "loading"
  | "result"


interface EthicsAdvisorProps {
  mode?: "one_shot" | "clarify_first"
  sessionId?: string
  onComplete?: () => void
}


/**
 * Loading indicator.
 */
function Spinner() {

  return (

    <div className="flex flex-col items-center gap-3 py-12">

      <div
        className="
          h-8
          w-8
          animate-spin
          rounded-full
          border-4
          border-black
          border-t-transparent
        "
      />

      <p className="text-sm text-gray-500">
        Analysing ethical risks…
      </p>

    </div>
  )
}


/**
 * Severity badge.
 */
function SeverityBadge({
  level,
}: {
  level: string
}) {

  const colours:
    Record<string, string> = {

      critical:
        "bg-red-100 text-red-800 border-red-200",

      high:
        "bg-orange-100 text-orange-800 border-orange-200",

      medium:
        "bg-yellow-100 text-yellow-800 border-yellow-200",

      low:
        "bg-green-100 text-green-800 border-green-200",
    }


  return (

    <span
      className={`
        rounded
        border
        px-2
        py-0.5
        text-xs
        font-semibold
        uppercase
        ${
          colours[level] ??
          "bg-gray-100 text-gray-700 border-gray-200"
        }
      `}
    >
      {level}
    </span>
  )
}


/**
 * Ethics Advisor
 *
 * Task B = clarify-first condition.
 *
 * Flow:
 *
 * Brief
 *   ↓
 * LLM slot extraction
 *   ↓
 * Missing information
 *   ↓
 * Up to 3 clarification questions
 *   ↓
 * Student answers
 *   ↓
 * LLM risk register
 *   ↓
 * Supabase
 */
export function EthicsAdvisor({
  mode = "clarify_first",
  sessionId,
  onComplete,
}: EthicsAdvisorProps) {


  const [step, setStep] =
    useState<Step>("brief")


  const [brief, setBrief] =
    useState("")


  const [slots, setSlots] =
    useState<Slot[]>([])


  const [questions, setQuestions] =
    useState<
      ClarificationQuestion[]
    >([])


  const [answers, setAnswers] =
    useState<
      Record<string, string>
    >({})


  const [register, setRegister] =
    useState<RiskRegister | null>(
      null
    )


  const [error, setError] =
    useState<string | null>(
      null
    )


  /**
   * Resolve participant/session ID.
   *
   * We use the supplied ID if available.
   * Otherwise use localStorage.
   */
  function resolveSessionId(): string {

    if (sessionId) {
      return sessionId
    }


    if (
      typeof window ===
      "undefined"
    ) {
      return ""
    }


    let id =
      localStorage.getItem(
        "session_id"
      )


    if (!id) {

      id =
        crypto.randomUUID()

      localStorage.setItem(
        "session_id",
        id
      )
    }


    return id
  }


  /**
   * STEP 1
   *
   * Submit project brief.
   *
   * In clarify-first mode:
   *
   * brief
   *   ↓
   * extract_slots
   *   ↓
   * clarification questions
   */
  async function handleBriefSubmit() {

    if (!brief.trim()) {

      setError(
        "Please enter the project brief."
      )

      return
    }


    setError(null)

    setStep("loading")


    try {

      /*
       * TASK B:
       *
       * Ask the LLM to identify
       * contextual information.
       */
      if (
        mode ===
        "clarify_first"
      ) {

        const res =
          await fetch(
            "/api/analyze",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({

                  action:
                    "extract_slots",

                  brief:
                    brief.trim(),

                  session_id:
                    resolveSessionId(),

                  task_type:
                    "B",
                }),
            }
          )


        const data =
          await res.json()


        if (!res.ok) {

          throw new Error(
            data.error ??
              "Unable to analyse the brief."
          )
        }


        const extractedSlots:
          Slot[] =
          Array.isArray(
            data.slots
          )
            ? data.slots
            : []


        const clarificationQuestions:
          ClarificationQuestion[] =
          Array.isArray(
            data.clarificationQuestions
          )
            ? data.clarificationQuestions
            : []


        setSlots(
          extractedSlots
        )


        setQuestions(
          clarificationQuestions
        )


        /*
         * If there are no missing slots,
         * generate immediately.
         */
        if (
          clarificationQuestions.length ===
          0
        ) {

          await handleGenerate(
            extractedSlots,
            {}
          )

        } else {

          setStep(
            "clarifying"
          )
        }


        return
      }


      /*
       * This branch is retained for
       * completeness if EthicsAdvisor
       * is ever used in one-shot mode.
       */
      await handleGenerate(
        [],
        {}
      )

    } catch (e) {

      const message =
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again."


      setError(message)

      setStep("brief")
    }
  }


  /**
   * STEP 2
   *
   * Submit answers to clarification
   * questions.
   */
  async function handleClarifySubmit() {

    /*
     * Check that every displayed
     * clarification question has
     * an answer.
     */
    const unanswered =
      questions.some(
        (question) =>
          !answers[
            question.question
          ]?.trim()
      )


    if (unanswered) {

      setError(
        "Please answer all clarification questions before continuing."
      )

      return
    }


    setError(null)

    setStep("loading")


    await handleGenerate(
      slots,
      answers
    )
  }


  /**
   * STEP 3
   *
   * Generate final risk register.
   *
   * The API route:
   *
   * 1. receives slots
   * 2. receives clarification answers
   * 3. calls Hugging Face
   * 4. stores the result in Supabase
   */
  async function handleGenerate(
    resolvedSlots: Slot[],
    resolvedAnswers:
      Record<string, string>
  ) {

    try {

      const res =
        await fetch(
          "/api/analyze",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({

                action:
                  "generate",

                brief:
                  brief.trim(),

                mode,

                session_id:
                  resolveSessionId(),

                task_type:
                  "B",

                slots:
                  resolvedSlots,

                clarificationAnswers:
                  resolvedAnswers,
              }),
          }
        )


      const data =
        await res.json()


      if (!res.ok) {

        throw new Error(
          data.error ??
            "Unable to generate the risk register."
        )
      }


      if (
        !data.register
      ) {

        throw new Error(
          "The LLM did not return a risk register."
        )
      }


      setRegister(
        data.register
      )


      setStep("result")

    } catch (e) {

      const message =
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again."


      setError(message)


      if (
        mode ===
          "clarify_first" &&
        slots.length > 0
      ) {

        setStep(
          "clarifying"
        )

      } else {

        setStep("brief")
      }
    }
  }


  /**
   * STEP: brief
   */
  if (
    step === "brief"
  ) {

    return (

      <div className="space-y-4">

        <div>

          <label
            className="
              block
              text-sm
              font-medium
              text-gray-700
              mb-1
            "
          >
            Describe your data science
            project
          </label>


          <p
            className="
              text-xs
              text-gray-400
              mb-2
            "
          >
            Include the dataset, what
            the model predicts, and how
            outputs will be used.
          </p>


          <textarea
            className="
              w-full
              rounded-lg
              border
              border-gray-300
              p-3
              text-sm
              min-h-[160px]
              focus:outline-none
              focus:ring-2
              focus:ring-black
              resize-none
            "

            placeholder="
              e.g. We are building a
              student wellbeing prediction
              system using academic records,
              health data, and social media
              activity...
            "

            value={brief}

            onChange={(e) =>
              setBrief(
                e.target.value
              )
            }
          />

        </div>


        {error && (

          <div
            className="
              rounded-lg
              bg-red-50
              border
              border-red-200
              p-3
            "
          >

            <p
              className="
                text-sm
                text-red-700
              "
            >
              {error}
            </p>

          </div>
        )}


        <button
          onClick={
            handleBriefSubmit
          }

          disabled={
            !brief.trim()
          }

          className="
            w-full
            h-11
            rounded-lg
            bg-black
            text-white
            text-sm
            font-medium
            disabled:opacity-40
            disabled:cursor-not-allowed
          "
        >
          {mode ===
          "clarify_first"
            ? "Analyse Brief →"
            : "Generate Risk Register"}
        </button>

      </div>
    )
  }


  /**
   * STEP: loading
   */
  if (
    step === "loading"
  ) {

    return <Spinner />
  }


  /**
   * STEP: clarification
   */
  if (
    step === "clarifying"
  ) {

    return (

      <div className="space-y-6">

        <div
          className="
            rounded-lg
            bg-blue-50
            border
            border-blue-200
            p-4
          "
        >

          <p
            className="
              text-sm
              font-semibold
              text-blue-900
              mb-1
            "
          >
            A few details are missing
            from your brief
          </p>


          <p
            className="
              text-xs
              text-blue-700
            "
          >
            Your answers will help the
            advisor identify risks specific
            to your project.
          </p>

        </div>


        {questions.map(
          (question, index) => (

            <div
              key={
                question.slotId
              }
              className="space-y-2"
            >

              <label
                className="
                  block
                  text-sm
                  font-medium
                  text-gray-800
                "
              >
                {index + 1}.{" "}
                {question.question}
              </label>


              <textarea
                className="
                  w-full
                  rounded-lg
                  border
                  border-gray-300
                  p-3
                  text-sm
                  min-h-[80px]
                  focus:outline-none
                  focus:ring-2
                  focus:ring-black
                  resize-none
                "

                placeholder="Your answer…"

                value={
                  answers[
                    question.question
                  ] ?? ""
                }

                onChange={(e) =>
                  setAnswers(
                    (previous) => ({
                      ...previous,

                      [question.question]:
                        e.target.value,
                    })
                  )
                }
              />

            </div>
          )
        )}


        {error && (

          <div
            className="
              rounded-lg
              bg-red-50
              border
              border-red-200
              p-3
            "
          >

            <p
              className="
                text-sm
                text-red-700
              "
            >
              {error}
            </p>

          </div>
        )}


        <button
          onClick={
            handleClarifySubmit
          }

          className="
            w-full
            h-11
            rounded-lg
            bg-black
            text-white
            text-sm
            font-medium
          "
        >
          Generate Risk Register
        </button>

      </div>
    )
  }


  /**
   * STEP: result
   */
  if (
    step === "result" &&
    register
  ) {

    return (

      <div className="space-y-6">

        <div
          className="
            border-b
            border-gray-100
            pb-3
          "
        >

          <h2
            className="
              text-base
              font-semibold
              text-gray-900
            "
          >
            {register.projectTitle}
          </h2>


          <p
            className="
              text-xs
              text-gray-400
              mt-0.5
            "
          >

            {register.mode ===
            "clarify_first"
              ? "Clarify-first"
              : "One-shot"}

            {" · "}

            {new Date(
              register.generatedAt
            ).toLocaleString()}

          </p>

        </div>


        <div className="space-y-3">

          <p
            className="
              text-xs
              font-semibold
              text-gray-500
              uppercase
              tracking-wide
            "
          >
            Identified Risks (
            {register.risks.length}
            )
          </p>


          {register.risks.map(
            (risk, index) => (

              <div
                key={index}
                className="
                  rounded-lg
                  border
                  border-gray-200
                  p-4
                  space-y-2
                  bg-white
                "
              >

                <div
                  className="
                    flex
                    items-center
                    justify-between
                    gap-2
                    flex-wrap
                  "
                >

                  <span
                    className="
                      text-sm
                      font-semibold
                      capitalize
                      text-gray-900
                    "
                  >
                    {risk.category}
                  </span>


                  <div
                    className="
                      flex
                      items-center
                      gap-2
                    "
                  >

                    <SeverityBadge
                      level={
                        risk.severity
                      }
                    />


                    <span
                      className="
                        text-xs
                        text-gray-400
                        capitalize
                      "
                    >
                      {risk.likelihood.replace(
                        /_/g,
                        " "
                      )}
                    </span>

                  </div>

                </div>


                <p
                  className="
                    text-sm
                    text-gray-700
                    leading-relaxed
                  "
                >
                  {risk.description}
                </p>


                <p
                  className="
                    text-xs
                    text-gray-500
                  "
                >

                  <span
                    className="font-medium"
                  >
                    Affected:{" "}
                  </span>

                  {risk.affectedStakeholders?.join(
                    ", "
                  ) ?? "Not specified"}

                </p>


                {Array.isArray(
                  risk.mitigations
                ) &&
                  risk.mitigations.length >
                    0 && (

                    <ul
                      className="
                        mt-1
                        space-y-1
                        pt-1
                        border-t
                        border-gray-100
                      "
                    >

                      {risk.mitigations.map(
                        (
                          mitigation,
                          mitigationIndex
                        ) => (

                          <li
                            key={
                              mitigationIndex
                            }
                            className="
                              flex
                              gap-2
                              text-xs
                              text-gray-600
                            "
                          >

                            <span
                              className="
                                text-green-500
                                shrink-0
                                mt-0.5
                              "
                            >
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
          )}

        </div>


        {register
          .prioritisedActions
          .length > 0 && (

          <div
            className="
              rounded-lg
              bg-gray-50
              border
              border-gray-200
              p-4
            "
          >

            <p
              className="
                text-xs
                font-semibold
                text-gray-500
                uppercase
                tracking-wide
                mb-2
              "
            >
              Prioritised Actions
            </p>


            <ol
              className="
                space-y-2
                list-decimal
                list-inside
              "
            >

              {register
                .prioritisedActions
                .map(
                  (
                    action,
                    index
                  ) => (

                    <li
                      key={index}
                      className="
                        text-sm
                        text-gray-700
                        leading-relaxed
                      "
                    >
                      {action}
                    </li>

                  )
                )}

            </ol>

          </div>
        )}


        <button
          onClick={
            onComplete
          }

          className="
            w-full
            h-11
            rounded-lg
            bg-black
            text-white
            text-sm
            font-medium
          "
        >
          Continue to Survey →
        </button>

      </div>
    )
  }


  return null
}