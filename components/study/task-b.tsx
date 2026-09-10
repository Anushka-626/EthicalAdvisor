"use client"

import { EthicsAdvisor } from "./EthicsAdvisor"

interface Props {
  sessionId: string
  conditionOrder: "A_B" | "B_A"
  onComplete: () => void
}

export function TaskB({
  sessionId,
  conditionOrder,
  onComplete,
}: Props) {
  return (
    <div className="space-y-6">

      <div className="border rounded-lg p-5 bg-muted/30 space-y-3">

        <h2 className="text-lg font-semibold">
          MindAlert Ethics Advisor Study – Condition B
        </h2>

        <p className="text-sm text-muted-foreground">
          Read the fixed MindAlert project brief carefully before
          answering the clarification questions.
        </p>

        <p className="text-sm text-muted-foreground">
          In this condition, the ethics advisor first asks you
          three predefined clarification questions about missing
          information in the project description.
        </p>

        <p className="text-sm text-muted-foreground">
          Please answer all three questions based on what you
          think would be appropriate for this project. Your
          answers will be provided to the AI advisor and used
          when generating the final ethical risk register.
        </p>

      </div>

      <EthicsAdvisor
        sessionId={sessionId}
        conditionOrder={conditionOrder}
        onComplete={onComplete}
      />

    </div>
  )
}