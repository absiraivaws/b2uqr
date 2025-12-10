export async function generateQRImage(
  qrPayload: string,
  amount: string,
  referenceNumber: string,
  merchantName: string,
  merchantCity: string,
  includeReference: boolean = true
): Promise<Blob> {
  const qrSize = 500;
  const padding = 30;
  const captionHeight = 280;

  // Fetch QR code image from API
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(qrPayload)}`;
  const qrResponse = await fetch(qrUrl);
  const qrBlob = await qrResponse.blob();

  // Create canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  canvas.width = qrSize + padding * 2;
  canvas.height = qrSize + captionHeight + padding * 2;

  // Fill background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Load QR image
  const qrImg = document.createElement('img');
  qrImg.crossOrigin = 'anonymous';
  const qrLoadPromise = new Promise((resolve, reject) => {
    qrImg.onload = resolve;
    qrImg.onerror = reject;
  });
  qrImg.src = URL.createObjectURL(qrBlob);
  await qrLoadPromise;

  // Draw QR
  ctx.drawImage(qrImg, padding, padding, qrSize, qrSize);

  // Load and draw logo at center of QR
  const logoUrl = '/lankaQR.png';
  const logoImg = document.createElement('img');
  logoImg.crossOrigin = 'anonymous';
  const logoLoadPromise = new Promise((resolve, reject) => {
    logoImg.onload = resolve;
    logoImg.onerror = reject;
  });
  logoImg.src = logoUrl;
  await logoLoadPromise;

  const logoSize = qrSize * 0.2; // 20% of QR size
  ctx.drawImage(
    logoImg,
    padding + (qrSize - logoSize) / 2,
    padding + (qrSize - logoSize) / 2,
    logoSize,
    logoSize
  );

  // Draw captions
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  let yPos = qrSize + padding + 40;

  // Title
  ctx.font = 'bold 24px Arial';
  ctx.fillText('Payment QR Code', canvas.width / 2, yPos);
  yPos += 40;

  // Amount
  ctx.font = 'bold 28px Arial';
  ctx.fillStyle = '#16a34a';
  ctx.fillText(`LKR ${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, canvas.width / 2, yPos);
  yPos += 35;

  // Details
  ctx.font = '18px Arial';
  ctx.fillStyle = '#000000';
  if (includeReference && referenceNumber) {
    ctx.fillText(`Reference: ${referenceNumber}`, canvas.width / 2, yPos);
    yPos += 30;
  }
  ctx.fillText(`Merchant: ${merchantName}${merchantCity ? `, ${merchantCity}` : ''}`, canvas.width / 2, yPos);
  yPos += 30;

  // Footer
  ctx.font = 'italic 16px Arial';
  ctx.fillStyle = '#666666';
  ctx.fillText('Scan this QR code to complete the payment', canvas.width / 2, yPos);

  // Convert canvas to Blob
  const finalBlob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png', 1.0);
  });

  // Cleanup
  URL.revokeObjectURL(qrImg.src);
  URL.revokeObjectURL(logoImg.src);

  return finalBlob;
}
