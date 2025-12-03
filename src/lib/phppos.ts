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
  const recordedAt = new Date().toISOString();
  const docId = sale?.sale_id ? String(sale.sale_id) : `phppos_${Date.now()}`;

  const record = {
    sale_id: sale?.sale_id ?? null,
    total: sale?.total ?? null,
    sale_time: sale?.sale_time ?? sale?.created_at ?? null,
    receipt_url: sale?.receipt_url ?? null,
    transaction_uuid: meta.transactionUuid ?? null,
    reference_number: meta.referenceNumber ?? (sale as any)?.reference_number ?? null,
    recorded_by_uid: meta.uid ?? null,
    recorded_at: recordedAt,
    payload: sale,
  };

  await adminDb.collection(SALES_COLLECTION).doc(docId).set(record, { merge: true });

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
        phppos_sale_recorded_at: recordedAt,
        updated_at: recordedAt,
      },
      { merge: true }
    );
  }
}
