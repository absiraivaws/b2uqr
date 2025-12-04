import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { persistPhpposSale } from "@/lib/phppos";

class UnauthorizedError extends Error {}

const WEBHOOK_TOKEN = process.env.PHPPOS_WEBHOOK_TOKEN;
const WEBHOOK_HEADER_NAME = process.env.PHPPOS_WEBHOOK_HEADER ?? "x-phppos-webhook-token";

async function requireAuth() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  if (!sessionCookie) {
    throw new UnauthorizedError("Missing session cookie");
  }

  return adminAuth.verifySessionCookie(sessionCookie, true);
}

function extractBearerToken(value: string | null | undefined) {
  if (!value) return null;
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

function extractQueryToken(request: Request) {
  try {
    const url = new URL(request.url);
    return url.searchParams.get("token") ?? url.searchParams.get("webhookToken");
  } catch {
    return null;
  }
}

function isJsonLike(value: string | null) {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return normalized.includes("application/json") || normalized.includes("text/json");
}

function isFormUrlEncoded(value: string | null) {
  if (!value) return false;
  return value.toLowerCase().includes("application/x-www-form-urlencoded");
}

function isMultipartForm(value: string | null) {
  if (!value) return false;
  return value.toLowerCase().includes("multipart/form-data");
}

async function parseMultipartForm(request: Request) {
  const formData = await request.formData();
  const result: Record<string, any> = {};
  for (const [key, entry] of formData.entries()) {
    if (typeof entry === "string") {
      result[key] = entry;
    } else {
      result[key] = await entry.text();
    }
  }
  return result;
}

async function parseBody(request: Request) {
  const contentType = request.headers.get("content-type");
  if (isMultipartForm(contentType)) {
    return parseMultipartForm(request);
  }

  const rawText = await request.text();
  if (!rawText) {
    return {};
  }

  if (isFormUrlEncoded(contentType)) {
    const params = new URLSearchParams(rawText);
    const result: Record<string, any> = {};
    for (const [key, value] of params.entries()) {
      result[key] = value;
    }
    return result;
  }

  if (!contentType || isJsonLike(contentType) || contentType.toLowerCase().includes("text/plain")) {
    try {
      return JSON.parse(rawText);
    } catch {
      throw new Error("Invalid JSON payload");
    }
  }

  throw new Error("Unsupported content type");
}

function materializeSale(value: unknown): Record<string, any> | null {
  if (!value) return null;
  if (typeof value === "object") {
    return value as Record<string, any>;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, any>;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function resolveSalePayload(body: any, mode: "webhook" | "session") {
  const candidate = mode === "webhook" ? body?.sale ?? body : body?.sale;
  return materializeSale(candidate);
}

async function authenticate(request: Request) {
  if (WEBHOOK_TOKEN) {
    const headerToken = request.headers.get(WEBHOOK_HEADER_NAME);
    const bearerToken = extractBearerToken(request.headers.get("authorization"));
    const queryToken = extractQueryToken(request);

    if (
      headerToken === WEBHOOK_TOKEN ||
      bearerToken === WEBHOOK_TOKEN ||
      queryToken === WEBHOOK_TOKEN
    ) {
      return { mode: "webhook" as const, uid: null };
    }
  }

  const user = await requireAuth();
  return { mode: "session" as const, uid: user.uid };
}

function normalizeReference(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value.toString();
  }
  return null;
}

function extractUid(request: Request, body: any): string | null {
  const searchParamsUid = (() => {
    try {
      const url = new URL(request.url);
      return url.searchParams.get("uid") ?? url.searchParams.get("userUid");
    } catch {
      return null;
    }
  })();

  return (
    normalizeReference(body?.uid) ??
    normalizeReference(body?.userUid) ??
    normalizeReference(body?.user_id) ??
    normalizeReference(body?.user) ??
    normalizeReference(body?.sale?.uid) ??
    normalizeReference(body?.sale?.userUid) ??
    normalizeReference(body?.sale?.user_id) ??
    normalizeReference(body?.sale?.user) ??
    normalizeReference(searchParamsUid)
  );
}



export async function POST(request: Request) {
  try {
    const auth = await authenticate(request);

    let body: any;
    try {
      body = await parseBody(request);
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : "Invalid payload";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const transactionUuid =
      normalizeReference(body?.transactionUuid) ?? normalizeReference(body?.transaction_uuid);
    const referenceNumber =
      normalizeReference(body?.referenceNumber) ?? normalizeReference(body?.reference_number);


    const salePayload = resolveSalePayload(body, auth.mode);

    if (!salePayload || typeof salePayload !== "object") {
      const message = auth.mode === "webhook" ? "Webhook payload must include sale data." : "Request must include a sale object.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    if (body && typeof body === "object") {
      body.sale = salePayload;
    }

    const requestedUid = extractUid(request, body);
    const resolvedUid = auth.mode === "session" ? auth.uid : requestedUid;

    if (!resolvedUid) {
      return NextResponse.json(
        { error: "Webhook requests must include a uid so sales can be attributed." },
        { status: 400 }
      );
    }

    await persistPhpposSale(salePayload, {
      transactionUuid,
      referenceNumber,
      uid: resolvedUid,
    });

    const status = auth.mode === "webhook" ? 202 : 201;
    return NextResponse.json(
      {
        acknowledged: true,
        mode: auth.mode,
        sale_id: salePayload?.sale_id ?? null,
        total: salePayload?.total ?? null,
        sale: salePayload,
      },
      { status }
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Failed to process PHPPOS sale", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = message.includes("PHPPOS") ? 502 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
