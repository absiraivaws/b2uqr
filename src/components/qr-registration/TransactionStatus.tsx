import { useEffect, useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, CheckCircle, Clock, ShieldCheck, Share2, Download } from "lucide-react";
import QRCode from "qrcode";
import type { Transaction } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

interface TransactionStatusProps {
  transaction: Transaction;
  onVerify: () => void;
  isVerifying: boolean;
  onShare: () => void;
  isSharing: boolean;
  onDownload: () => void;
  isDownloading: boolean;
  includeReference?: boolean;
}

function StatusIcon({ status }: { status: Transaction["status"] }) {
  switch (status) {
    case "SUCCESS": return <CheckCircle className="h-6 w-6 md:h-8 md:w-8 text-green-500" />;
    case "FAILED": return <AlertTriangle className="h-6 w-6 md:h-8 md:w-8 text-red-500" />;
    case "PENDING":
    default: return <Clock className="h-6 w-6 md:h-8 md:w-8 text-yellow-500" />;
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
  includeReference = true,
}: TransactionStatusProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isBlurred, setIsBlurred] = useState<boolean>(false);
  const { toast } = useToast();

  const handleOpenOverlay = async () => {
    if (typeof window === 'undefined') return;
    const localUrls = [
      'http://127.0.0.1:3333/open',
      'http://localhost:3333/open'
    ];
    const payload = { transaction };
    // try POST first
    for (const url of localUrls) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          toast({ title: 'Overlay opened', description: 'Overlay window should appear.' });
          return;
        }
      } catch (e) {
        // try next
      }
    }

    // POST failed — try custom protocol to start installed app with payload
    try {
      const json = JSON.stringify(payload.transaction || payload);
      // base64 encode safely
      const b64 = window.btoa(unescape(encodeURIComponent(json)));
      const proto = `lankaqr://open?payload=${encodeURIComponent(b64)}`;
      // open protocol. This will start the app if installed.
      window.location.href = proto;

      // show install prompt in case protocol is not handled (user can cancel)
      setTimeout(() => {
        const install = window.confirm('If the overlay did not open, the app may not be installed. Open download page?');
        if (install) {
          window.open('https://qr.b2u.app/overlay-install', '_blank');
        }
      }, 1200);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Overlay failed', description: 'Could not contact local overlay or open protocol.' });
    }
  };

  // Generate QR Code
  useEffect(() => {
    if (transaction.status === "PENDING") {
      QRCode.toDataURL(transaction.qr_payload, {
        errorCorrectionLevel: "H",
        width: 400,
      })
        .then((dataUrl) => {
          setQrDataUrl(dataUrl);
          // Unblur when a new QR has been generated
          setIsBlurred(false);
        })
        .catch(console.error);
    }
  }, [transaction.qr_payload, transaction.status]);

  // Blur QR immediately when includeReference toggles
  useEffect(() => {
    // if includeReference toggles, blur the current QR until a new one is generated
    setIsBlurred(true);
  }, [includeReference]);

  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center justify-center p-4 sm:p-6 bg-muted/50 rounded-lg">

          {transaction.status === "PENDING" && qrDataUrl ? (
            <div className="w-full flex flex-col md:flex-row md:flex-nowrap items-center justify-center gap-6">
              {/* QR + Logo */}
              <div className="flex flex-col text-center w-full md:w-1/2 md:flex-1">
                <div className="font-bold text-3xl sm:text-4xl text-green-600 mb-6">
                  LKR {parseFloat(transaction.amount ?? "0").toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                {includeReference && transaction.reference_number ? (
                  <div className="text-lg sm:text-xl mb-2">
                    Reference:
                    <span className="font-semibold ml-1">{transaction.reference_number}</span>
                  </div>
                ) : null}
                <div className="text-lg sm:text-xl mb-1">
                  Merchant:
                  <span className="font-semibold ml-1">{transaction.merchant_name ?? "-"}, {transaction.merchant_city ?? "-"}</span>
                </div>
                <div className="italic text-sm sm:text-base text-muted-foreground mt-2">
                  Scan this QR code to complete the payment
                </div>
              </div>

              {/* Right Panel Text */}
              <div className="relative w-full md:w-1/2 md:flex-1 aspect-square mx-auto md:mx-0">
                <Image
                  src={qrDataUrl}
                  alt="QR Code"
                  fill
                  className={`object-contain rounded-lg shadow-lg transition-[filter] duration-300 ${isBlurred ? 'filter blur-sm' : ''}`}
                />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[15%] h-[15%]">
                  <Image
                    src="/lankaQR.png"
                    alt="Logo"
                    width={80}
                    height={80}
                    className="object-contain pointer-events-none drop-shadow-lg"
                  />
                </div>
              </div>
            </div>
          ) : (
            // SUCCESS or FAILED Box
            <div className="w-[220px] h-[220px] sm:w-[250px] sm:h-[250px] flex flex-col items-center justify-center text-center bg-background rounded-lg shadow-md">
              <StatusIcon status={transaction.status} />

              <p className={`mt-3 font-medium text-lg sm:text-xl ${
                transaction.status === "SUCCESS" ? "text-green-600" : "text-red-600"
              }`}>
                Payment {transaction.status}
              </p>

              <p className="text-muted-foreground text-sm mt-1">
                {transaction.status === "SUCCESS"
                  ? "Transaction completed successfully."
                  : "Transaction has failed."}
              </p>
            </div>
          )}

        </div>

        {/* Buttons */}
        {transaction.status === "PENDING" && (
          <div className="mt-6 flex flex-col sm:flex-row gap-3 items-center justify-center">

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

            {/* Dev-only: open Electron overlay on same machine */}
            {typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
              <Button onClick={handleOpenOverlay} variant="outline">
                Open Overlay
              </Button>
            )}

            <p className="text-xs text-muted-foreground mt-1 sm:hidden">
              Tap a button to verify or share.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
