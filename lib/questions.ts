import { Question } from "@/components/study/question-card"

export const taskAQuestions: Question[] = [
  {
    id: "q1",
    type: "text",
    title: "Identify the main ethical risks in the MindAlert system",
    required: true,
  },
  {
    id: "q2",
    type: "multiple",
    title: "Which stakeholders are affected?",
    options: [
      { id: "s1", label: "Students", value: "students" },
      { id: "s2", label: "University staff", value: "staff" },
      { id: "s3", label: "Counsellors", value: "counsellors" },
      { id: "s4", label: "Startup (CampusCare)", value: "company" },
    ],
  },
  {
    id: "q3",
    type: "scale",
    title: "How severe are the privacy risks?",
    min: 1,
    max: 10,
    labels: {
      start: "Low",
      end: "Critical",
    },
  },
]

export const taskBQuestions: Question[] = [
  {
    id: "consent",
    type: "single",
    title: "Was explicit student consent obtained for collecting and combining all data sources?",
    options: [
      { id: "c1", label: "Yes", value: "yes" },
      { id: "c2", label: "No", value: "no" },
      { id: "c3", label: "Not specified", value: "unknown" },
    ],
  },
  {
    id: "human_review",
    type: "single",
    title: "Does a human review risk classifications before action is taken?",
    options: [
      { id: "h1", label: "Yes", value: "yes" },
      { id: "h2", label: "No", value: "no" },
      { id: "h3", label: "Partially", value: "partial" },
    ],
  },
  {
    id: "student_notification",
    type: "single",
    title: "Are students informed when they are flagged by the system?",
    options: [
      { id: "n1", label: "Yes", value: "yes" },
      { id: "n2", label: "No", value: "no" },
    ],
  },
  {
    id: "monitoring",
    type: "single",
    title: "Is there ongoing auditing and monitoring of model performance?",
    options: [
      { id: "m1", label: "Yes", value: "yes" },
      { id: "m2", label: "No", value: "no" },
      { id: "m3", label: "Unknown", value: "unknown" },
    ],
  },
  {
  id: "additional_risks",
  type: "text",
  title: "Based on the discussion, what do you think are the most important ethical risks and mitigations for MindAlert?",
  required: true,
}
]