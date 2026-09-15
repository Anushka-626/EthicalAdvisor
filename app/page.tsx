"use client"

import { useEffect, useState } from "react"

import { Header } from "@/components/study/header"
import { Footer } from "@/components/study/footer"
import { StudyIntro } from "@/components/study/study-intro"

import { TaskA } from "@/components/study/taskAquestionnaire"
import { TaskB } from "@/components/study/task-b"

import { SurveyForm } from "@/components/study/survey-form"
import { StudyComplete } from "@/components/study/study-complete"

import {
  ConditionOrder,
  getStoredConditionOrder,
} from "@/lib/studyConfig"

type StudyPhase =
  | "intro"
  | "taskA"
  | "surveyA"
  | "taskB"
  | "surveyB"
  | "complete"

export default function Home() {
  const [phase, setPhase] =
    useState<StudyPhase>("intro")

  const [sessionId, setSessionId] =
    useState<string>("")

  const [conditionOrder, setConditionOrder] =
    useState<ConditionOrder>("A_B")

  useEffect(() => {
    let id = localStorage.getItem("session_id")

    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem("session_id", id)
    }

    setSessionId(id)

    const storedOrder =
      getStoredConditionOrder()

    setConditionOrder(storedOrder)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  const handleStart = () => {
    if (!sessionId) return

    /*
     * The one-shot baseline is generated separately on the backend
     * and is NOT shown to participants.
     *
     * Experimental flow:
     *
     * A_B:
     *   Unguided AI Analysis
     *   -> Survey
     *   -> Clarify-first AI Analysis
     *   -> Survey
     *
     * B_A:
     *   Clarify-first AI Analysis
     *   -> Survey
     *   -> Unguided AI Analysis
     *   -> Survey
     */
    if (conditionOrder === "A_B") {
      setPhase("taskA")
    } else {
      setPhase("taskB")
    }

    scrollToTop()
  }

  const handleTaskAComplete = () => {
    setPhase("surveyA")
    scrollToTop()
  }

  const handleSurveyAComplete = () => {
    /*
     * If the participant started with A,
     * continue to B.
     *
     * If the participant started with B,
     * A is the second condition and the study ends.
     */
    if (conditionOrder === "A_B") {
      setPhase("taskB")
    } else {
      setPhase("complete")
    }

    scrollToTop()
  }

  const handleTaskBComplete = () => {
    setPhase("surveyB")
    scrollToTop()
  }

  const handleSurveyBComplete = () => {
    /*
     * If the participant started with B,
     * continue to A.
     *
     * If the participant started with A,
     * B is the second condition and the study ends.
     */
    if (conditionOrder === "B_A") {
      setPhase("taskA")
    } else {
      setPhase("complete")
    }

    scrollToTop()
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {phase === "intro" && (
          <StudyIntro
            onStart={handleStart}
          />
        )}

        {phase === "taskA" && (
          <TaskA
            sessionId={sessionId}
            conditionOrder={conditionOrder}
            onComplete={handleTaskAComplete}
          />
        )}

        {phase === "surveyA" && (
          <SurveyForm
            taskType="surveyA"
            conditionOrder={conditionOrder}
            sessionId={sessionId}
            onComplete={handleSurveyAComplete}
          />
        )}

        {phase === "taskB" && (
          <TaskB
            sessionId={sessionId}
            conditionOrder={conditionOrder}
            onComplete={handleTaskBComplete}
          />
        )}

        {phase === "surveyB" && (
          <SurveyForm
            taskType="surveyB"
            conditionOrder={conditionOrder}
            sessionId={sessionId}
            onComplete={handleSurveyBComplete}
          />
        )}

        {phase === "complete" && (
          <StudyComplete
            onRestart={() => {
              setPhase("intro")
            }}
          />
        )}
      </main>

      <Footer />
    </div>
  )
}