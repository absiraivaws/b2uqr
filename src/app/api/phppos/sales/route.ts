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



export async function POST(request: Request) {
  try {
    const auth = await authenticate(request);

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const transactionUuid =
      normalizeReference(body?.transactionUuid) ?? normalizeReference(body?.transaction_uuid);
    const referenceNumber =
      normalizeReference(body?.referenceNumber) ?? normalizeReference(body?.reference_number);


    const salePayload =
      auth.mode === "webhook"
        ? body?.sale && typeof body.sale === "object" ? body.sale : body
        : body?.sale;

    if (!salePayload || typeof salePayload !== "object") {
      const message = auth.mode === "webhook" ? "Webhook payload must include sale data." : "Request must include a sale object.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    await persistPhpposSale(salePayload, {
      transactionUuid,
      referenceNumber,
      uid: auth.uid,
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
