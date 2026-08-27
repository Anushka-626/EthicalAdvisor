import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabaseClient"
import { llmService } from "@/lib/llm/llmService"
import { selectClarificationQuestions, Slot } from "@/lib/slots"

const PROMPT_VERSION = "v1.0"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      action = "generate",
      brief,
      mode = "one_shot",
      session_id,
      task_type,
      slots: rawSlots,
      clarificationAnswers,
    } = body

    // ------------------------------------------------------------
    // Validate input
    // ------------------------------------------------------------

    if (!brief?.trim()) {
      return NextResponse.json(
        {
          error: "brief is required",
        },
        { status: 400 }
      )
    }

    // ============================================================
    // ACTION 1: EXTRACT SLOTS
    // ============================================================

    if (action === "extract_slots") {
      const startTime = Date.now()

      const { slots } = await llmService.extractSlots({
        brief,
      })

      const clarificationQuestions =
        selectClarificationQuestions(slots, 3)

      const latencyMs = Date.now() - startTime

      return NextResponse.json({
        slots,
        clarificationQuestions,
        latencyMs,
      })
    }

    // ============================================================
    // ACTION 2: GENERATE RISK REGISTER
    // ============================================================

    if (action === "generate") {
      let slots: Slot[]

      // ----------------------------------------------------------
      // ONE-SHOT MODE
      // ----------------------------------------------------------

      if (mode === "one_shot") {
        const extractionStartTime = Date.now()

        const extracted =
          await llmService.extractSlots({
            brief,
          })

        slots = extracted.slots

        console.log(
          `[LLM] Slot extraction completed in ${
            Date.now() - extractionStartTime
          } ms`
        )
      }

      // ----------------------------------------------------------
      // CLARIFY-FIRST MODE
      // ----------------------------------------------------------

      else if (mode === "clarify_first") {
        if (!rawSlots) {
          return NextResponse.json(
            {
              error:
                "slots are required for clarify_first mode",
            },
            { status: 400 }
          )
        }

        slots = rawSlots as Slot[]
      }

      // ----------------------------------------------------------
      // UNKNOWN MODE
      // ----------------------------------------------------------

      else {
        return NextResponse.json(
          {
            error: `Unknown mode: ${mode}`,
          },
          { status: 400 }
        )
      }

      // ==========================================================
      // DETERMINE MISSING SLOTS
      // ==========================================================

      const missingSlots = slots
        .filter((slot) => slot.missing)
        .map((slot) => slot.id)

      // ==========================================================
      // GENERATE CLARIFICATION QUESTIONS
      // ==========================================================

      const clarificationQuestions =
        selectClarificationQuestions(slots, 3)

      // ==========================================================
      // GENERATE FINAL ETHICAL RISK REGISTER
      // ==========================================================

      const startTime = Date.now()

      const { register } =
        await llmService.generateRiskRegister({
          brief,
          mode,
          slots,
          clarificationAnswers:
            clarificationAnswers ?? {},
        })

      const latencyMs = Date.now() - startTime

      console.log(
        `[LLM] Risk register generated in ${latencyMs} ms`
      )

      // ==========================================================
      // CHECK SUPABASE
      // ==========================================================

      if (!supabase) {
        return NextResponse.json(
          {
            error: "Supabase not configured",
          },
          { status: 500 }
        )
      }

      // ==========================================================
      // SAVE COMPLETE EXPERIMENT RECORD
      // ==========================================================

      const { error: insertError } =
        await supabase
          .from("ethics_submissions")
          .insert({
            // Participant/session information
            session_id:
              session_id ?? null,

            task_type:
              task_type ?? "B",

            // Original project brief
            input_text:
              brief,

            // IMPORTANT:
            // Saves whether this was one_shot or clarify_first
            mode,

            // Extracted contextual information
            slots,

            // Information that was still missing
            missing_slots:
              missingSlots,

            // Clarification questions
            clarification_questions:
              clarificationQuestions,

            // Participant answers
            clarification_answers:
              clarificationAnswers ?? {},

            // Prompt version
            prompt_version:
              PROMPT_VERSION,

            // LLM generation latency
            latency_ms:
              latencyMs,

            // Final AI output
            ai_output:
              register,
          })

      // ==========================================================
      // SUPABASE ERROR HANDLING
      // ==========================================================

      if (insertError) {
        console.error(
          "[Supabase] Insert error:",
          insertError
        )

        throw new Error(
          `Failed to save ethics submission: ${insertError.message}`
        )
      }

      console.log(
        "[Supabase] Ethics submission saved successfully"
      )

      // ==========================================================
      // RETURN RESULT
      // ==========================================================

      return NextResponse.json({
        register,
        slots,
        missingSlots,
        clarificationQuestions,
        mode,
        latencyMs,
        promptVersion: PROMPT_VERSION,
      })
    }

    // ============================================================
    // UNKNOWN ACTION
    // ============================================================

    return NextResponse.json(
      {
        error: `Unknown action: ${action}`,
      },
      { status: 400 }
    )
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Internal server error"

    console.error(
      "[ethics-advisor]",
      message
    )

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    )
  }
}