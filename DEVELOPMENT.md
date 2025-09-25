# QR Bridge Development Guide

This document provides a guide for developers working on the QR Bridge application.

## 1. Project Overview

QR Bridge is a Next.js application designed to bridge the gap between legacy banking APIs and modern QR code payment systems, specifically focusing on the LankaQR standard. It allows users to generate dynamic QR codes for transactions, simulate webhook notifications, and view transaction history.

## 2. Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm or yarn

### Installation

1.  Clone the repository.
2.  Install the dependencies:
    ```bash
    npm install
    ```

### Running the Development Server

To run the application in development mode, use the following command:

```bash
npm run dev
```

This will start the Next.js development server, typically on `http://localhost:9002`.

The application also uses Genkit for AI flows. To run the Genkit development server, use:

```bash
npm run genkit:dev
```

## 3. Project Structure

Here is an overview of the key directories and files in the project:

-   **/src/app/**: The main application directory for the Next.js App Router.
    -   **/src/app/(app)/**: Contains the core application pages (e.g., Generate QR, Transactions, Settings).
    -   **/src/app/api/**: API routes, including the webhook handler for the bank.
    -   **/src/app/globals.css**: Global stylesheet and Tailwind CSS theme configuration (CSS variables).
    -   **/src/app/layout.tsx**: The root layout for the entire application.
-   **/src/components/**: Reusable React components.
    -   **/src/components/ui/**: UI components from `shadcn/ui` (e.g., Button, Card, Input).
-   **/src/hooks/**: Custom React hooks, such as `use-settings.ts` for managing application state with Zustand.
-   **/src/lib/**: Core application logic, utilities, and server-side actions.
    -   **/src/lib/actions.ts**: Server Actions for creating transactions, handling webhooks, and running reconciliation.
    -   **/src/lib/bank-api.ts**: Mock functions simulating calls to a bank's API for QR creation and reconciliation. **This is where the LankaQR payload is constructed.**
    -   **/src/lib/db.ts**: An in-memory database simulation for storing transaction data.
    -   **/src/lib/security.ts**: Functions for handling security, such as webhook signature verification.
    -   **/src/lib/types.ts**: TypeScript type definitions for the application (e.g., `Transaction`).
-   **/src/ai/**: Contains Genkit AI flows and configuration.
    -   **/src/ai/flows/alert-failures.ts**: An AI flow for sending alerts on transaction or webhook failures.
    -   **/src/ai/genkit.ts**: Genkit initialization and configuration.
-   **next.config.ts**: Configuration for the Next.js application.
-   **tailwind.config.ts**: Configuration for Tailwind CSS.

## 4. Key Technologies

-   **Framework**: [Next.js](https://nextjs.org/) (with App Router)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
-   **State Management**: [Zustand](https://github.com/pmndrs/zustand)
-   **Schema Validation**: [Zod](https://zod.dev/)
-   **Generative AI**: [Genkit](https://firebase.google.com/docs/genkit)

## 5. Available Scripts

-   `npm run dev`: Starts the Next.js development server.
-   `npm run build`: Builds the application for production.
-   `npm run start`: Starts the production server.
-   `npm run lint`: Runs ESLint to check for code quality issues.
-   `npm run genkit:dev`: Starts the Genkit development server for AI flows.
