import {
  NextRequest,
  NextResponse,
} from "next/server"

import {
  supabase,
} from "@/lib/supabaseClient"

import {
  llmService,
} from "@/lib/llm/llmService"

import {
  CLARIFY_FIRST_QUESTIONS,
  Slot,
} from "@/lib/slots"


const PROMPT_VERSION = "v1.0"


export async function POST(
  req: NextRequest
) {
  try {
    const body = await req.json()

    const {
      action = "generate",

      brief,

      mode = "one_shot",

      session_id,

      task_type,

      condition_order,

      slots: rawSlots,

      clarificationAnswers,
    } = body


    /* ==========================================================
       BASIC VALIDATION
       ========================================================== */

    if (!brief?.trim()) {
      return NextResponse.json(
        {
          error: "brief is required",
        },
        {
          status: 400,
        }
      )
    }


    if (!session_id) {
      return NextResponse.json(
        {
          error: "session_id is required",
        },
        {
          status: 400,
        }
      )
    }


    if (
      task_type !== "A" &&
      task_type !== "B"
    ) {
      return NextResponse.json(
        {
          error: "task_type must be A or B",
        },
        {
          status: 400,
        }
      )
    }


    /*
     * condition_order must ALWAYS be one of:
     *
     * A_B
     * B_A
     *
     * A_B = participant completes A first, then B
     * B_A = participant completes B first, then A
     */

    if (
      condition_order !== "A_B" &&
      condition_order !== "B_A"
    ) {
      return NextResponse.json(
        {
          error: "condition_order must be A_B or B_A",
        },
        {
          status: 400,
        }
      )
    }


    /* ==========================================================
       ACTION 1
       EXTRACT SLOTS
       
       ONLY USED FOR CLARIFY-FIRST / TASK B
       ========================================================== */

    if (action === "extract_slots") {

      if (mode !== "clarify_first") {
        return NextResponse.json(
          {
            error:
              "Slot extraction is only available in clarify_first mode.",
          },
          {
            status: 400,
          }
        )
      }


      const startTime = Date.now()


      const {
        slots,
      } = await llmService.extractSlots({
        brief,
      })


      /*
       * IMPORTANT:
       *
       * We deliberately use the fixed clarification questions.
       *
       * The questions do NOT change from participant to participant.
       */

      const clarificationQuestions =
        CLARIFY_FIRST_QUESTIONS


      const latencyMs =
        Date.now() - startTime


      console.log(
        `[LLM] Clarification extraction completed in ${latencyMs} ms`
      )


      return NextResponse.json({
        slots,

        clarificationQuestions,

        latencyMs,

        /*
         * Return condition_order as well so the frontend
         * can verify which experimental order is being used.
         */
        conditionOrder: condition_order,

      })
    }


    /* ==========================================================
       ACTION 2
       GENERATE RISK REGISTER
       ========================================================== */

    if (action === "generate") {

      let slots: Slot[]


      /* ========================================================
         CONDITION A — ONE-SHOT
         
         IMPORTANT:
         NO slot extraction.
         
         The brief goes directly to the final LLM generation.
         
         Therefore:
         
         Condition A = 1 LLM call
         ======================================================== */

      if (mode === "one_shot") {

        slots = []


        console.log(
          "[LLM] Condition A: direct one-shot generation"
        )

      }


      /* ========================================================
         CONDITION B — CLARIFY-FIRST
         
         Slots were extracted before this request.
         Participant answers are also provided.
         ======================================================== */

      else if (mode === "clarify_first") {

        if (!Array.isArray(rawSlots)) {
          return NextResponse.json(
            {
              error:
                "slots are required for clarify_first mode",
            },
            {
              status: 400,
            }
          )
        }


        slots = rawSlots as Slot[]


        console.log(
          "[LLM] Condition B: generating using extracted slots and participant answers"
        )

      }


      else {

        return NextResponse.json(
          {
            error:
              `Unknown mode: ${mode}`,
          },
          {
            status: 400,
          }
        )
      }


      /* ==========================================================
         MISSING SLOTS
         ========================================================== */

      const missingSlots =
        slots
          .filter(
            (slot) =>
              slot.missing
          )
          .map(
            (slot) =>
              slot.id
          )


      /* ==========================================================
         CLARIFICATION QUESTIONS
         ========================================================== */

      const clarificationQuestions =
        mode === "clarify_first"
          ? CLARIFY_FIRST_QUESTIONS
          : []


      /* ==========================================================
         FINAL LLM GENERATION
         
         BOTH CONDITIONS USE THE SAME LLM.
         
         A:
         brief → risk register
         
         B:
         brief + slots + participant answers → risk register
         ========================================================== */

      const startTime =
        Date.now()


      const {
        register,
      } =
        await llmService.generateRiskRegister({

          brief,

          mode,

          slots,

          clarificationAnswers:
            clarificationAnswers ?? {},

        })


      const latencyMs =
        Date.now() -
        startTime


      console.log(
        `[LLM] Risk register generated in ${latencyMs} ms`
      )


      /* ==========================================================
         SUPABASE CHECK
         ========================================================== */

      if (!supabase) {
        return NextResponse.json(
          {
            error:
              "Supabase not configured",
          },
          {
            status: 500,
          }
        )
      }


      /* ==========================================================
         MODEL NAME
         ========================================================== */

      const modelName =
        process.env.HF_MODEL ??
        process.env.LLM_MODEL ??
        "unknown"


      /* ==========================================================
         SAVE EXPERIMENT RECORD
         ========================================================== */

      const {
        error: insertError,
      } =
        await supabase
          .from(
            "ethics_submissions"
          )
          .insert({

            /* ----------------------------------------------
               PARTICIPANT / SESSION
               ---------------------------------------------- */

            session_id:
              session_id,


            /* ----------------------------------------------
               TASK
               ---------------------------------------------- */

            task_type:
              task_type,


            input_text:
              brief,


            /* ----------------------------------------------
               EXPERIMENTAL CONDITION
               ---------------------------------------------- */

            /*
             * mode = the condition used for THIS task
             *
             * one_shot
             * clarify_first
             */

            mode,


            /*
             * condition_order = order assigned to THIS participant
             *
             * A_B
             * B_A
             *
             * THIS WAS THE MISSING FIELD.
             */

            condition_order:
              condition_order,


            /*
             * condition_type remains the current task/condition.
             */

            condition_type:
              task_type,


            /* ----------------------------------------------
               LLM INFORMATION
               ---------------------------------------------- */

            model_name:
              modelName,


            /* ----------------------------------------------
               SLOT INFORMATION
               ---------------------------------------------- */

            slots,


            missing_slots:
              missingSlots,


            /* ----------------------------------------------
               CLARIFICATION INFORMATION
               ---------------------------------------------- */

            clarification_questions:
              clarificationQuestions,


            clarification_answers:
              clarificationAnswers ??
              {},


            /* ----------------------------------------------
               VERSION / PERFORMANCE
               ---------------------------------------------- */

            prompt_version:
              PROMPT_VERSION,


            latency_ms:
              latencyMs,


            /* ----------------------------------------------
               FINAL OUTPUT
               ---------------------------------------------- */

            ai_output:
              register,

          })


      /* ==========================================================
         SUPABASE ERROR
         ========================================================== */

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


      /* ==========================================================
         RESPONSE
         ========================================================== */

      return NextResponse.json({

        register,

        slots,

        missingSlots,

        clarificationQuestions,

        mode,

        /*
         * Return the order to the frontend too.
         */

        conditionOrder:
          condition_order,

        latencyMs,

        promptVersion:
          PROMPT_VERSION,

        conditionType:
          task_type,

        modelName,

      })
    }


    /* ==========================================================
       UNKNOWN ACTION
       ========================================================== */

    return NextResponse.json(
      {
        error:
          `Unknown action: ${action}`,
      },
      {
        status: 400,
      }
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
        error:
          message,
      },
      {
        status: 500,
      }
    )
  }
}