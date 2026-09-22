import crypto from "crypto";

function hash(value) {
  if (!value) return undefined;
  return crypto
    .createHash("sha256")
    .update(String(value).trim().toLowerCase())
    .digest("hex");
}

const ALLOWED = new Set([
  "AddToCart",
  "InitiateCheckout",
  "AddPaymentInfo",
  "CompleteRegistration",
  "Contact",
  "Purchase",
  "ViewContent",
]);

const normPhone = (p) => {
  const d = String(p || "").replace(/\D/g, "");
  return d.length === 10 ? "91" + d : d; // India country code
};

const GA_MAP = {
  AddToCart: "add_to_cart",
  InitiateCheckout: "begin_checkout",
  AddPaymentInfo: "add_payment_info",
  CompleteRegistration: "sign_up",
  Contact: "generate_lead",
  Purchase: "purchase",
  ViewContent: "view_item",
};

// Server side events
const SERVER_EVENTS = new Set(["Purchase"]);

const DEFAULT_GADS_API_VERSION = "v21";

const GADS_ACTION_ENV = {
  Purchase: "GOOGLE_ADS_CONVERSION_PURCHASE",
  AddToCart: "GOOGLE_ADS_CONVERSION_ADD_TO_CART",
  InitiateCheckout: "GOOGLE_ADS_CONVERSION_INITIATE_CHECKOUT",
  AddPaymentInfo: "GOOGLE_ADS_CONVERSION_ADD_PAYMENT_INFO",
  CompleteRegistration: "GOOGLE_ADS_CONVERSION_COMPLETE_REGISTRATION",
  Contact: "GOOGLE_ADS_CONVERSION_CONTACT",
  ViewContent: "GOOGLE_ADS_CONVERSION_VIEW_CONTENT",
};

let gadsTokenCache = { accessToken: null, expiresAt: 0 };

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

function hashEmail(email) {
  if (!email) return undefined;
  let normalized = String(email).trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at > 0) {
    let local = normalized.slice(0, at);
    const domain = normalized.slice(at + 1);
    local = local.split("+")[0];
    if (domain === "gmail.com" || domain === "googlemail.com") {
      local = local.replace(/\./g, "");
    }
    normalized = `${local}@${domain}`;
  }
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

function hashPhoneE164(phone) {
  const d = normPhone(phone);
  if (!d) return undefined;
  return crypto.createHash("sha256").update("+" + d).digest("hex");
}

function formatConversionDateTime(date = new Date()) {
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
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}+05:30`;
}

function parseConversionActionMap() {
  const raw = process.env.GOOGLE_ADS_CONVERSION_ACTIONS?.trim();
  const map = {};
  if (!raw) return map;

  if (raw.startsWith("{")) {
    try {
      for (const [name, id] of Object.entries(JSON.parse(raw))) {
        const digits = digitsOnly(id);
        if (name && digits) map[name] = digits;
      }
    } catch {
      return map;
    }
    return map;
  }

  for (const part of raw.split(",")) {
    const [name, id] = part.split(":").map((s) => s?.trim());
    const digits = digitsOnly(id);
    if (name && digits) map[name] = digits;
  }
  return map;
}

function getGadsConversionActionId(eventName) {
  const fromMap = parseConversionActionMap()[eventName];
  if (fromMap) return fromMap;

  const fromEventEnv = digitsOnly(process.env[GADS_ACTION_ENV[eventName]]);
  if (fromEventEnv) return fromEventEnv;

  if (eventName === "Purchase") {
    return digitsOnly(process.env.GOOGLE_ADS_CONVERSION_ACTION_ID);
  }
  return "";
}

export function isGoogleAdsConfigured() {
  return Boolean(
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim() &&
      process.env.GOOGLE_ADS_CLIENT_ID?.trim() &&
      process.env.GOOGLE_ADS_CLIENT_SECRET?.trim() &&
      process.env.GOOGLE_ADS_REFRESH_TOKEN?.trim() &&
      digitsOnly(process.env.GOOGLE_ADS_CUSTOMER_ID),
  );
}

async function getGoogleAdsAccessToken(forceRefresh = false) {
  if (
    !forceRefresh &&
    gadsTokenCache.accessToken &&
    Date.now() < gadsTokenCache.expiresAt
  ) {
    return gadsTokenCache.accessToken;
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(JSON.stringify(data));
  }

  gadsTokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + ((data.expires_in || 3600) - 60) * 1000,
  };
  return gadsTokenCache.accessToken;
}

export async function sendCapiEventToMeta({
  eventName,
  eventId,
  userData,
  customData,
  eventSourceUrl,
}) {
  if (!ALLOWED.has(eventName)) {
    throw new Error(`Event name ${eventName} is not allowed`);
  }

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
          ph: hash(normPhone(userData.phone)),
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
          content_ids: customData.contentId
            ? [customData.contentId]
            : undefined,
          order_id: customData.orderId,
        },
      },
    ],
  };

  if (process.env.META_TEST_EVENT_CODE) {
    payload.test_event_code = process.env.META_TEST_EVENT_CODE;
  }
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

export async function sendGAEventToGoogle({
  eventName,
  eventId,
  userData,
  customData,
  eventSourceUrl,
  ga_client_id,
  ga_session_id,
}) {
  const gaName = GA_MAP[eventName];
  if (!gaName) {
    throw new Error(
      `Event name ${eventName} is not supported by Google Analytics`,
    );
  }
  if (SERVER_EVENTS.has(eventName)) {
    return { skipped: "server side event" };
  }
  if (!ga_client_id) return { skipped: "no client_id" };

  const payload = {
    client_id: ga_client_id,
    ...(userData.id && { user_id: userData.id }),
    events: [
      {
        name: gaName,
        params: {
          ...customData,
          value: customData.value,
          currency: customData.currency,
          transaction_id: customData.order_id,
          session_id: ga_session_id,
          engagement_time_msec: 100,
          debug_mode: true, // TODO: remove this after testing
        },
      },
    ],
  };

  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${process.env.GA_MEASUREMENT_ID}&api_secret=${process.env.GA_API_SECRET}`;
  const res = await fetch(url, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return { status: res.status }; // 204 = accepted, 400 = bad request
}

