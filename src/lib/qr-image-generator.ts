export async function generateQRImage(
  qrPayload: string,
  amount: string,
  referenceNumber: string,
  merchantName: string,
  merchantCity: string,
  terminalId: string
): Promise<Blob> {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(qrPayload)}&logo=https://storage.googleapis.com/proudcity/mebanenc/uploads/2021/03/Peoples-Pay-Logo.png`;

  // Fetch the QR code image
  const response = await fetch(qrUrl);
  const blob = await response.blob();

  // Create canvas to combine QR code with caption
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  // Load QR image
  const img = document.createElement('img');
  img.crossOrigin = 'anonymous';
  const imgLoadPromise = new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });
  img.src = URL.createObjectURL(blob);
  await imgLoadPromise;

  // Set canvas dimensions (QR + caption area)
  const qrSize = 500;
  const padding = 30;
  const captionHeight = 280;
  canvas.width = qrSize + (padding * 2);
  canvas.height = qrSize + captionHeight + (padding * 2);

  // Fill background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw QR code
  ctx.drawImage(img, padding, padding, qrSize, qrSize);

  // Draw caption
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  const centerX = canvas.width / 2;
  let yPos = qrSize + padding + 40;

  // Title
  ctx.font = 'bold 24px Arial';
  ctx.fillText('Payment QR Code', centerX, yPos);
  yPos += 40;

  // Amount
  ctx.font = 'bold 28px Arial';
  ctx.fillStyle = '#16a34a';
  ctx.fillText(`LKR ${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, centerX, yPos);
  yPos += 35;

  // Details
  ctx.font = '18px Arial';
  ctx.fillStyle = '#000000';
  ctx.fillText(`Reference: ${referenceNumber}`, centerX, yPos);
  yPos += 30;
  ctx.fillText(`Merchant: ${merchantName}${merchantCity ? `, ${merchantCity}` : ''}`, centerX, yPos);
  yPos += 30;
  ctx.fillText(`Terminal: ${terminalId}`, centerX, yPos);
  yPos += 35;

  // Footer
  ctx.font = 'italic 16px Arial';
  ctx.fillStyle = '#666666';
  ctx.fillText('Scan this QR code to complete the payment', centerX, yPos);

  // Convert canvas to blob
  const compositeBlob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png', 1.0);
  });

  // Clean up
  URL.revokeObjectURL(img.src);

  return compositeBlob;
}
