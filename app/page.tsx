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


  /**
   * Create or recover the anonymous session ID
   * and determine the participant's condition order.
   */
  useEffect(() => {
    let id =
      localStorage.getItem("session_id")

    if (!id) {
      id = crypto.randomUUID()

      localStorage.setItem(
        "session_id",
        id
      )
    }

    setSessionId(id)


    /**
     * Get the stored condition order.
     *
     * getStoredConditionOrder() checks localStorage
     * first and creates an order if one does not exist.
     */
    const storedOrder =
      getStoredConditionOrder()

    setConditionOrder(
      storedOrder
    )
  }, [])


  /**
   * Start the study.
   *
   * A_B:
   * Task A → Survey A → Task B → Survey B
   *
   * B_A:
   * Task B → Survey B → Task A → Survey A
   */
  const handleStart = () => {
    if (!sessionId) {
      return
    }

    if (conditionOrder === "A_B") {
      setPhase("taskA")
    } else {
      setPhase("taskB")
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }


  /**
   * Condition A completed.
   *
   * Regardless of condition order, the participant
   * must complete Survey A after Task A.
   */
  const handleTaskAComplete = () => {
    setPhase("surveyA")

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }


  /**
   * Survey A completed.
   *
   * If the participant is in A_B order, Task B
   * comes next.
   *
   * If the participant is in B_A order, Task A
   * was completed second, so the study is complete.
   */
  const handleSurveyAComplete = () => {
    if (conditionOrder === "A_B") {
      setPhase("taskB")
    } else {
      setPhase("complete")
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }


  /**
   * Condition B completed.
   *
   * Regardless of condition order, the participant
   * must complete Survey B after Task B.
   */
  const handleTaskBComplete = () => {
    setPhase("surveyB")

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }


  /**
   * Survey B completed.
   *
   * If the participant is in B_A order, Task A
   * comes next.
   *
   * If the participant is in A_B order, the study
   * is complete.
   */
  const handleSurveyBComplete = () => {
    if (conditionOrder === "B_A") {
      setPhase("taskA")
    } else {
      setPhase("complete")
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }


  return (
    <div className="min-h-screen flex flex-col bg-background">

      <Header />

      <main className="flex-1">

        {/* ------------------------------------------------ */}
        {/* INTRO / CONSENT */}
        {/* ------------------------------------------------ */}

        {phase === "intro" && (
          <StudyIntro
            onStart={handleStart}
          />
        )}


        {/* ------------------------------------------------ */}
        {/* CONDITION A */}
        {/* ------------------------------------------------ */}

        {phase === "taskA" && (
          <TaskA
            sessionId={sessionId}
            conditionOrder={conditionOrder}
            onComplete={
              handleTaskAComplete
            }
          />
        )}


        {/* ------------------------------------------------ */}
        {/* SURVEY A */}
        {/* ------------------------------------------------ */}

        {phase === "surveyA" && (
          <SurveyForm
            taskType="surveyA"
            conditionOrder={conditionOrder}
            sessionId={sessionId}
            onComplete={
              handleSurveyAComplete
            }
          />
        )}


        {/* ------------------------------------------------ */}
        {/* CONDITION B */}
        {/* ------------------------------------------------ */}

        {phase === "taskB" && (
          <TaskB
            sessionId={sessionId}
            conditionOrder={conditionOrder}
            onComplete={
              handleTaskBComplete
            }
          />
        )}


        {/* ------------------------------------------------ */}
        {/* SURVEY B */}
        {/* ------------------------------------------------ */}

        {phase === "surveyB" && (
          <SurveyForm
            taskType="surveyB"
            conditionOrder={conditionOrder}
            sessionId={sessionId}
            onComplete={
              handleSurveyBComplete
            }
          />
        )}


        {/* ------------------------------------------------ */}
        {/* COMPLETE */}
        {/* ------------------------------------------------ */}

        {phase === "complete" && (
          <StudyComplete
            onRestart={() => {
              /*
               * Do not create a new participant session.
               * Returning to intro keeps the same session ID
               * and condition order.
               */
              setPhase("intro")
            }}
          />
        )}

      </main>

      <Footer />

    </div>
  )
}