'use server';

/**
 * @fileOverview This file contains the Genkit flow for alerting failures related to webhook processing or unmatched transactions.
 *
 * It includes:
 * - `alertFailures` - A function to trigger failure alerts.
 * - `AlertFailuresInput` - The input type for the alertFailures function.
 * - `AlertFailuresOutput` - The return type for the alertFailures function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AlertFailuresInputSchema = z.object({
  failureType: z
    .string()
    .describe(
      'The type of failure that occurred (e.g., webhook failure, unmatched transaction)'
    ),
  details: z.string().describe('Detailed information about the failure.'),
});
export type AlertFailuresInput = z.infer<typeof AlertFailuresInputSchema>;

const AlertFailuresOutputSchema = z.object({
  alertSent: z
    .boolean()
    .describe('Indicates whether the alert was successfully sent.'),
  message: z.string().describe('A message confirming the alert status.'),
});
export type AlertFailuresOutput = z.infer<typeof AlertFailuresOutputSchema>;

export async function alertFailures(
  input: AlertFailuresInput
): Promise<AlertFailuresOutput> {
  return alertFailuresFlow(input);
}

const alertFailuresPrompt = ai.definePrompt({
  name: 'alertFailuresPrompt',
  input: {schema: AlertFailuresInputSchema},
  prompt: `You are an alerting system for a payment processing application. Your task is to determine whether to send a Slack alert based on the provided failure information.

Failure Type: {{{failureType}}}
Details: {{{details}}}

Analyze the failure type and details. If the failure indicates a critical issue requiring immediate attention (e.g., failed webhook verification, unmatched transaction that has been pending for more than 10 minutes), then construct a message for the operator and return alertSent as true. Otherwise, return alertSent as false and a message indicating no alert is necessary.

Output:
{
  "alertSent": true/false,
  "message": "Alert message or reason for not sending an alert"
}
`,
  output: {schema: AlertFailuresOutputSchema},
});

const alertFailuresFlow = ai.defineFlow(
  {
    name: 'alertFailuresFlow',
    inputSchema: AlertFailuresInputSchema,
    outputSchema: AlertFailuresOutputSchema,
  },
  async input => {
    const {output} = await alertFailuresPrompt(input);
    // TODO: Add actual slack integration here to send message to slack if alertSent is true
    // For now, we'll just return the output as is
    return output!;
  }
);
