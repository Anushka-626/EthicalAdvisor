export const MINDALEERT_BRIEF = `
MindAlert:- AI-Powered Student Mental Health Risk Detection System

Project background

CampusCare Solutions is developing MindAlert, an AI-based system intended to help universities identify students who may be experiencing difficulties that could affect their academic progress and wellbeing.
The system is designed as an early-warning tool for university student-support services. Its purpose is to identify students who may benefit from additional support so that university staff can decide whether further assistance or outreach may be appropriate.

Data used

MindAlert will use information from several university data sources, including:

academic performance and course records;
attendance and engagement information;
student-support service interactions;
voluntary wellbeing questionnaires; and
selected university platform activity, such as learning-platform engagement.

The data will be collected from university systems and participating students. Some information, particularly wellbeing questionnaire responses, is provided voluntarily by students.
Before the system is used, the university plans to inform students that their data may be used for student-support purposes. Students will be provided with information about the project and how their data will be handled, although the exact consent process and whether consent is required for every individual data source are still being finalised.
The data will be cleaned and labelled using historical student records and previously identified cases where students required additional academic or wellbeing support.

What the model predicts

MindAlert will use a machine-learning model to estimate the likelihood that a student may require additional support in the near future.

The system will produce a risk level such as:

Low risk
Moderate risk
High risk

The prediction is intended to indicate that a student may benefit from further attention. It is not intended to provide a medical diagnosis.

How the predictions are used

The predictions will be made available to authorised university student-support staff through an internal dashboard.
A human staff member is expected to review the prediction before any action is taken. The system should therefore support, rather than completely replace, human decision-making.
Staff may use a high-risk prediction as a reason to consider contacting a student or offering information about available academic or wellbeing support.
However, the system may influence decisions about which students receive attention first. A student who receives a low-risk prediction may receive less proactive attention even if they are experiencing difficulties that the system has failed to detect.

Consequences for students

MindAlert is not intended to automatically impose penalties, restrict university services, or make final decisions about a student's academic status.
However, its predictions could influence how university staff prioritise outreach and support.
The consequences of an incorrect prediction could therefore be significant. For example:

a student incorrectly classified as high risk could receive unwanted attention or feel that their privacy has been invaded;
a student incorrectly classified as low risk could fail to receive support when they need it;
students may become concerned about being monitored or profiled based on their personal information.

Students should be able to ask questions about decisions or seek human review if they believe the system's assessment is incorrect. The exact appeal and review procedure is still being designed.

Future use and feedback

The initial system will be evaluated using historical and newly collected data.
The university is considering whether information about the system's predictions and subsequent student-support outcomes could later be used to improve or retrain the model. Any such future use would be subject to additional review and data-governance requirements.
At the current development stage, it has not yet been decided whether predictions will automatically trigger additional processes or be incorporated directly into future training data.

Deployment setting

MindAlert is intended for use within a university environment and may affect a diverse student population.
The system will operate in a sensitive context because it processes information that may relate to students' academic performance, wellbeing, and interactions with university support services.
The project team is particularly concerned with ensuring that the system is useful while protecting student privacy, avoiding unfair treatment, maintaining appropriate human oversight, and making the system's limitations understandable to staff.
`.trim()

export type ConditionOrder = "A_B" | "B_A"

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") {
    return ""
  }

  let sessionId = localStorage.getItem("session_id")

  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem("session_id", sessionId)
  }

  return sessionId
}

export function getConditionOrder(
  sessionId: string
): ConditionOrder {
  if (!sessionId) {
    return "A_B"
  }

  const lastCharacter =
    sessionId.charAt(sessionId.length - 1)

  const numericValue =
    parseInt(lastCharacter, 16)

  return numericValue % 2 === 0
    ? "A_B"
    : "B_A"
}

export function getStoredConditionOrder(): ConditionOrder {
  if (typeof window === "undefined") {
    return "A_B"
  }

  const stored =
    localStorage.getItem("condition_order")

  if (
    stored === "A_B" ||
    stored === "B_A"
  ) {
    return stored
  }

  const sessionId =
    getOrCreateSessionId()

  const order =
    getConditionOrder(sessionId)

  localStorage.setItem(
    "condition_order",
    order
  )

  return order
}