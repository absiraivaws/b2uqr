# Deploy to Google Cloud Run with Docker

This guide shows how to containerize this Next.js app and deploy it to Cloud Run using a Dockerfile.

## Prerequisites

- gcloud CLI installed and initialized
- A Google Cloud project with billing enabled
- Permissions to use Cloud Run, Artifact Registry, Cloud Build, Firestore, and Secret Manager
- Firestore set up in Native mode (choose a region), if you use the built-in Firestore features

Enable required APIs:

```bash
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com firestore.googleapis.com
```

## 1) Build the image

We provide a production-ready multi-stage `Dockerfile` at the repo root. It builds the Next.js app and runs it with `next start` on port 8080 (Cloud Run default).

Build and tag the image locally (optional):

```bash
# In repo root
docker build -t nextn:local .
```

## 2) Push to Artifact Registry

Create a repository once (replace REGION and PROJECT_ID):

```bash
gcloud artifacts repositories create web-apps \
  --repository-format=docker \
  --location=REGION \
  --description="Containers for web apps"
```

Authenticate Docker to Artifact Registry:

```bash
gcloud auth configure-docker REGION-docker.pkg.dev
```

Build & push with Cloud Build:

```bash
PROJECT_ID="$(gcloud config get-value project)"
REGION="us-central1" # change if needed
IMAGE="REGION-docker.pkg.dev/${PROJECT_ID}/web-apps/lankaqr-demo"

gcloud builds submit --tag "$IMAGE" .
```

## 3) Configure environment variables

Set the following variables for Cloud Run. Use Secret Manager for sensitive values when possible.

Required (based on code):

- BANK_WEBHOOK_SECRET: HMAC secret for verifying bank webhooks
- APP_BASE_URL: Public base URL of your service (for simulateWebhook). Example: https://lankaqr-xyz-uc.a.run.app
- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_APP_ID
- NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID (optional if not used)

Optional SMTP (for email OTP):

- SMTP_HOST
- SMTP_PORT (e.g. 587 or 465)
- SMTP_USER
- SMTP_PASS
- SMTP_SECURE ("true" to force TLS)
- FROM_EMAIL (defaults to SMTP_USER if not set)

Firebase Admin options (choose one):

1) Workload Identity/Default creds: Grant the Cloud Run service account access to Firestore. The `firebase-admin` SDK will use ADC (Application Default Credentials).
2) Service account JSON: Store the entire JSON in Secret Manager and mount as env var `FIREBASE_SERVICE_ACCOUNT`.

## 4) Deploy to Cloud Run

Deploy the image and wire up env vars. Example with direct env vars (for a quick test):

```bash
SERVICE="lankaqr-demo"
REGION="us-central1" # change if needed
IMAGE="REGION-docker.pkg.dev/$(gcloud config get-value project)/web-apps/lankaqr-demo"

gcloud run deploy "$SERVICE" \
  --image "$IMAGE" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --min-instances 0 \
  --max-instances 5 \
  --concurrency 80 \
  --cpu 1 \
  --memory 512Mi \
  --set-env-vars APP_BASE_URL="https://REPLACE_WITH_SERVICE_URL" \
  --set-env-vars BANK_WEBHOOK_SECRET="REPLACE_ME" \
  --set-env-vars NEXT_PUBLIC_FIREBASE_API_KEY="..." \
  --set-env-vars NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..." \
  --set-env-vars NEXT_PUBLIC_FIREBASE_PROJECT_ID="..." \
  --set-env-vars NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="..." \
  --set-env-vars NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..." \
  --set-env-vars NEXT_PUBLIC_FIREBASE_APP_ID="..." \
  --set-env-vars NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="..."
```

Tip: run once without APP_BASE_URL to get the service URL from the output, then redeploy adding it.

Using Secret Manager (recommended):

```bash
# Example: store service account JSON
printf '%s' "$YOUR_SA_JSON" | gcloud secrets create FIREBASE_SERVICE_ACCOUNT --data-file=-

gcloud run services update "$SERVICE" \
  --region "$REGION" \
  --set-secrets FIREBASE_SERVICE_ACCOUNT=FIREBASE_SERVICE_ACCOUNT:latest
```

## 5) Domain & HTTPS

- The default service URL (a.run.app) is HTTPS by default.
- For a custom domain: Cloud Run > Custom Domains > Add Mapping.

## 6) Webhook URL

Your bank should POST to:

```
https://<your-domain-or-run-url>/api/bank/webhook
```

Ensure `BANK_WEBHOOK_SECRET` matches what your bank uses to sign requests. The app checks the `X-Bank-Signature` header.

## 7) Observability & scaling tips

- Logs: Cloud Logging shows stdout/stderr from the container.
- Health: Cloud Run uses container start success + request success. You can add a lightweight endpoint like `/healthz` if desired.
- Scaling: Adjust `--min-instances` to keep one warm instance if you want lower cold-start latency.
- Telemetry: NEXT_TELEMETRY_DISABLED is set in the image.

## Notes

- The Dockerfile uses Node 20 and Debian slim for better native module compatibility (e.g., @node-rs/argon2). If image size is critical, you can try distroless but ensure all native modules work first.
- This repo sets Next.js to ignore TS/ESLint build errors. `npm run typecheck` may still show warnings; they won’t block the Docker build.
