"use client"

import { EthicsAdvisor } from "./EthicsAdvisor"

interface Props {
  onComplete: () => void
}

export function TaskB({ onComplete }: Props) {
  return (
    <div className="space-y-6">
      <EthicsAdvisor onComplete={onComplete} />
    </div>
  )
}
