import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, CheckCircle, Clock, ShieldCheck, Share2, Download } from "lucide-react";
import type { Transaction } from "@/lib/types";

interface TransactionStatusProps {
  transaction: Transaction;
  onVerify: () => void;
  isVerifying: boolean;
  onShare: () => void;
  isSharing: boolean;
  onDownload: () => void;
  isDownloading: boolean;
}

function StatusIcon({ status }: { status: Transaction["status"] }) {
  switch (status) {
    case "SUCCESS": return <CheckCircle className="h-5 w-5 text-green-500" />;
    case "FAILED": return <AlertTriangle className="h-5 w-5 text-red-500" />;
    case "PENDING":
    default: return <Clock className="h-5 w-5 text-yellow-500" />;
  }
}

export function TransactionStatus({
  transaction,
  onVerify,
  isVerifying,
  onShare,
  isSharing,
  onDownload,
  isDownloading,
}: TransactionStatusProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center justify-center p-6 bg-muted/50 rounded-lg">
          {transaction.status === "PENDING" ? (
            <Image
              src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(transaction.qr_payload)}&logo=https://storage.googleapis.com/proudcity/mebanenc/uploads/2021/03/Peoples-Pay-Logo.png`}
              alt="QR Code"
              width={250}
              height={250}
              className="rounded-lg shadow-md"
              data-ai-hint="qr code"
            />
          ) : (
            <div className="w-[250px] h-[250px] flex flex-col items-center justify-center text-center bg-background rounded-lg shadow-md">
              <StatusIcon status={transaction.status} />
              <p className={`mt-4 font-medium text-lg ${transaction.status === 'SUCCESS' ? 'text-green-600' : 'text-red-600'}`}>
                Payment {transaction.status}
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                {transaction.status === 'SUCCESS' ? 'Transaction completed successfully.' : 'Transaction has failed.'}
              </p>
            </div>
          )}
        </div>

        {transaction.status === "PENDING" && (
          <div className="mt-4 flex flex-col sm:flex-row gap-3 items-center justify-center">
            <Button onClick={onVerify} disabled={isVerifying}>
              {isVerifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Verify Transaction
            </Button>
            <Button onClick={onShare} disabled={isSharing} variant="outline">
              {isSharing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
              Share
            </Button>
            <Button onClick={onDownload} disabled={isDownloading} variant="outline">
              {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Download
            </Button>
            <p className="text-xs text-muted-foreground mt-2 sm:hidden">Click to manually check or share the transaction.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
