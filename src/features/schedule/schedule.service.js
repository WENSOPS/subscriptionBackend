export async function sendScheduleToZoho(payload) {
  const webhookUrl = process.env.ZOHO_FLOW_SCHEDULE_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error("ZOHO_FLOW_SCHEDULE_WEBHOOK_URL is not configured");
  }

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Zoho webhook failed (${res.status}): ${text}`);
  }

  return { success: true };
}
