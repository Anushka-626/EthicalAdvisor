import { NextResponse } from "next/server"

import { supabase } from "@/lib/supabaseClient"

import { llmService } from "@/lib/llm/llmService"

import {
  CLARIFY_FIRST_QUESTIONS,
  Slot,
} from "@/lib/slots"

import {
  generateChatResponse,
  generateUnguidedRiskRegister,
} from "@/lib/llm/huggingFaceLLM"

import { MINDALEERT_BRIEF } from "@/lib/studyConfig"

/**
 * ---------------------------------------------------------
 * STUDY / PROMPT VERSIONS
 * ---------------------------------------------------------
 */

const PROMPT_VERSION = "v2.0"

const UNGUIDED_PROMPT_VERSION =
  "unguided-v1.0"

const CLARIFY_PROMPT_VERSION =
  "clarify-first-v1.0"

const ONE_SHOT_PROMPT_VERSION =
  "one-shot-baseline-v1.0"

/**
 * Standardized brief version.
 *
 * Keep this fixed throughout the study.
 */

const BRIEF_VERSION =
  process.env.BRIEF_VERSION ??
  "mindalert-v1.0"

/**
 * Same model must be used for every condition.
 */

const MODEL =
  process.env.HF_MODEL ??
  "openai/gpt-oss-20b"

/**
 * Fixed LLM settings.
 */

const TEMPERATURE = 0

const MAX_TOKENS = 2000


