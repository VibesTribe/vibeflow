export interface BrevoAlertConfig {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
  recipients: string[];
}

export interface BrevoCreditAlertDetails {
  ideaId: string;
  taskId: string;
  platform: string;
  model: string;
  reason?: string;
}

function normalizeList(value: string | undefined): string[] {
  return (value ?? "")
    .split(/[\,\s;]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function loadBrevoConfigFromEnv(): BrevoAlertConfig | null {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const fromEmail = process.env.BREVO_FROM_EMAIL?.trim();
  const fromName = process.env.BREVO_FROM_NAME?.trim();
  const recipients = normalizeList(process.env.BREVO_TO);

  if (!apiKey || !fromEmail || recipients.length === 0) {
    return null;
  }

  return {
    apiKey,
    fromEmail,
    fromName,
    recipients
  };
}

function buildEmailPayload(config: BrevoAlertConfig, details: BrevoCreditAlertDetails) {
  const subject = `[Vibeflow] Credits exhausted: ${details.platform}`;
  const reasonText = details.reason ?? "credits_exhausted";
  const htmlContent = [
    `<p>The assignment <strong>${details.taskId}</strong> for idea <strong>${details.ideaId}</strong> reported <code>${reasonText}</code>.</p>`,
    `<p>Platform: <strong>${details.platform}</strong><br/>Model: <strong>${details.model}</strong></p>`,
    "<p>The orchestrator is rerouting this task to the next eligible platform automatically.</p>"
  ].join("\n");

  const textContent = [
    `Assignment ${details.taskId} for idea ${details.ideaId} reported ${reasonText}.`,
    `Platform: ${details.platform}`,
    `Model: ${details.model}`,
    "The orchestrator is rerouting this task to the next eligible platform automatically."
  ].join("\n");

  return {
    sender: {
      email: config.fromEmail,
      name: config.fromName ?? "Vibeflow Orchestrator"
    },
    to: config.recipients.map((email) => ({ email })),
    subject,
    htmlContent,
    textContent
  };
}

export async function sendBrevoCreditAlert(
  details: BrevoCreditAlertDetails,
  config: BrevoAlertConfig | null = loadBrevoConfigFromEnv()
): Promise<void> {
  if (!config) {
    return;
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": config.apiKey,
      "content-type": "application/json",
      accept: "application/json"
    },
    body: JSON.stringify(buildEmailPayload(config, details))
  });

  if (!response.ok) {
    let errorDetail: string | undefined;
    try {
      errorDetail = await response.text();
    } catch {
      errorDetail = undefined;
    }
    throw new Error(`Brevo credit alert failed with status ${response.status}${errorDetail ? `: ${errorDetail}` : ""}`);
  }
}

export function createBrevoCreditAlertSender(): ((details: BrevoCreditAlertDetails) => Promise<void>) | null {
  const config = loadBrevoConfigFromEnv();
  if (!config) {
    return null;
  }
  return (details: BrevoCreditAlertDetails) => sendBrevoCreditAlert(details, config);
}
