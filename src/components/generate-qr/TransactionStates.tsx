import { Card, CardContent } from "@/components/ui/card";
import { Loader2, QrCode } from "lucide-react";

export function TransactionLoading() {
  return (
    <Card className="flex flex-col items-center justify-center h-full min-h-[500px] border-dashed">
      <CardContent className="text-center">
        <Loader2 className="mx-auto h-12 w-12 text-muted-foreground animate-spin" />
        <h3 className="mt-4 text-lg font-medium">Generating Transaction...</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Please wait while we create the transaction and QR code.
        </p>
      </CardContent>
    </Card>
  );
}

export function TransactionEmpty() {
  return (
    <Card className="flex flex-col items-center justify-center h-full min-h-[500px] border-dashed">
      <CardContent className="text-center">
        <QrCode className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">Waiting for transaction</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter an amount and click "Generate QR Code" to start.
        </p>
      </CardContent>
    </Card>
  );
}
