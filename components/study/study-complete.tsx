"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, Mail, Home } from "lucide-react"

interface StudyCompleteProps {
  onRestart: () => void
}

export function StudyComplete({ onRestart }: StudyCompleteProps) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-lg mx-auto text-center space-y-8">
        {/* Success Icon with decorations */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-12 h-12 text-accent" aria-hidden="true" />
          </div>
          {/* Decorative elements */}
          <svg className="absolute -top-4 -right-4 w-8 h-8 text-accent/40" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6z" />
          </svg>
          <svg className="absolute -bottom-2 -left-6 w-6 h-6 text-primary/30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
          </svg>
          <svg className="absolute top-0 left-0 w-4 h-4 text-accent/50" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z" />
          </svg>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Thank You!
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed text-pretty">
            Your response has been recorded.<br />
            We really appreciate your time and support.
          </p>
        </div>

        <Card className="border bg-secondary/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-accent" aria-hidden="true" />
              </div>
              <div className="text-left">
                <p className="text-foreground">
                  You will not receive a copy of your responses.<br />
                  If you have any questions, feel free to{" "}
                  <a href="mailto:ai.study@uni-koblenz.de" className="text-primary hover:underline font-medium">
                    contact us
                  </a>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="pt-4">
          <Button 
            onClick={onRestart}
            size="lg" 
            className="h-12 px-8 rounded-lg"
          >
            <Home className="mr-2 w-4 h-4" aria-hidden="true" />
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  )
}
