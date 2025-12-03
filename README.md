# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## PHPPOS integration

- **Shared secret**: Set `PHPPOS_WEBHOOK_TOKEN` (and optionally `PHPPOS_WEBHOOK_HEADER`) in `.env.local` for development and in Vercel project settings so the `/api/phppos/sales` route can authenticate webhook calls. The header defaults to `x-phppos-webhook-token`, but PHPPOS can also send the token as `Authorization: Bearer <token>` or via a query string (`...?token=<token>` or `...?webhookToken=<token>`) if the UI does not let you set headers.
- **User scoping**: Every webhook request must also include the Firebase `uid` for the merchant user (e.g., `/api/phppos/sales?token=...&uid=<firebase-uid>` or by adding `uid` in the JSON body). The backend stores this in `createdBy`, and the frontend subscribes only to documents where `createdBy` matches the signed-in user, so sales stay isolated per account.
- **Vercel URL**: Deploy as usual; PHPPOS should call `https://lanka-qr-demo.vercel.app/api/phppos/sales` (or whatever is in `NEXT_PUBLIC_APP_ORIGIN`). Add the shared secret header in the PHPPOS "PHP POS pushes to you" configuration so the request is accepted without a Firebase session cookie.
- **Local testing**: Run `npm run dev` (already bound to port `9002`). Expose it with a tunnel (`ngrok http 9002` or `cloudflared tunnel --url http://localhost:9002`) and point PHPPOS at `https://<tunnel-domain>/api/phppos/sales` with the same header. You can also simulate the webhook with: `curl -X POST http://localhost:9002/api/phppos/sales -H "Content-Type: application/json" -H "x-phppos-webhook-token: <token>" -d '{"sale_id":123,"total":500}'`.
- **Session mode**: When the dashboard calls this endpoint from the admin UI it still requires the Firebase session cookie and expects a `sale` object, but the server now just persists that payload (it no longer calls the PHPPOS API).
- **Webhook mode**: When PHPPOS posts sale data directly, the body can be either the sale object itself or `{ "sale": { ... } }`. As soon as the token matches, the payload is stored under `phppos_sales` with fields `saleId`, `total`, `calculatedTotal`, `createdAt`, `createdBy`, keeping only anonymized metadata plus the user association.
