"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"

interface Props {
  taskType: "surveyA" | "surveyB"
  onComplete?: () => void
}

export function SurveyForm({ taskType, onComplete }: Props) {
  const [answers, setAnswers] = useState<Record<string, any>>({})
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

  const handleChange = (key: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleSubmit = async () => {
    setLoading(true)

    const sessionId = getSessionId()
    const timeSpent = Date.now() - startTime

    const payload = {
     task_type: taskType,
     task_input: answers,
     task_output: null,
     task_time_ms: Date.now() - startTime,
     survey_b_time_ms: taskType === "surveyB" ? Date.now() - startTime : null,
    created_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from("study_responses")
      .insert(payload)

    setLoading(false)

    if (error) {
     console.error("SURVEY ERROR FULL:", JSON.stringify(error, null, 2))
     console.error("SURVEY ERROR RAW:", error)

     alert(error.message || "Submission failed")
     return
   }

    alert("Survey submitted!")

    if (onComplete) onComplete()
  }

  return (
    <div className="space-y-6">

      {/* Simple Likert-style survey (edit questions as needed) */}
      {[
  { id: "usefulness", label: "How useful was this for you? (1 = not useful, 5 = very useful)" },
  { id: "confidence", label: "How sure were you about your answers? (1–5)" },
  { id: "workload", label: "How much effort did this feel like? (1 = very easy, 5 = very hard)" },
].map((q) => (
        <div key={q.id} className="space-y-2">
          <label className="text-sm font-medium">{q.label}</label>
          <input
            type="number"
            min={1}
            max={5}
            value={answers[q.id] || ""}
            onChange={(e) => handleChange(q.id, Number(e.target.value))}
            className="w-full border rounded-md p-2"
          />
        </div>
      ))}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full h-11 rounded-lg bg-black text-white font-medium"
      >
        {loading ? "Submitting..." : "Submit Survey"}
      </button>

    </div>
  )
}