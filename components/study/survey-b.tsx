"use client"

import { SurveyForm } from "./survey-form"

export function SurveyB({
  onComplete,
  sessionId,
  conditionOrder,
}: {
  onComplete: () => void
  sessionId: string
  conditionOrder: Parameters<typeof SurveyForm>[0]["conditionOrder"]
}) {
  return (
    <SurveyForm
      taskType="surveyB"
      onComplete={onComplete}
      sessionId={sessionId}
      conditionOrder={conditionOrder}
    />
  )
}