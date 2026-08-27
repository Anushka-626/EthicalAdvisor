"use client"

import { useState } from "react"
import { QuestionCard } from "./question-card"
import { supabase } from "@/lib/supabaseClient"

interface Props {
  onComplete: () => void
}

const chatgptPrompt = `
You are an ethics analyst.

Analyse the following AI system brief and identify ethical risks.

Please structure your response as:

1. Key stakeholders
2. Ethical risks
3. Severity (low / medium / high)
4. Recommendations

Project brief:

Ethics Advisor Study
Project Brief for Student Activity

Instructions for Students
Please read the following fictional data science project brief carefully.

Note: Do not search for information about this project online. The brief is entirely fictional and designed for this activity. There are no right or wrong answers — we are interested in your honest responses.

Fictional Project Brief

Project Title: MindAlert
AI-Powered Mental Health Risk Detection System for University Students

Project Overview
Organisation: CampusCare Solutions (fictional startup)
Domain: Mental Health & Higher Education
Project Type: Predictive Machine Learning System
Target Users: University administration and counselling services

Background
CampusCare Solutions is a fictional health-tech startup working with universities to improve student wellbeing. The company has proposed developing an AI system called MindAlert that can automatically detect which students are at risk of experiencing a mental health crisis.

The university wants to intervene early and allocate counselling resources more efficiently. Currently, students only receive support after they self-refer or after a crisis has already occurred.

Dataset
The system will be trained on:

• Academic records: grades, attendance, assignment submission patterns, and course dropout rates  
• University login activity: frequency and timing of accessing systems  
• Student health centre records: historical GP and counselling visits  
• Social media activity: publicly available posts scraped from Twitter/X and Instagram  
• Financial aid records: scholarship changes or emergency bursaries  

Modelling Objective
Predict a mental health risk score (Low / Medium / High) each week for students.

Intended Application
• Weekly automated risk list generation  
• High-risk students receive automated wellbeing emails  
• Dashboard shared with university leadership  
• Counsellors prioritise outreach based on risk scores  
• Students are not informed they are being assessed  

Technical Constraints
• Must run on existing university servers  
• Predictions generated within 2 hours weekly  
• System must be explainable  
• No budget for ongoing auditing  

Success Criteria
• Identify 80% of students who will seek counselling within 2 weeks  
• Reduce counsellor workload by 30%  
• Deploy across 5 universities within 12 months  
`

export function TaskA({ onComplete }: Props) {
  const [answer, setAnswer] = useState("")
  const [loading, setLoading] = useState(false)

  const getSessionId = () => {
    let id = localStorage.getItem("session_id")

    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem("session_id", id)
    }

    return id
  }

  const handleSubmit = async () => {
    if (!answer.trim()) {
      alert("Please paste the full ChatGPT response before continuing.")
      return
    }

    if (!supabase) {
      alert("Submission is unavailable because Supabase is not configured yet.")
      return
    }

    setLoading(true)

    try {
      const sessionId = getSessionId()

      const payload = {
          session_id: sessionId,
          task_type: "A",
          mode: "one_shot",
          input_text: chatgptPrompt,
          ai_output: answer,
          clarification_answers: {},
          clarification_questions: [],
          prompt_version: "v1.0",
           created_at: new Date().toISOString(),
   }

      const { error } = await supabase
        .from("ethics_submissions")
        .insert([payload])

      if (error) {
        throw new Error(error.message || "Submission failed")
      }

      onComplete()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Submission failed"
      alert(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">

      <div className="border rounded-lg p-5 bg-muted/30 space-y-3">
        <h2 className="text-lg font-semibold">
          MindAlert Ethics Advisor Study – Task A (ChatGPT Condition)
        </h2>

        <p className="text-sm text-muted-foreground">
          In this task you will use a general-purpose LLM (e.g. ChatGPT)
          to analyse the MindAlert project brief.
        </p>

        <div className="space-y-2 text-sm">
          <p><strong>Step 1:</strong> Open ChatGPT.</p>
          <p><strong>Step 2:</strong> Copy the MindAlert project brief from given below.</p>
          <p><strong>Step 3:</strong> Paste the prompt below into ChatGPT.</p>
          <p><strong>Step 4:</strong> Generate the response.</p>
          <p><strong>Step 5:</strong> Copy the ENTIRE response.</p>
          <p><strong>Step 6:</strong> Paste the response into the box below and submit.</p>
        </div>
      </div>

      <div className="border rounded-lg p-4 bg-background">
        <h3 className="font-medium mb-3">
          Prompt to use in ChatGPT
        </h3>

        <pre className="text-sm whitespace-pre-wrap overflow-auto">
          {chatgptPrompt}
        </pre>
      </div>

      <QuestionCard
        question={{
          id: "chatgpt_output",
          type: "text",
          title: "Paste ChatGPT's complete response below",
          description:
            "Copy and paste the full output generated by ChatGPT. Do not summarise or edit the response.",
          required: true,
          placeholder:
            "Paste ChatGPT's complete response here...",
        }}
        value={answer}
        onChange={(value) =>
          setAnswer(
            typeof value === "string"
              ? value
              : Array.isArray(value)
              ? value.join(", ")
              : String(value)
          )
        }
      />

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full h-11 rounded-lg bg-black text-white font-medium"
      >
        {loading
          ? "Submitting..."
          : "Submit Task A & Continue"}
      </button>

    </div>
  )
}