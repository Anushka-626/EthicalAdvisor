"use client"

import { useState } from "react"
import { QuestionCard, Question } from "./question-card"
import { supabase } from "@/lib/supabaseClient"

interface Props {
  questions: Question[]
  taskType: "A" | "surveyA"
  onComplete?: (answers: Record<string, any>) => void
}

export function QuestionnaireForm({
  questions,
  taskType,
  onComplete,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)

  const getSessionId = () => {
    if (typeof window === "undefined") return ""

    let id = localStorage.getItem("session_id")
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem("session_id", id)
    }
    return id
  }

  const handleChange = (id: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [id]: value,
    }))
  }

  const handleSubmit = async () => {
    if (!supabase) {
      alert("Submission is unavailable because Supabase is not configured yet.")
      return
    }

    setLoading(true)

    try {
      const sessionId = getSessionId()

      const payload = {
        session_id: sessionId,
        task_type: taskType,
        input_text: answers,
        ai_output: null,
        created_at: new Date().toISOString(),
      }

      const { error } = await supabase.from("ethics_submissions").insert(payload)

      if (error) {
        throw new Error(error.message || "Submission failed")
      }

      onComplete?.(answers)
      setAnswers({})
    } catch (err) {
      const message = err instanceof Error ? err.message : "Submission failed"
      alert(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {questions.map((q, index) => (
        <QuestionCard
          key={q.id}
          question={q}
          questionNumber={index + 1}
          value={answers[q.id] ?? (q.type === "multiple" ? [] : "")}
          onChange={(val) => handleChange(q.id, val)}
        />
      ))}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full h-11 rounded-lg bg-black text-white font-medium"
      >
        {loading ? "Submitting..." : "Submit"}
      </button>
    </div>
  )
}