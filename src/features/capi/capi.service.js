import crypto from "crypto";

function hash(value) {
  if (!value) return undefined;
  return crypto
    .createHash("sha256")
    .update(String(value).trim().toLowerCase())
    .digest("hex");
}

export async function sendCapiEventToMeta({
  eventName,
  eventId,
  userData,
  customData,
  eventSourceUrl,
}) {
  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        event_source_url: eventSourceUrl,
        action_source: "website",
        user_data: {
          em: hash(userData.email),
          ph: hash(userData.phone),
          fn: hash(userData.firstName),
          ln: hash(userData.lastName),
          client_ip_address: userData.ip,
          client_user_agent: userData.userAgent,
          fbc: userData.fbc || undefined,
          fbp: userData.fbp || undefined,
        },
        custom_data: {
          value: customData.value,
          currency: customData.currency || "INR",
          content_name: customData.contentName,
          content_ids: customData.contentId ? [customData.contentId] : undefined,
          order_id: customData.orderId,
        },
      },
    ],
  };

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${process.env.META_PIXEL_ID}/events?access_token=${process.env.META_ACCESS_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  const result = await res.json();
  if (!res.ok) {
    throw new Error(JSON.stringify(result));
  }
  return result;
}
