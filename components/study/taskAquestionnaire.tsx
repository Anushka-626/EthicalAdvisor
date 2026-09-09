"use client"

import { UnguidedLLM } from "./UnguidedLLM"

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
          MindAlert Ethics Advisor Study – Unguided AI Analysis
        </h2>

        <p className="text-sm text-muted-foreground">
          You will now use an AI assistant to analyse the ethical aspects of
          the MindAlert project described above.
        </p>

        <p className="text-sm text-muted-foreground">
          Your goal is to identify and understand the main ethical risks
          associated with the project. You may ask the AI assistant any
          questions that you consider useful and you may ask follow-up
          questions if needed.
        </p>

        <p className="text-sm text-muted-foreground">
          The system will not provide predefined clarification questions in
          this condition. You decide what to ask and how to continue the
          conversation.
        </p>

        <p className="text-sm text-muted-foreground">
          When you believe you have sufficiently explored the ethical risks,
          click "Finish analysis and generate risk register".
        </p>
      </div>

      <UnguidedLLM
        sessionId={sessionId}
        conditionOrder={conditionOrder}
        onComplete={onComplete}
      />
    </div>
  )
}