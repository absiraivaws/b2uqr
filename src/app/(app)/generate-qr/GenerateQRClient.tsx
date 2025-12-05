"use client";

import { useTransactionManager } from "@/hooks/use-transaction-manager";
import { TransactionForm } from "@/components/generate-qr/TransactionForm";
import { TransactionStatus } from "@/components/generate-qr/TransactionStatus";
import { TransactionLoading, TransactionEmpty } from "@/components/generate-qr/TransactionStates";

export default function GenerateQRClient() {
  const {
    currentTransaction,
    isSubmitting,
    isVerifying,
    isSharing,
    isDownloading,
    referenceNumber,
    setReferenceNumber,
    amount,
    setAmount,
    manualReferencePlaceholder,
    referenceType,
    handleCreateTransaction,
    handleVerifyTransaction,
    handleShareQR,
    handleDownloadQR,
  } = useTransactionManager();

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-1 space-y-8">
          <TransactionForm
            onSubmit={handleCreateTransaction}
            isSubmitting={isSubmitting}
            referenceNumber={referenceNumber}
            setReferenceNumber={setReferenceNumber}
            amount={amount}
            onAmountChange={setAmount}
            status={currentTransaction?.status}
            referenceType={referenceType}
            manualReferencePlaceholder={manualReferencePlaceholder}
          />
        </div>
        <div className="lg:col-span-2">
          {isSubmitting && !currentTransaction ? (
            <TransactionLoading />
          ) : currentTransaction ? (
            <TransactionStatus
              transaction={currentTransaction}
              onVerify={handleVerifyTransaction}
              isVerifying={isVerifying}
              onShare={handleShareQR}
              isSharing={isSharing}
              onDownload={handleDownloadQR}
              isDownloading={isDownloading}
            />
          ) : (
            <TransactionEmpty />
          )}
        </div>
      </div>
    </main>
  );
}
