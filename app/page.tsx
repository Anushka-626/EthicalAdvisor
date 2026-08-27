"use client"

import { useState } from "react"
import { Header } from "@/components/study/header"
import { Footer } from "@/components/study/footer"
import { StudyIntro } from "@/components/study/study-intro"
import { TaskA } from "@/components/study/taskAquestionnaire"
import { StudyComplete } from "@/components/study/study-complete"
import { SurveyForm } from "@/components/study/survey-form"
import { TaskB } from "@/components/study/task-b"

type StudyPhase =
  | "intro"
  | "instructions"
  | "taskA"
  | "surveyA"
  | "taskB"
  | "surveyB"
  | "complete"

export default function Home() {
  const [phase, setPhase] = useState<StudyPhase>("intro")

  const handleStart = () => {
    setPhase("taskA")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleTaskAComplete = () => {
    setPhase("surveyA")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleSurveyAComplete = () => {
    setPhase("taskB")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleTaskBComplete = () => {
    setPhase("surveyB")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleSurveyBComplete = () => {
    setPhase("complete")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">

        {phase === "intro" && (
          <StudyIntro onStart={handleStart} />
        )}

        {phase === "taskA" && (
          <TaskA onComplete={handleTaskAComplete} />
        )}

        {phase === "surveyA" && (
          <SurveyForm
            taskType="surveyA"
            onComplete={handleSurveyAComplete}
          />
        )}

        {phase === "taskB" && (
          <TaskB onComplete={handleTaskBComplete} />
        )}

        {phase === "surveyB" && (
          <SurveyForm
            taskType="surveyB"
            onComplete={handleSurveyBComplete}
          />
        )}

        {phase === "complete" && (
          <StudyComplete onRestart={() => setPhase("intro")} />
        )}

      </main>

      <Footer />
    </div>
  )
}