export async function sendGadsClickConversion({
  eventName,
  eventId,
  userData = {},
  customData = {},
  gclid,
  gbraid,
  wbraid,
}) {
  if (!ALLOWED.has(eventName)) {
    throw new Error(`Event name ${eventName} is not allowed`);
  }

  const conversionActionId = getGadsConversionActionId(eventName);
  if (!conversionActionId) {
    return { skipped: `no conversion action configured for ${eventName}` };
  }

  const clickIdCount = [gclid, gbraid, wbraid].filter(Boolean).length;
  if (clickIdCount > 1) {
    throw new Error("Provide only one of gclid, gbraid, or wbraid");
  }

  const hashedEmail = hashEmail(userData.email);
  const hashedPhone = hashPhoneE164(userData.phone);
  if (!gclid && !gbraid && !wbraid && !hashedEmail && !hashedPhone) {
    return { skipped: "no gclid or user identifier" };
  }

  const customerId = digitsOnly(process.env.GOOGLE_ADS_CUSTOMER_ID);
  const orderId = customData.orderId || customData.order_id || eventId;
  const conversion = {
    conversionAction: `customers/${customerId}/conversionActions/${conversionActionId}`,
    conversionDateTime: formatConversionDateTime(),
    conversionValue: Number(customData.value ?? 0),
    currencyCode: customData.currency || "INR",
    conversionEnvironment: "WEB",
    consent: { adUserData: "GRANTED", adPersonalization: "GRANTED" },
  };

  if (gclid) conversion.gclid = gclid;
  else if (gbraid) conversion.gbraid = gbraid;
  else if (wbraid) conversion.wbraid = wbraid;

  if (orderId) conversion.orderId = String(orderId);

  const userIdentifiers = [];
  if (hashedEmail) {
    userIdentifiers.push({
      hashedEmail,
      userIdentifierSource: "FIRST_PARTY",
    });
  }
  if (hashedPhone) {
    userIdentifiers.push({
      hashedPhoneNumber: hashedPhone,
      userIdentifierSource: "FIRST_PARTY",
    });
  }
  if (userIdentifiers.length) conversion.userIdentifiers = userIdentifiers;

  const payload = {
    conversions: [conversion],
    partialFailure: true,
    validateOnly: process.env.GOOGLE_ADS_VALIDATE_ONLY === "true",
  };

  const result = await postClickConversions(customerId, payload);
  if (result.partialFailureError) {
    throw new Error(JSON.stringify(result.partialFailureError));
  }
  return result;
}

async function postClickConversions(customerId, payload, retried = false) {
  const accessToken = await getGoogleAdsAccessToken(retried);
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
    "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
  };
  const loginCustomerId = digitsOnly(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID);
  if (loginCustomerId) headers["login-customer-id"] = loginCustomerId;

  const res = await fetch(
    `https://googleads.googleapis.com/${process.env.GOOGLE_ADS_API_VERSION || DEFAULT_GADS_API_VERSION}/customers/${customerId}:uploadClickConversions`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    },
  );

  const result = await res.json();
  if (res.status === 401 && !retried) {
    gadsTokenCache = { accessToken: null, expiresAt: 0 };
    return postClickConversions(customerId, payload, true);
  }
  if (!res.ok) {
    throw new Error(JSON.stringify(result));
  }
  return result;
}

export async function trackPurchase(order) {
  const orderId = order.cashfreeOrderId || order.id;
  const common = {
    eventName: "Purchase",
    eventId: `purchase_${order.id}`,
    customData: {
      value: order.amount ?? 0,
      currency: order.currency || "INR",
      orderId,
      order_id: orderId,
      contentName: order.packageName || null,
      contentId: order.packageId || null,
    },
    userData: {
      email: order.email,
      phone: order.phone,
      firstName: order.firstName || order.name,
      lastName: order.lastName || null,
      id: order.userId,
    },
  };

  const eventSourceUrl =
    order.tracking?.pageUrl ||
    (process.env.RETURN_URL
      ? `${process.env.RETURN_URL}?order_id=${orderId}`
      : undefined);

  const results = await Promise.allSettled([
    sendCapiEventToMeta({
      ...common,
      eventSourceUrl,
    }),
    sendGAEventToGoogle({
      ...common,
      eventSourceUrl,
      ga_client_id: order.tracking?.ga_client_id,
      ga_session_id: order.tracking?.ga_session_id,
    }),
    sendGadsClickConversion({
      ...common,
      gclid: order.tracking?.gclid,
      gbraid: order.tracking?.gbraid,
      wbraid: order.tracking?.wbraid,
    }),
  ]);

  results.forEach((r, i) => {
    if (r.status === "rejected")
      console.error(
        ["META", "GA", "GADS"][i],
        "purchase failed:",
        r.reason?.message,
      );
  });
}
