"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, CheckCircle, Shield, Info } from "lucide-react"

interface StudyIntroProps {
  onStart: () => void
}

export function StudyIntro({ onStart }: StudyIntroProps) {
  return (
    <div className="space-y-12">

      {/* HERO SECTION (Page 1: Landing only) */}
      <section className="py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 items-center">

            <div className="space-y-6">
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                Universität Koblenz Study
              </span>

              <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight text-balance">
                Ethics Evaluation of <span className="text-primary">AI Systems</span>
              </h1>

              <div className="text-lg text-muted-foreground leading-relaxed max-w-lg text-pretty">
                <ul className="space-y-3 list-disc list-inside">
                  <li>
                    I understand that my responses and interaction data will be collected through the online study platform and may be stored and processed using secure cloud-based services for hosting, database storage, analytics, and AI-assisted processing.
                  </li>

                  <li>
                    My data will be stored under an anonymous session identifier and will not include my name, email address, student ID, or other direct personal identifiers unless I choose to include them in free-text responses.
                  </li>

                  <li>
                    I agree that my anonymised responses may be used in aggregated form for research purposes, including academic papers, conference presentations, conference proceedings, and anonymised research datasets.
                  </li>

                  <li>
                    I understand that I should not include my name, email address, student ID, or any other identifying information in my answers.
                  </li>

                  <li>
                    I understand that free-text responses may be processed by external cloud-based services as part of the study workflow.
                  </li>
                </ul>
              </div>

              <div className="flex flex-wrap gap-4">
                <Button
                  onClick={onStart}
                  size="lg"
                  className="h-12 px-6 rounded-lg"
                >
                  Begin Study
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 px-6 rounded-lg"
                >
                  Study Information
                </Button>
              </div>
            </div>

            {/* RIGHT ILLUSTRATION — unchanged */}
            <div className="hidden lg:flex justify-center">
              <div className="relative w-80 h-80">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl" />
                <div className="relative w-full h-full flex items-center justify-center">
                  {/* unchanged SVG */}
                  <svg viewBox="0 0 200 200" className="w-64 h-64 text-primary" fill="none" aria-hidden="true">
                    <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="2" opacity="0.2" />
                    <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                    <circle cx="100" cy="100" r="40" fill="currentColor" opacity="0.1" />
                    <g transform="translate(70, 60)">
                      <rect x="0" y="20" width="60" height="40" rx="4" fill="currentColor" opacity="0.3" />
                      <rect x="5" y="25" width="50" height="30" rx="2" fill="white" />
                      <circle cx="30" cy="10" r="15" fill="currentColor" opacity="0.4" />
                      <circle cx="30" cy="10" r="10" fill="white" />
                      <path d="M25 8 L28 12 L35 6" stroke="currentColor" strokeWidth="2" fill="none" />
                    </g>
                  </svg>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* INFO CARDS (Page 1 → minimal framing only) */}
      <section className="bg-secondary/30 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-3 gap-6">

            <Card className="border-0 bg-card shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                    <Clock className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Duration</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Approximately 10 minutes
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-card shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">No Right Answers</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      We are interested in your experience
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-card shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                    <Shield className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Privacy</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Anonymous and GDPR-compliant
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </section>

      {/* FINAL CTA (ONLY transition to Page 2) */}
      <section className="py-8" id="study">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="border bg-card shadow-sm">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Start the Study
              </h2>

              <p className="text-muted-foreground mb-6">
                By clicking below, you will proceed to the instructions page where the study tasks are explained.
              </p>

              <Button
                onClick={onStart}
                size="lg"
                className="w-full sm:w-auto h-12 px-8 rounded-lg"
              >
                Continue
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

    </div>
  )
}