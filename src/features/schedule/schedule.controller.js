import { ok, badRequest, internalError } from "../../utils/response.js";
import { sendScheduleToZoho } from "./schedule.service.js";

function formatIstOffset(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}+05:30`;
}

export const createScheduleRequest = async (req, res) => {
  try {
    const type = req.body.type === "meeting" ? "meeting" : "call";
    const name = String(req.body.name || "").trim();
    const phone = String(req.body.phone || "").trim();

    if (name.length < 2 || !phone) {
      return badRequest(res, "Name and phone are required");
    }

    const scheduledAt =
      String(req.body.scheduledAt || "").trim() ||
      [String(req.body.date || "").trim(), String(req.body.time || "").trim()]
        .filter(Boolean)
        .join(" ") ||
      "Flexible";

    const scheduledAtDate = new Date(scheduledAt);
    const meetingEndDate =
      type === "meeting" && !Number.isNaN(scheduledAtDate.getTime())
        ? formatIstOffset(new Date(scheduledAtDate.getTime() + 30 * 60000))
        : undefined;

    const payload = {
      type,
      typeLabel: type === "meeting" ? "Meeting" : "Call",
      name,
      phone,
      scheduledAt,
      ...(meetingEndDate ? { meetingEndDate } : {}),
      note: String(req.body.note || "").trim(),
      source: "wensforce_subscription",
      pageUrl: String(req.body.pageUrl || "").trim(),
      submittedAt: new Date().toISOString(),
    };

    await sendScheduleToZoho(payload);
    return ok(res, { type }, "Schedule request sent successfully");
  } catch (error) {
    console.error("[schedule] failed:", error?.message || error);
    return internalError(res, "Failed to submit schedule request");
  }
};