/**
 * ---------------------------------------------------------
 * API ROUTE
 * ---------------------------------------------------------
 */

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json()

    const {
      action,
      brief,
      mode,
      session_id,
      task_type,
      condition_order,
      messages,
      clarificationAnswers,
    } = body


    /**
     * -----------------------------------------------------
     * VALIDATION
     * -----------------------------------------------------
     */

    if (
      !brief ||
      typeof brief !== "string"
    ) {
      return NextResponse.json(
        {
          error:
            "A project brief is required.",
        },
        {
          status: 400,
        }
      )
    }

    /**
     * IMPORTANT:
     *
     * The participant-facing study must always use
     * the standardized MindAlert brief.
     *
     * This prevents the client from changing the
     * experimental input.
     */

    if (
      brief.trim() !==
      MINDALEERT_BRIEF.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "The standardized MindAlert project brief must be used.",
        },
        {
          status: 400,
        }
      )
    }

    if (!supabase) {
      return NextResponse.json(
        {
          error:
            "Supabase is not configured.",
        },
        {
          status: 500,
        }
      )
    }


    /**
     * -----------------------------------------------------
     * 1. UNGUIDED CHAT
     * -----------------------------------------------------
     *
     * Student freely interacts with the same LLM.
     *
     * No predefined clarification questions.
     *
     * IMPORTANT:
     * Both the student's prompt and the AI response
     * are stored.
     */

    if (action === "chat") {

      const conversation =
        Array.isArray(messages)
          ? messages
          : []

      if (
        conversation.length === 0
      ) {
        return NextResponse.json(
          {
            error:
              "The conversation is empty.",
          },
          {
            status: 400,
          }
        )
      }

      /**
       * Find the latest student message.
       *
       * The frontend sends the complete conversation
       * on every request.
       *
       * We only save the newest user message here
       * so previous messages are not duplicated.
       */

      const latestUserMessage =
        [...conversation]
          .reverse()
          .find(
            (message: any) =>
              message?.role === "user"
          )

      if (
        !latestUserMessage ||
        typeof latestUserMessage.content !==
          "string"
      ) {
        return NextResponse.json(
          {
            error:
              "A valid student message is required.",
          },
          {
            status: 400,
          }
        )
      }

      const startTime =
        Date.now()

      const response =
        await generateChatResponse(
          MINDALEERT_BRIEF,
          conversation
        )

      const latency =
        Date.now() - startTime


      /**
       * Save BOTH:
       *
       * 1. student prompt
       * 2. assistant response
       */

      if (session_id) {

        const {
          error,
        } = await supabase
          .from(
            "ethics_interactions"
          )
          .insert([
            {
              session_id,

              task_type:
                task_type ??
                "unguided",

              role:
                "user",

              content:
                latestUserMessage.content,

              latency_ms:
                null,

              created_at:
                new Date().toISOString(),
            },

            {
              session_id,

              task_type:
                task_type ??
                "unguided",

              role:
                "assistant",

              content:
                response,

              latency_ms:
                latency,

              created_at:
                new Date().toISOString(),
            },
          ])

        if (error) {
          console.error(
            "Failed to save unguided interaction:",
            error
          )

          /**
           * We don't stop the experiment because
           * the LLM response itself succeeded.
           *
           * The error remains visible in the
           * server logs for debugging.
           */
        }
      }

      return NextResponse.json({
        response,

        latency_ms:
          latency,
      })
    }


    /**
     * -----------------------------------------------------
     * 2. UNGUIDED FINAL RISK REGISTER
     * -----------------------------------------------------
     *
     * Input:
     *
     * standardized brief
     * +
     * complete conversation
     *
     * Output:
     *
     * structured risk register
     *
     * The participant does NOT see the register.
     */

    if (
      action ===
      "generate_unguided"
    ) {

      const conversation =
        Array.isArray(messages)
          ? messages
          : []

      if (
        conversation.length === 0
      ) {
        return NextResponse.json(
          {
            error:
              "The unguided conversation is empty.",
          },
          {
            status: 400,
          }
        )
      }

      const startTime =
        Date.now()

      const register =
        await generateUnguidedRiskRegister(
          MINDALEERT_BRIEF,
          conversation
        )

      const latency =
        Date.now() - startTime


      /**
       * Save final unguided result.
       */

      if (session_id) {

        const {
          error,
        } = await supabase
          .from(
            "ethics_submissions"
          )
          .insert({
            session_id,

            task_type:
              task_type ??
              "unguided",

            input_text:
              MINDALEERT_BRIEF,

            mode:
              "unguided",

            condition_order:
              condition_order ??
              null,

            slots: [],

            missing_slots: [],

            clarification_questions: [],

            clarification_answers: {},

            prompt_version:
              UNGUIDED_PROMPT_VERSION,

            latency_ms:
              latency,

            ai_output:
              register,

            created_at:
              new Date().toISOString(),
          })

        if (error) {

          console.error(
            "Failed to save unguided submission:",
            error
          )

          return NextResponse.json(
            {
              error:
                "Risk register generated, but saving the result failed.",
            },
            {
              status: 500,
            }
          )
        }
      }

      /**
       * IMPORTANT:
       *
       * Do NOT return the risk register.
       *
       * The participant must not see it.
       */

      return NextResponse.json({
        success: true,

        latency_ms:
          latency,
      })
    }


    /**
     * -----------------------------------------------------
     * 3. EXTRACT SLOTS
     * -----------------------------------------------------
     *
     * Used internally by clarify-first.
     *
     * The questions themselves remain fixed.
     */

    if (
      action ===
      "extract_slots"
    ) {

      const {
        slots,
      } =
        await llmService.extractSlots({
          brief:
            MINDALEERT_BRIEF,
        })

      return NextResponse.json({
        slots,

        clarificationQuestions:
          CLARIFY_FIRST_QUESTIONS,
      })
    }


    /**
     * -----------------------------------------------------
     * 4. CLARIFY-FIRST RISK REGISTER
     * -----------------------------------------------------
     *
     * Participant-facing generation.
     *
     * ONLY clarify_first is allowed here.
     *
     * One-shot is NOT an experimental condition.
     */

    if (
      action === "generate"
    ) {

      /**
       * IMPORTANT:
       *
       * The participant-facing generate endpoint
       * is ONLY for Condition B.
       *
       * The hidden one-shot baseline has its own
       * generate_baseline action.
       */

      if (
        mode !==
        "clarify_first"
      ) {
        return NextResponse.json(
          {
            error:
              "The generate action is only available for the clarify-first condition.",
          },
          {
            status: 400,
          }
        )
      }


      /**
       * Extract contextual slots from the
       * standardized brief.
       */

      const {
        slots,
      } =
        await llmService.extractSlots({
          brief:
            MINDALEERT_BRIEF,
        })


      /**
       * Fixed questions.
       *
       * Exactly the same for every participant.
       */

      const fixedQuestions =
        CLARIFY_FIRST_QUESTIONS


      /**
       * Participant answers.
       */

      const answers =
        clarificationAnswers &&
        typeof clarificationAnswers ===
          "object"
          ? clarificationAnswers
          : {}


      /**
       * Ensure all three answers exist.
       */

      const allQuestionsAnswered =
        fixedQuestions.every(
          (question) =>
            typeof answers[
              question.slotId
            ] === "string" &&
            answers[
              question.slotId
            ].trim().length > 0
        )

      if (
        !allQuestionsAnswered
      ) {
        return NextResponse.json(
          {
            error:
              "All three clarification questions must be answered.",
          },
          {
            status: 400,
          }
        )
      }


      const startTime =
        Date.now()


      /**
       * Generate ONLY clarify-first result.
       */

      const {
        register,
      } =
        await llmService.generateRiskRegister(
          {
            brief:
              MINDALEERT_BRIEF,

            mode:
              "clarify_first",

            slots:
              slots,

            clarificationAnswers:
              answers,
          }
        )

      const latency =
        Date.now() - startTime


      /**
       * Save participant result.
       */

      if (session_id) {

        const {
          error,
        } = await supabase
          .from(
            "ethics_submissions"
          )
          .insert({
            session_id,

            task_type:
              task_type ??
              "B",

            input_text:
              MINDALEERT_BRIEF,

            mode:
              "clarify_first",

            condition_order:
              condition_order ??
              null,

            slots:
              slots,

            missing_slots:
              slots
                .filter(
                  (
                    slot: Slot
                  ) =>
                    slot.missing
                )
                .map(
                  (
                    slot: Slot
                  ) =>
                    slot.id
                ),

            clarification_questions:
              fixedQuestions,

            clarification_answers:
              answers,

            prompt_version:
              CLARIFY_PROMPT_VERSION,

            latency_ms:
              latency,

            ai_output:
              register,

            created_at:
              new Date().toISOString(),
          })

        if (error) {

          console.error(
            "Failed to save clarify-first submission:",
            error
          )

          return NextResponse.json(
            {
              error:
                "Risk register generated, but saving the result failed.",
            },
            {
              status: 500,
            }
          )
        }
      }


      /**
       * IMPORTANT:
       *
       * The final risk register is NOT returned.
       *
       * The participant goes directly to the survey.
       */

      return NextResponse.json({
        success: true,

        latency_ms:
          latency,
      })
    }


    /**
     * -----------------------------------------------------
     * 5. HIDDEN ONE-SHOT BASELINE
     * -----------------------------------------------------
     *
     * NOT an experimental condition.
     *
     * Input:
     *
     * standardized MindAlert brief only
     *
     * Output:
     *
     * hidden reference risk register
     *
     * The risk register is stored in ethics_baseline
     * and NEVER returned to the participant.
     */

    if (
      action ===
      "generate_baseline"
    ) {

      const startTime =
        Date.now()


      /**
       * Pure one-shot generation.
       *
       * No slots.
       * No clarification answers.
       * No conversation.
       */

      const {
        register,
      } =
        await llmService.generateRiskRegister(
          {
            brief:
              MINDALEERT_BRIEF,

            mode:
              "one_shot",

            slots: [],

            clarificationAnswers:
              {},
          }
        )

      const latency =
        Date.now() - startTime


      /**
       * Save hidden baseline.
       *
       * ONLY existing ethics_baseline columns
       * are used.
       */

      const {
        error,
      } = await supabase
        .from(
          "ethics_baseline"
        )
        .insert({
          brief:
            MINDALEERT_BRIEF,

          brief_version:
            BRIEF_VERSION,

          model:
            MODEL,

          prompt_version:
            ONE_SHOT_PROMPT_VERSION,

          temperature:
            TEMPERATURE,

          max_tokens:
            MAX_TOKENS,

          risk_register:
            register,

          created_at:
            new Date().toISOString(),
        })


      if (error) {

        console.error(
          "FAILED TO SAVE ONE-SHOT BASELINE"
        )

        console.error(
          "Supabase error:",
          {
            code:
              error.code,

            message:
              error.message,

            details:
              error.details,

            hint:
              error.hint,
          }
        )

        return NextResponse.json(
          {
            error:
              "The baseline analysis was generated, but the database could not save it.",

            database_error:
              error.message,
          },
          {
            status: 500,
          }
        )
      }


      /**
       * IMPORTANT:
       *
       * Do NOT return register.
       *
       * This guarantees that the hidden baseline
       * cannot accidentally be displayed by the
       * participant-facing component.
       */

      return NextResponse.json({
        success: true,

        baseline_saved: true,

        brief_version:
          BRIEF_VERSION,

        model:
          MODEL,

        prompt_version:
          ONE_SHOT_PROMPT_VERSION,

        latency_ms:
          latency,
      })
    }


    /**
     * -----------------------------------------------------
     * UNKNOWN ACTION
     * -----------------------------------------------------
     */

    return NextResponse.json(
      {
        error:
          `Unknown action: ${String(
            action
          )}`,
      },
      {
        status: 400,
      }
    )

  } catch (error) {

    console.error(
      "ANALYZE API ERROR:",
      error
    )

    const message =
      error instanceof Error
        ? error.message
        : "Unknown server error."

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