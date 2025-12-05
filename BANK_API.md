# B2U QR Bank Integration API

This document provides the necessary details for a banking partner to integrate with the B2U QR application.

## 1. Overview

The integration allows the bank to:
1.  **Send Webhook Notifications**: Inform the B2U QR app about the status of a transaction (e.g., SUCCESS, FAILED).
2.  **Retrieve Transaction History**: Fetch a list of all transactions processed through the system for reconciliation purposes.

## 2. Security

All communication between the bank's server and the B2U QR API must be secured.

### Webhook Secret Key

For authenticating incoming webhook requests, a shared secret key is used to generate an HMAC SHA-256 signature. This signature must be included in the `X-Bank-Signature` header of every webhook request.

The **default secret key** for the development environment is:

`fake-webhook-secret`

**It is critical that you configure a strong, unique secret for production environments.** This can be set as an environment variable (`BANK_WEBHOOK_SECRET`) in the application deployment.

## 3. API Endpoints

The application exposes the following endpoints for bank integration. The base URL will be your application's public domain (e.g., `https://your-app-domain.com`).

### 3.1. Webhook Notification Endpoint

The bank must send a `POST` request to this endpoint whenever a transaction's status changes.

-   **URL**: `/api/bank/webhook`
-   **Method**: `POST`
-   **Headers**:
    -   `Content-Type`: `application/json`
    -   `X-Bank-Signature`: The HMAC-SHA256 signature of the raw request body, generated using the shared secret key.
-   **Body (JSON Payload)**:

```json
{
  "transaction_uuid": "uuid_c8a7b6d5e4f3a2b1c0d9e8f7",
  "reference_number": "20240521000001",
  "amount": "123.00",
  "currency": "LKR",
  "status": "SUCCESS",
  "auth_code": "auth_1a2b3c",
  "paid_at": "2024-05-21T10:30:00Z",
  "terminal_id": "0001"
}
```

### 3.2. Transaction History Endpoint

This endpoint allows the bank to retrieve a list of transactions for reconciliation. It supports filtering by date range and terminal ID.

-   **URL**: `/api/bank/transactions`
-   **Method**: `GET`
-   **Query Parameters**:
    -   `startDate` (optional): The start date of the date range (format: `YYYY-MM-DD`).
    -   `endDate` (optional): The end date of the date range (format: `YYYY-MM-DD`).
    -   `terminalId` (optional): The specific terminal ID to filter by.
-   **Example Request**:
    ```
    GET /api/bank/transactions?startDate=2024-05-01&endDate=2024-05-31&terminalId=0001
    ```
-   **Success Response (200 OK)**:
    -   Returns a JSON array of transaction objects.

```json
[
  {
    "transaction_id": "tx_abc123",
    "transaction_uuid": "uuid_c8a7b6d5e4f3a2b1c0d9e8f7",
    "merchant_id": "0000000007960028005",
    "terminal_id": "0001",
    "amount": "123.00",
    "currency": "LKR",
    "reference_number": "20240521000001",
    "status": "SUCCESS",
    "created_at": "2024-05-21T10:25:00Z",
    "updated_at": "2024-05-21T10:30:00Z",
    "bankResponse": {
        "status": "SUCCESS",
        "paid_at": "2024-05-21T10:30:00Z"
    }
  },
  ...
]
```
