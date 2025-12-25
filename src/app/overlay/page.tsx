"use client";

import { useEffect, useState } from "react";
import { TransactionStatus } from "@/components/qr-registration/TransactionStatus";
import type { Transaction } from "@/lib/types";

export default function OverlayPage() {
  const [tx, setTx] = useState<Transaction | null>(null);

  useEffect(() => {
    const channel = new BroadcastChannel('lankaqr-overlay');
    const onMsg = (ev: MessageEvent) => {
      try {
        const data = ev.data as any;
        if (data && data.type === 'transaction') {
          setTx(data.payload as Transaction);
        }
      } catch (e) {
        console.warn('Overlay message parse error', e);
      }
    };
    channel.addEventListener('message', onMsg);

    // Also support Electron overlay IPC via preload bridge
    const tryAttachElectron = () => {
      try {
        if ((window as any).electronOverlay && (window as any).electronOverlay.onTransaction) {
          (window as any).electronOverlay.onTransaction((payload: any) => {
            setTx(payload as Transaction);
          });
        }
      } catch (e) { /* ignore */ }
    };

    tryAttachElectron();

    return () => {
      channel.removeEventListener('message', onMsg);
      channel.close();
    };
  }, []);

  if (!tx) {
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh'}}>
        <div style={{textAlign:'center',color:'#666'}}>Waiting for payment...</div>
      </div>
    );
  }

  return (
    <div style={{padding:12}}>
      <TransactionStatus
        transaction={tx}
        onVerify={() => {}}
        isVerifying={false}
        onShare={() => {}}
        isSharing={false}
        onDownload={() => {}}
        isDownloading={false}
        includeReference={true}
      />
    </div>
  );
}
