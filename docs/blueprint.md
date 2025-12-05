# **App Name**: B2U QR

## Core Features:

- Transaction Creation: Accepts transaction details from the merchant frontend and generates a unique transaction UUID. Stores transaction as `PENDING` in database.
- QR Code Request: Calls the Bank API to request a dynamic QR code for the created transaction. Handles secure signing of the request.
- QR Code Delivery: Returns the QR code (either EMV payload or image URL) and transaction details to the merchant frontend for display to the customer.
- Webhook Validation: Validates incoming webhooks from the bank using mTLS or HMAC signature. Validates the data.
- Transaction Update: Upon receiving a valid webhook, updates the Firestore transaction status to `SUCCESS` or `FAILED`.
- Reconciliation Job: If Bank API allows to query for PENDING status transactions, schedule this function to run, to update PENDING transactions that timed out.
- Alerting for Failures: Use generative AI tool to send Slack alerts to notify when unmatched transactions occur, when the bank webhook fails or Reconciliation fails. Only send message if a problem has been properly identified by the tool.

## Style Guidelines:

- Primary color: Deep blue (#3F51B5) to convey trust, security, and stability, aligning with the financial nature of the application.
- Background color: Light blue-gray (#ECEFF1), a desaturated version of the primary color, for a clean, professional backdrop that does not distract from the content.
- Accent color: Vibrant orange (#FF5722) to highlight key actions and important information, creating contrast and drawing attention to critical elements.
- Body and headline font: 'Inter', a sans-serif font known for its readability and clean design, making it suitable for both headers and body text throughout the application.
- Code font: 'Source Code Pro', appropriate for displaying technical details about the payment flows.
- Use minimalist, consistent icons throughout the application to represent actions and information, enhancing usability without clutter.
- Incorporate subtle transitions and animations to provide visual feedback and guide users, enhancing the perceived responsiveness of the app.