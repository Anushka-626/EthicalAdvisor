"use client"

import { EthicsAdvisor } from "./EthicsAdvisor"

interface Props {
  sessionId: string
  conditionOrder: "A_B" | "B_A"
  onComplete: () => void
}

export function TaskA({
  sessionId,
  conditionOrder,
  onComplete,
}: Props) {
  return (
    <div className="space-y-6">

      <div className="border rounded-lg p-5 bg-muted/30 space-y-3">

        <h2 className="text-lg font-semibold">
          MindAlert Ethics Advisor Study – Condition A
        </h2>

        <p className="text-sm text-muted-foreground">
          The fixed MindAlert project brief will be analysed
          directly by the ethics advisor.
        </p>

        <p className="text-sm text-muted-foreground">
          In this condition, the advisor generates the ethical
          risk register without asking clarification questions.
        </p>

      </div>

      <EthicsAdvisor
        mode="one_shot"
        sessionId={sessionId}
        conditionOrder={conditionOrder}
        onComplete={onComplete}
      />

    </div>
  )
}