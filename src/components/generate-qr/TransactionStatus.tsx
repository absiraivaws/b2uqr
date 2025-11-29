import { useEffect, useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, CheckCircle, Clock, ShieldCheck, Share2, Download } from "lucide-react";
import QRCode from "qrcode";
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
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    if (transaction.status === "PENDING") {
      // Generate QR code with high error correction
      QRCode.toDataURL(transaction.qr_payload, { errorCorrectionLevel: "H", width: 350 })
        .then(setQrDataUrl)
        .catch(console.error);
    }
  }, [transaction.qr_payload, transaction.status]);

  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center justify-center p-6 bg-muted/50 rounded-lg">
          {transaction.status === "PENDING" && qrDataUrl ? (
            <div className="flex flex-row items-center justify-center gap-12 w-full">
              <div className="relative w-[350px] h-[350px] flex-shrink-0">
                <Image src={qrDataUrl} alt="QR Code" width={350} height={350} className="rounded-lg shadow-lg" />
                <Image
                  src="/lankaQR.png"
                  alt="Logo"
                  width={80}
                  height={80}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none drop-shadow-lg"
                />
              </div>
              <div className="flex flex-col justify-center text-center min-w-[260px]">
                <div className="font-bold text-2xl mb-4">Payment QR Code</div>
                <div className="font-bold text-4xl text-green-600 mb-8">
                  LKR {parseFloat(transaction.amount ?? "0").toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xl text-black mb-4">Reference: <span className="font-semibold">{transaction.reference_number}</span></div>
                <div className="text-xl text-black mb-2">Merchant: <span className="font-semibold">{transaction.merchant_name ?? "-"}</span></div>
                <div className="text-xl text-black mb-4">City: <span className="font-semibold">{transaction.merchant_city ?? "-"}</span></div>
                <div className="italic text-base text-muted-foreground mt-2">Scan this QR code to complete the payment</div>
              </div>
            </div>
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
