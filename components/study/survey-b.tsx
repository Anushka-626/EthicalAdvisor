"use client"

import { SurveyForm } from "./survey-form"

export function SurveyB({ onComplete }: { onComplete: () => void }) {
  return (
    <SurveyForm
      taskType="surveyB"
      onComplete={onComplete}
    />
  )
}