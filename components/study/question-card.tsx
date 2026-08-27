"use client"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type QuestionType = "single" | "multiple" | "text" | "scale" | "select"

export interface QuestionOption {
  id: string
  label: string
  value: string
}

export interface Question {
  id: string
  type: QuestionType
  title: string
  description?: string
  options?: QuestionOption[]
  required?: boolean
  placeholder?: string
  min?: number
  max?: number
  labels?: { start: string; end: string }
}

interface QuestionCardProps {
  question: Question
  questionNumber?: number
  value: string | string[] | number
  onChange: (value: string | string[] | number) => void
  className?: string
}

export function QuestionCard({ question, questionNumber, value, onChange, className }: QuestionCardProps) {
  const renderQuestionInput = () => {
    switch (question.type) {
      case "select":
        return (
          <Select value={value as string} onValueChange={onChange}>
            <SelectTrigger className="h-11 rounded-lg border-border">
              <SelectValue placeholder={question.placeholder || "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((option) => (
                <SelectItem key={option.id} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case "single":
        return (
          <RadioGroup
            value={value as string}
            onValueChange={onChange}
            className="space-y-2"
          >
            {question.options?.map((option) => (
              <div
                key={option.id}
                className="flex items-center space-x-3"
              >
                <RadioGroupItem value={option.value} id={option.id} className="border-muted-foreground" />
                <Label htmlFor={option.id} className="cursor-pointer text-foreground font-normal">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )

      case "multiple":
        const selectedValues = (value as string[]) || []
        return (
          <div className="space-y-2">
            {question.options?.map((option) => (
              <div
                key={option.id}
                className="flex items-center space-x-3"
              >
                <Checkbox
                  id={option.id}
                  checked={selectedValues.includes(option.value)}
                  onCheckedChange={(checked) => {
                    const newValue = checked
                      ? [...selectedValues, option.value]
                      : selectedValues.filter(v => v !== option.value)
                    onChange(newValue)
                  }}
                  className="border-muted-foreground"
                />
                <Label htmlFor={option.id} className="cursor-pointer text-foreground font-normal">
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        )

      case "text":
        return (
          <Textarea
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder || "Your answer..."}
            className="min-h-[100px] text-base resize-none rounded-lg border-border"
          />
        )

      case "scale":
        const numValue = (value as number) || question.min || 1
        return (
          <div className="space-y-4 pt-2">
            <Slider
              value={[numValue]}
              onValueChange={([v]) => onChange(v)}
              min={question.min || 1}
              max={question.max || 10}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{question.labels?.start || question.min || 1}</span>
              <span className="text-base font-semibold text-primary">{numValue}</span>
              <span>{question.labels?.end || question.max || 10}</span>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <h3 className="text-base font-medium text-foreground leading-relaxed">
          {questionNumber && <span>{questionNumber}. </span>}
          {question.title}
          {question.required && <span className="text-destructive ml-1" aria-label="Required">*</span>}
        </h3>
        {question.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {question.description}
          </p>
        )}
      </div>
      <div className="pt-1">
        {renderQuestionInput()}
      </div>
    </div>
  )
}
