"use client"

import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface ProgressBarProps {
  currentStep: number
  totalSteps: number
  className?: string
}

const stepLabels = ["Intro", "About You", "AI Usage", "Experience", "Complete"]

export function ProgressBar({ currentStep, totalSteps, className }: ProgressBarProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNumber = index + 1
          const isCompleted = stepNumber < currentStep
          const isCurrent = stepNumber === currentStep
          
          return (
            <div key={index} className="flex flex-col items-center flex-1">
              <div className="flex items-center w-full">
                {index > 0 && (
                  <div 
                    className={cn(
                      "h-0.5 flex-1 transition-colors duration-300",
                      isCompleted || isCurrent ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 shrink-0",
                    isCompleted 
                      ? "bg-primary text-primary-foreground" 
                      : isCurrent 
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/20" 
                        : "bg-muted text-muted-foreground border-2 border-border"
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    stepNumber
                  )}
                </div>
                {index < totalSteps - 1 && (
                  <div 
                    className={cn(
                      "h-0.5 flex-1 transition-colors duration-300",
                      isCompleted ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
              </div>
              <span 
                className={cn(
                  "text-xs mt-2 text-center hidden sm:block transition-colors",
                  isCurrent ? "text-primary font-medium" : "text-muted-foreground"
                )}
              >
                {stepLabels[index]}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
