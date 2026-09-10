"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"

import { MINDALEERT_BRIEF } from "@/lib/studyConfig"

interface Props {
  sessionId: string
  conditionOrder: "A_B" | "B_A"
  onComplete: () => void
}

export function OneShotBaseline({
  sessionId,
  conditionOrder,
  onComplete,
}: Props) {
  const [loading, setLoading] = useState(false)

  const handleGenerateBaseline = async () => {
    if (loading) return

    setLoading(true)

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "generate_baseline",
          brief: MINDALEERT_BRIEF,
          session_id: sessionId,
          condition_order: conditionOrder,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to generate the baseline ethical risk analysis."
        )
      }

      /*
       * IMPORTANT:
       * The one-shot baseline is generated and stored by the server,
       * but its risk register is deliberately NOT displayed.
       *
       * The participant only sees the project brief and this button.
       */

      onComplete()
    } catch (error) {
      console.error("One-shot baseline error:", error)

      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong while generating the baseline."
      )

      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-5 bg-muted/30 space-y-3">
        <h2 className="text-lg font-semibold">
          MindAlert Ethics Advisor Study
        </h2>

        <p className="text-sm text-muted-foreground">
          Please read the fixed MindAlert project brief carefully.
        </p>

        <p className="text-sm text-muted-foreground">
          Before you begin the two study activities, the system will
          generate a one-shot ethical risk analysis of the project.
          This analysis is used as a baseline for the study.
        </p>

        <p className="text-sm text-muted-foreground">
          You will not see the baseline analysis. After it has been
          generated, you will proceed to the first study activity.
        </p>
      </div>

      <div className="border rounded-lg p-6 bg-card space-y-4">
        <h3 className="text-xl font-semibold">
          MindAlert Project Brief
        </h3>

        <div className="text-sm leading-7 whitespace-pre-line text-muted-foreground">
          {MINDALEERT_BRIEF}
        </div>
      </div>

      <div className="border rounded-lg p-6 bg-card space-y-4">
        <p className="text-sm text-muted-foreground">
          When you are ready, click the button below to begin.
        </p>

        <button
          onClick={handleGenerateBaseline}
          disabled={loading}
          className="w-full h-11 rounded-lg bg-black text-white font-medium disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 inline animate-spin" />
              Preparing study activity...
            </>
          ) : (
            "Generate Baseline and Continue"
          )}
        </button>
      </div>
    </div>
  )
}