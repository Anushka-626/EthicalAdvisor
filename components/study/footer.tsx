import { cn } from "@/lib/utils"
import Link from "next/link"

interface FooterProps {
  className?: string
}

export function Footer({ className }: FooterProps) {
  return (
    <footer className={cn("w-full bg-foreground text-background mt-auto", className)}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-background/10 flex items-center justify-center">
              <svg 
                viewBox="0 0 24 24" 
                className="w-6 h-6 text-background"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-background text-sm uppercase tracking-wide">
                Universität
              </span>
              <span className="font-bold text-background text-sm uppercase tracking-wide">
                Koblenz
              </span>
            </div>
          </Link>
          
          <p className="text-sm text-background/70">
            © 2026 Universität Koblenz. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
