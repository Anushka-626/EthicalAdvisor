"use client"

import { useEffect, useState } from "react"

import { Header } from "@/components/study/header"
import { Footer } from "@/components/study/footer"
import { StudyIntro } from "@/components/study/study-intro"

import { OneShotBaseline } from "@/components/study/OneShotBaseline"
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
  | "baseline"
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
     * The one-shot baseline is always generated first.
     * It is not an experimental condition.
     */
    setPhase("baseline")
    scrollToTop()
  }

  const handleBaselineComplete = () => {
    /*
     * After the hidden baseline:
     *
     * A_B -> Unguided first
     * B_A -> Clarify-first first
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
     * A_B:
     * Unguided -> Survey -> Clarify-first
     *
     * B_A:
     * Clarify-first -> Survey -> Unguided
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
     * B_A:
     * Clarify-first -> Survey -> Unguided
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

        {phase === "baseline" && (
          <OneShotBaseline
            sessionId={sessionId}
            conditionOrder={conditionOrder}
            onComplete={handleBaselineComplete}
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