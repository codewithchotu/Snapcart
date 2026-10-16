import QRCode from "qrcode";

// Use the canonical public URL if provided, otherwise fall back to localhost for development.
const APP_URL =
  (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "")) || "http://localhost:3000";

/**
 * Generate a data‑URL PNG containing a QR code that points to the public store page.
 * The URL always respects NEXT_PUBLIC_APP_URL (production) and falls back to localhost.
 */
export const generateStoreQR = async (storeId: string): Promise<string> => {
  const url = `${APP_URL}/store/${storeId}`;
  return QRCode.toDataURL(url, { width: 256, margin: 1 });
};
