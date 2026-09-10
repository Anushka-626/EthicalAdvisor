# EthicalAdvisor

**EthicalAdvisor** is a human-centred AI ethics advisor developed as part of a Master's thesis at the **University of Koblenz**. The system investigates how different interaction strategies with an LLM-based ethics advisor affect the identification and analysis of ethical risks in AI and data science projects.

The study uses a standardized project scenario called **MindAlert**, an AI-based early-warning system for universities.

---

## 🌐 Deployed Website

The final deployed version of **EthicalAdvisor** is available at:

**[EthicalAdvisor — Deployed Website](https://ethical-advisor-pybiudsa5-anushka-626s-projects.vercel.app/)**

This is the production version of the study application and contains the complete implemented study flow, including the MindAlert project brief, experimental conditions, participant surveys, and study completion page.

---

## Research Objective

The study investigates whether asking participants targeted clarification questions before generating an ethical risk analysis leads to better and more contextually relevant ethical risk identification than an unguided conversational interaction.

The study addresses three main research questions.

### RQ1 — Risk Triage Accuracy

How accurately can an LLM-based advisor transform a project brief into a structured ethical risk register, including:

* Ethical risk categories
* Affected stakeholders
* Severity
* Likelihood
* Mitigation recommendations

### RQ2 — Value of Clarification

Does a clarify-first interaction improve the completeness of risk identification and the contextual relevance of mitigation recommendations compared with unguided interaction?

### RQ3 — Educational Value

Does conversational interaction with an AI ethics advisor improve:

* Perceived educational value
* Perceived quality of ethical risk analysis
* Participant confidence
* Perceived workload

---

# Study Design

The study contains two experimental interaction conditions.

Participants are randomly assigned to one of two counterbalanced orders:

### Order A_B

```text
Unguided → Survey → Clarify-first → Survey
```

### Order B_A

```text
Clarify-first → Survey → Unguided → Survey
```

The condition order is stored for each participant to support the subsequent statistical analysis.

---

# Hidden One-Shot Baseline

Before the two experimental conditions, the system generates a hidden one-shot ethical risk analysis.

The baseline:

* Uses the fixed MindAlert project brief.
* Uses the same LLM as the experimental conditions.
* Uses the same model configuration.
* Does not ask clarification questions.
* Generates a structured ethical risk register.
* Is stored in Supabase.
* Is not shown to participants.

The baseline provides an additional reference point for the research analysis.

---

# Experimental Conditions

## Condition A — Unguided AI Analysis

Participants interact freely with an AI ethics advisor.

They can:

* Ask questions about the MindAlert project.
* Ask follow-up questions.
* Explore ethical issues of their choice.
* Decide when they have sufficiently explored the project.

The interaction is limited to a maximum of **10 participant turns**.

After the conversation, the system generates a structured ethical risk register using:

1. The original MindAlert project brief.
2. The complete participant–AI conversation.

The final risk register is stored for analysis and is not displayed to participants.

Every participant message and corresponding AI response is stored as an interaction record.

---

## Condition B — Clarify-first AI Analysis

Participants receive three predefined clarification questions.

The questions are identical for all participants.

### Question 1 — Data and Privacy

> What should students know about how their personal data is collected and used by MindAlert?

### Question 2 — Human Oversight

> Who should check a student's result before MindAlert takes action?

### Question 3 — Incorrect Predictions

> What should a student be able to do if MindAlert makes a wrong prediction about them?

Participants' answers are provided to the LLM together with the original project brief.

The final ethical risk register is generated using:

* The fixed MindAlert project brief.
* The three predefined clarification questions.
* The participant's answers.

The final register is stored for analysis and is not displayed to participants.

---

# MindAlert Project Brief

MindAlert is an AI-based early-warning system proposed by **CampusCare Solutions** for universities.

The system is designed to identify university students who may be at risk of dropping out or experiencing difficulties with their studies.

It uses several types of student data, including:

* Grades
* Attendance
* Assignment submission patterns
* Dropout-related information
* University login activity
* Health centre records
* Twitter/X and Instagram posts using student email handles
* Financial aid information

The system produces a weekly risk prediction for each student using three levels:

```text
Low
Medium
High
```

For students classified as high risk, the system automatically sends a check-in email.

The system also provides a dashboard for:

* Dean of Students
* University counselling staff

Students are currently not informed that their data is being used by the system or that they are being assessed by an AI risk prediction system.

The system is planned to be retrained every month using feedback from the system's users.

CampusCare Solutions has limited resources and does not currently have a dedicated infrastructure, auditing, or monitoring budget.

The system must generate its weekly predictions within approximately two hours each Monday.

Counsellors and university staff need to be able to understand why a student has received a particular risk classification.

The project aims to achieve:

* 80% recall for identifying students at risk within two weeks
* 30% reduction in staff workload
* Deployment at five universities within twelve months

---

# Ethical Risk Categories

The system focuses on five ethical dimensions:

```text
Fairness
Privacy
Transparency
Security
Accountability
```

Each identified risk is structured using:

```text
Category
Description
Affected stakeholders
Severity
Likelihood
Mitigations
```

Severity and likelihood use ordinal values:

```text
Low
Medium
High
```

---

# Clarification Slots

The system extracts contextual information from the project brief using six contextual slots:

```text
stakeholders
provenance
setting
automation
consequences
feedback_loops
```

If information is not explicitly available in the project brief, the system uses:

```text
not specified
```

The LLM is instructed not to speculate or invent missing project information.

---

# Technology Stack

## Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS
* Lucide React

## Backend

* Next.js API Routes
* TypeScript

## AI / LLM

The study currently uses:

```text
openai/gpt-oss-20b
```

through the Hugging Face OpenAI-compatible inference endpoint.

The same LLM model and configuration are used across the study conditions to isolate the effect of the interaction strategy rather than differences between models.

## Database

* Supabase
* PostgreSQL

The database stores:

* Study submissions
* AI interactions
* Hidden baseline risk registers
* Participant survey responses

## Deployment

* GitHub
* Vercel

---

# Project Structure

```text
EthicalAdvisor/
│
├── app/
│   ├── api/
│   │   └── analyze/
│   │       └── route.ts
│   │
│   └── page.tsx
│
├── components/
│   └── study/
│       ├── EthicsAdvisor.tsx
│       ├── OneShotBaseline.tsx
│       ├── TaskA.tsx
│       ├── TaskB.tsx
│       ├── UnguidedLLM.tsx
│       ├── SurveyForm.tsx
│       ├── StudyIntro.tsx
│       └── StudyComplete.tsx
│
├── lib/
│   ├── llm/
│   │   ├── huggingFaceLLM.ts
│   │   ├── llmInterface.ts
│   │   ├── llmService.ts
│   │   └── prompts.ts
│   │
│   ├── slots.ts
│   ├── studyConfig.ts
│   └── supabaseClient.ts
│
├── public/
│
├── package.json
├── tsconfig.json
├── next.config.*
└── README.md
```

---

# Study Flow

The participant-facing study flow is:

```text
┌────────────────────┐
│       Intro        │
└─────────┬──────────┘
          ↓
┌────────────────────┐
│    Instructions    │
│  MindAlert Brief   │
└─────────┬──────────┘
          ↓
┌────────────────────┐
│  Hidden Baseline   │
│    One-shot LLM    │
└─────────┬──────────┘
          ↓
     ┌────┴────┐
     │ Random  │
     │  Order  │
     └────┬────┘
          ↓
    ┌─────┴─────┐
    ↓           ↓
Condition A  Condition B
 Unguided    Clarify-first
    ↓           ↓
 Survey       Survey
    ↓           ↓
    └─────┬─────┘
          ↓
    Other Condition
          ↓
        Survey
          ↓
┌────────────────────┐
│     Thank You      │
└────────────────────┘
```

---

# Environment Variables

For local development, create a `.env.local` file.

Example:

```env
LLM_BACKEND=huggingface

HF_MODEL=openai/gpt-oss-20b

HF_TOKEN=your_huggingface_token

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url

NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Never commit API keys or other secrets to GitHub.**

The `.gitignore` file should include:

```text
.env
.env.local
.env.*.local
```

For the production deployment, the required environment variables must be configured in the Vercel project settings.

---

# Local Development

Clone the repository:

```bash
git clone <repository-url>
```

Enter the project directory:

```bash
cd EthicalAdvisor
```

Install dependencies:

```bash
npm install
```

Create the environment file:

```text
.env.local
```

Add the required environment variables.

Start the development server:

```bash
npm run dev
```

The application will normally be available at:

```text
http://localhost:3000
```

---

# Production Deployment

The application is deployed using Vercel.

Changes are pushed to the main Git branch:

```bash
git add .
git commit -m "Update study"
git push origin main
```

Vercel automatically creates a new deployment when changes are pushed to the connected GitHub repository.

Before participant data collection, verify that:

* The production deployment is successful.
* Supabase is connected.
* Hugging Face authentication works.
* The correct LLM model is configured.
* The fixed MindAlert brief is being used.
* The complete participant flow works.
* Both experimental conditions generate successfully.
* Survey responses are stored correctly.
* AI interactions are stored correctly.
* The hidden baseline is generated successfully.
* The baseline risk register is not displayed to participants.
* Final experimental risk registers are stored but not displayed.

---

# Data Collection

The study uses an anonymous session identifier generated in the browser.

Participants are not required to provide:

* Name
* Email address
* Student ID

The application records the session identifier and study responses required for the research analysis.

Participants are instructed not to include personally identifying information in free-text responses.

---

# Data Storage

The study data is stored in Supabase.

Important database entities include:

## `ethics_baseline`

Stores the hidden one-shot baseline risk register and associated model metadata.

## `ethics_submissions`

Stores generated risk-register submissions and associated study metadata.

## `ethics_interactions`

Stores participant–AI conversation messages for the unguided condition.

## Survey Data

Stores participant ratings for the experimental conditions, including measures such as:

* Educational value
* Quality
* Workload
* Confidence

---

# Analysis Plan

The collected data will be evaluated using quantitative performance metrics, expert agreement measures, and participant-level statistical comparisons.

For structured ethical risk registers, planned metrics include:

* Precision
* Recall
* F1-score
* Jaccard similarity for stakeholders
* Weighted kappa for ordinal severity
* Weighted kappa for ordinal likelihood

Inter-rater agreement will be assessed using expert ratings.

For participant-level comparisons, planned analyses include:

* Wilcoxon signed-rank tests
* Cliff's delta

The analysis compares the unguided and clarify-first interaction strategies while accounting for the counterbalanced condition order.

---

# Reproducibility

To support reproducibility, the application records relevant experimental metadata, including:

* Model
* Prompt version
* Brief version
* Temperature
* Condition
* Condition order
* Session ID
* Generated output
* Interaction history where applicable

The same LLM model is used across the conditions so that the primary experimental difference is the interaction strategy rather than the underlying model.

---

# Important Experimental Constraints

The following constraints are intentional parts of the study design:

1. The MindAlert project brief is fixed.
2. Participants cannot modify the project brief.
3. The same LLM model is used across conditions.
4. Condition B uses exactly three predefined clarification questions.
5. Condition A does not provide predefined clarification questions.
6. The baseline risk register is hidden from participants.
7. Final generated risk registers are stored for analysis but are not shown to participants.
8. Participant–AI interactions in the unguided condition are stored.
9. The condition order is counterbalanced.
10. Missing information should not be fabricated by the LLM.
11. The study conditions differ in interaction strategy rather than the underlying LLM model.

---

# Thesis Context

This repository contains the implementation of the **EthicalAdvisor** study developed for a Master's thesis in Data Science / Human-Centred AI at the **University of Koblenz**.

The project investigates the role of interaction design in LLM-supported ethical risk analysis rather than comparing different LLM models.

The central experimental comparison is:

```text
Unguided interaction
        vs.
Clarify-first interaction
```

while keeping the underlying project scenario and LLM configuration consistent.

---

# Academic Use

This project is intended for academic research and thesis-related study purposes.

The deployed website is intended for participants of the EthicalAdvisor study:

**[Open the deployed EthicalAdvisor website](https://ethical-advisor-pybiudsa5-anushka-626s-projects.vercel.app/)**

---

# License

This repository is intended primarily for academic research and thesis-related study purposes.
