"use client"

import { useState } from "react"

import { supabase } from "@/lib/supabaseClient"

import {
  ConditionOrder,
} from "@/lib/studyConfig"


interface Props {

  taskType:
    | "surveyA"
    | "surveyB"

  sessionId: string

  conditionOrder:
    ConditionOrder

  onComplete?: () => void
}


export function SurveyForm({
  taskType,
  sessionId,
  conditionOrder,
  onComplete,
}: Props) {

  const [answers, setAnswers] =
    useState<Record<string, number>>({})

  const [loading, setLoading] =
    useState(false)

  const [startTime] =
    useState(Date.now())


  const questions = [

    {
      id: "educational_value",

      label:
        "How much did this activity help you understand ethical risks in AI systems?",

      scale:
        "1 = Not at all, 5 = Very much",
    },

    {
      id: "quality",

      label:
        "How would you rate the quality of the ethical risk analysis produced in this activity?",

      scale:
        "1 = Very poor, 5 = Excellent",
    },

    {
      id: "workload",

      label:
        "How much effort did this activity require from you?",

      scale:
        "1 = Very little effort, 5 = Very high effort",
    },

    {
      id: "confidence",

      label:
        "How confident were you in your ethical risk-analysis answers?",

      scale:
        "1 = Not at all confident, 5 = Very confident",
    },

  ]


  const conditionName =
    taskType === "surveyA"
      ? "Condition A · One-shot"
      : "Condition B · Clarify-first"


  const handleChange = (
    key: string,
    value: number
  ) => {

    setAnswers(
      (previous) => ({
        ...previous,
        [key]: value,
      })
    )
  }


  const handleSubmit = async () => {

    const unanswered =
      questions.some(
        (question) =>
          answers[
            question.id
          ] === undefined
      )


    if (unanswered) {

      alert(
        "Please answer all questions before submitting."
      )

      return
    }


    if (!supabase) {

      console.error(
        "Supabase client is not initialized."
      )

      alert(
        "Submission failed: database is unavailable."
      )

      return
    }


    if (!sessionId) {

      alert(
        "Session ID is missing. Please restart the study."
      )

      return
    }


    setLoading(true)


    const timeSpent =
      Date.now() - startTime


    /**
     * Store the survey using the existing
     * study_responses table.
     *
     * surveyA -> survey_a
     * surveyB -> survey_b
     */
    const payload: Record<string, unknown> = {

      session_id:
        sessionId,

      condition_order:
        conditionOrder,

      task_type:
        taskType,

      task_input:
        answers,

      task_output:
        null,

      task_time_ms:
        timeSpent,

      created_at:
        new Date().toISOString(),

    }


    if (
      taskType === "surveyA"
    ) {

      payload.survey_a =
        answers

      payload.survey_a_time_ms =
        timeSpent

    } else {

      payload.survey_b =
        answers

      payload.survey_b_time_ms =
        timeSpent

    }


    const {
      error,
    } =
      await supabase
        .from("study_responses")
        .insert(
          payload
        )


    setLoading(false)


    if (error) {

      console.error(
        "SURVEY ERROR FULL:",
        JSON.stringify(
          error,
          null,
          2
        )
      )

      alert(
        error.message ||
        "Submission failed"
      )

      return
    }


    alert(
      "Survey submitted!"
    )


    if (onComplete) {

      onComplete()

    }

  }


  return (

    <div className="space-y-8">

      <div
        className="
          rounded-lg
          border
          border-gray-200
          bg-gray-50
          p-5
        "
      >

        <h2
          className="
            text-lg
            font-semibold
            text-gray-900
          "
        >
          {conditionName}
        </h2>

        <p
          className="
            text-sm
            text-gray-500
            mt-1
          "
        >
          Please answer the following questions
          about this activity.
        </p>

      </div>


      {questions.map(
        (
          question,
          index
        ) => (

          <div
            key={question.id}
            className="space-y-4"
          >

            <div>

              <p
                className="
                  text-sm
                  font-medium
                  leading-6
                "
              >
                {index + 1}.{" "}
                {question.label}
              </p>


              <p
                className="
                  text-sm
                  text-gray-500
                  mt-1
                "
              >
                {question.scale}
              </p>

            </div>


            <div
              className="
                grid
                grid-cols-5
                gap-2
              "
            >

              {[1, 2, 3, 4, 5].map(
                (value) => (

                  <label
                    key={value}
                    className={`
                      flex
                      flex-col
                      items-center
                      justify-center
                      border
                      rounded-lg
                      p-3
                      cursor-pointer
                      transition
                      ${
                        answers[
                          question.id
                        ] === value
                          ? "border-black bg-gray-100"
                          : "border-gray-200 hover:border-gray-400"
                      }
                    `}
                  >

                    <input
                      type="radio"
                      name={
                        question.id
                      }
                      value={value}
                      checked={
                        answers[
                          question.id
                        ] === value
                      }
                      onChange={() =>
                        handleChange(
                          question.id,
                          value
                        )
                      }
                      className="mb-2"
                    />


                    <span
                      className="
                        text-sm
                        font-medium
                      "
                    >
                      {value}
                    </span>

                  </label>

                )
              )}

            </div>

          </div>

        )
      )}


      <button
        onClick={
          handleSubmit
        }
        disabled={
          loading
        }
        className="
          w-full
          h-11
          rounded-lg
          bg-black
          text-white
          font-medium
          disabled:opacity-50
        "
      >

        {loading
          ? "Submitting..."
          : "Submit Survey"}

      </button>

    </div>
  )
}