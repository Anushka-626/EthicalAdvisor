"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"

interface Props {
  taskType: "surveyA" | "surveyB"
  onComplete?: () => void
}

export function SurveyForm({ taskType, onComplete }: Props) {
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [startTime] = useState(Date.now())

  const getSessionId = () => {
    if (typeof window === "undefined") return ""

    let id = localStorage.getItem("session_id")

    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem("session_id", id)
    }

    return id
  }

  const handleChange = (key: string, value: number) => {
    setAnswers((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const questions = [
    {
      id: "educational_value",
      label:
        "How much did this activity help you understand ethical risks in AI systems?",
      scale: "1 = Not at all, 5 = Very much",
    },
    {
      id: "quality",
      label:
        "How would you rate the quality of the ethical risk analysis produced in this activity?",
      scale: "1 = Very poor, 5 = Excellent",
    },
    {
      id: "workload",
      label:
        "How much effort did this activity require from you?",
      scale: "1 = Very little effort, 5 = Very high effort",
    },
    {
      id: "confidence",
      label:
        "How confident were you in your ethical risk-analysis answers?",
      scale: "1 = Not at all confident, 5 = Very confident",
    },
  ]

  const handleSubmit = async () => {
    // Make sure all questions are answered
    const unanswered = questions.some(
      (question) => answers[question.id] === undefined
    )

    if (unanswered) {
      alert("Please answer all questions before submitting.")
      return
    }

    if (!supabase) {
      console.error("Supabase client is not initialized.")
      alert("Submission failed: database is unavailable.")
      return
    }

    setLoading(true)

    const sessionId = getSessionId()
    const timeSpent = Date.now() - startTime

    const payload = {
      session_id: sessionId,
      task_type: taskType,
      task_input: answers,
      task_output: null,
      task_time_ms: timeSpent,
      survey_b_time_ms: taskType === "surveyB" ? timeSpent : null,
      created_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from("study_responses")
      .insert(payload)

    setLoading(false)

    if (error) {
      console.error(
        "SURVEY ERROR FULL:",
        JSON.stringify(error, null, 2)
      )
      console.error("SURVEY ERROR RAW:", error)

      alert(error.message || "Submission failed")
      return
    }

    alert("Survey submitted!")

    if (onComplete) {
      onComplete()
    }
  }

  return (
    <div className="space-y-8">
      {questions.map((q, index) => (
        <div key={q.id} className="space-y-4">
          <div>
            <p className="text-sm font-medium leading-6">
              {index + 1}. {q.label}
            </p>

            <p className="text-sm text-gray-500 mt-1">
              {q.scale}
            </p>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <label
                key={value}
                className={`flex flex-col items-center justify-center border rounded-lg p-3 cursor-pointer transition ${
                  answers[q.id] === value
                    ? "border-black bg-gray-100"
                    : "border-gray-200 hover:border-gray-400"
                }`}
              >
                <input
                  type="radio"
                  name={q.id}
                  value={value}
                  checked={answers[q.id] === value}
                  onChange={() => handleChange(q.id, value)}
                  className="mb-2"
                />

                <span className="text-sm font-medium">
                  {value}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full h-11 rounded-lg bg-black text-white font-medium disabled:opacity-50"
      >
        {loading ? "Submitting..." : "Submit Survey"}
      </button>
    </div>
  )
}