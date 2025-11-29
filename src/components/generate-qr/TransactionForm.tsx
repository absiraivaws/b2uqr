import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Send } from "lucide-react";

interface TransactionFormProps {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isSubmitting: boolean;
  referenceNumber: string;
  setReferenceNumber: (ref: string) => void;
  terminalId: string;
  amount: string;
  onAmountChange: (amount: string) => void;
  status?: string | null;
  referenceType: 'serial' | 'invoice';
  manualReferencePlaceholder: string;
}

export function TransactionForm({
  onSubmit,
  isSubmitting,
  referenceNumber,
  setReferenceNumber,
  terminalId,
  amount,
  onAmountChange,
  status,
  referenceType,
  manualReferencePlaceholder
}: TransactionFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a New Transaction</CardTitle>
        <CardDescription>Enter a payment amount to generate a QR code.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={onSubmit}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reference_number">Reference Number</Label>
              <Input
                id="reference_number"
                name="reference_number"
                value={referenceNumber}
                readOnly={referenceType === 'serial'}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className={`font-mono ${referenceType === 'serial' ? 'bg-muted' : ''}`}
                placeholder={referenceType === 'invoice' ? manualReferencePlaceholder : ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="terminal_id">Terminal ID</Label>
              <Input
                id="terminal_id"
                name="terminal_id"
                value={terminalId}
                readOnly
                className="bg-muted font-bold text-primary"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              name="amount"
              placeholder="Enter amount to generate QR"
              required
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              disabled={isSubmitting || status === 'PENDING'}
            />
          </div>

          <Button type="submit" disabled={isSubmitting || !amount || !referenceNumber || status === 'PENDING'} className="w-full">
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Generate QR Code
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
