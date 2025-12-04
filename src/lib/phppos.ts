import { adminDb } from "./firebaseAdmin";
import { getDbTransaction } from "./db";
import type { PhpposSale } from "./types";

const SALES_COLLECTION = "phppos_sales";

export interface PersistPhpposSaleMeta {
  transactionUuid?: string | null;
  referenceNumber?: string | null;
  uid?: string | null;
}

export async function persistPhpposSale(
  sale: PhpposSale,
  meta: PersistPhpposSaleMeta = {}
): Promise<void> {
  const createdAt = new Date().toISOString();
  const documentId = sale?.sale_id ? String(sale.sale_id) : `phppos_${Date.now()}`;
  const numericTotal =
    typeof sale?.total === "number"
      ? sale.total
      : sale?.total !== undefined && sale?.total !== null
      ? parseFloat(String(sale.total))
      : null;

  const payments = Array.isArray((sale as any)?.payments) ? (sale as any).payments : [];
  const calculatedTotal = payments.reduce((sum: number, payment: any) => {
    const type = String(payment?.payment_type ?? "").toLowerCase();
    if (type !== "qr") {
      return sum;
    }
    const amountValue =
      typeof payment?.payment_amount === "number"
        ? payment.payment_amount
        : payment?.payment_amount !== undefined && payment?.payment_amount !== null
        ? parseFloat(String(payment.payment_amount))
        : 0;
    return Number.isFinite(amountValue) ? sum + amountValue : sum;
  }, 0);

  const record = {
    saleId: sale?.sale_id ?? documentId,
    total: numericTotal,
    calculatedTotal,
    createdAt,
    createdBy: meta.uid ?? null,
  };

  await adminDb.collection(SALES_COLLECTION).doc(documentId).set(record);

  if (meta.transactionUuid) {
    const existingTx = await getDbTransaction(meta.transactionUuid);
    if (!existingTx) {
      console.warn(`Transaction ${meta.transactionUuid} not found when linking PHPPOS sale.`);
      return;
    }

    await adminDb.collection("transactions").doc(meta.transactionUuid).set(
      {
        phppos_sale_id: sale?.sale_id ?? null,
        phppos_sale_total:
          sale?.total !== undefined && sale?.total !== null ? String(sale.total) : null,
        phppos_sale_recorded_at: createdAt,
        updated_at: createdAt,
      },
      { merge: true }
    );
  }
}
