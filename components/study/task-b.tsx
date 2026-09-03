"use client"

import { EthicsAdvisor } from "./EthicsAdvisor"

import {
  ConditionOrder,
} from "@/lib/studyConfig"


interface Props {
  sessionId: string
  conditionOrder: ConditionOrder
  onComplete: () => void
}


export function TaskB({
  sessionId,
  conditionOrder,
  onComplete,
}: Props) {

  return (

    <div className="space-y-6">

      <div
        className="
          border
          rounded-lg
          p-5
          bg-muted/30
          space-y-3
        "
      >

        <h2 className="text-lg font-semibold">
          MindAlert Ethics Advisor Study – Condition B
        </h2>

        <p className="text-sm text-muted-foreground">
          The same fixed MindAlert project brief will
          be analysed by the same ethics advisor.
        </p>

        <p className="text-sm text-muted-foreground">
          In this condition, the advisor first identifies
          missing information and asks up to three
          clarification questions before generating the
          ethical risk register.
        </p>

      </div>


      <EthicsAdvisor
        mode="clarify_first"
        sessionId={sessionId}
        conditionOrder={conditionOrder}
        onComplete={onComplete}
      />

    </div>
  )
}