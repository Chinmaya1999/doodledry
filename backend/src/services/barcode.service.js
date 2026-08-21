import QRCode from 'qrcode';
import bwipjs from 'bwip-js';
import { nextSequence, formatSequence } from '../models/Counter.js';

/**
 * Identity conventions:
 *  - productId : PRD-000001            (sequential, human friendly)
 *  - sku       : <ageCode>-<designCode>-<typeCode>-<colorCode>  e.g. 06M-HUN-FS-RED
 *  - barcode   : same value as sku, encoded as Code128 (barcodes must be
 *                short/alphanumeric and printable on a small clothing label)
 *  - qrCode    : the productId, encoded as a QR code (QR can carry more
 *                data so it is decoupled from the barcode value)
 * A scan of either code is resolved through a single "lookup" endpoint that
 * matches against sku, barcode, qrCode or productId - so it does not matter
 * which physical code was scanned.
 */

export async function generateProductId(session) {
  const seq = await nextSequence('productId', session);
  return formatSequence('PRD', seq);
}

export async function generateSaleId(session) {
  const seq = await nextSequence('saleId', session);
  return formatSequence('SALE', seq);
}

export async function generateReturnId(session) {
  const seq = await nextSequence('returnId', session);
  return formatSequence('RTN', seq);
}

export function buildSku({ ageGroupCode, designCode, productTypeCode, colorCode }) {
  return [ageGroupCode, designCode, productTypeCode, colorCode]
    .filter(Boolean)
    .map((part) => String(part).toUpperCase().replace(/[^A-Z0-9]/g, ''))
    .join('-');
}

export async function renderQrDataUrl(payload) {
  return QRCode.toDataURL(payload, { margin: 1, width: 300, errorCorrectionLevel: 'M' });
}

export async function renderBarcodeDataUrl(value) {
  const png = await bwipjs.toBuffer({
    bcid: 'code128',
    text: value,
    scale: 3,
    height: 12,
    includetext: true,
    textxalign: 'center',
  });
  return `data:image/png;base64,${png.toString('base64')}`;
}

export async function renderProductCodes(product) {
  const [qrImage, barcodeImage] = await Promise.all([
    renderQrDataUrl(product.qrCode),
    renderBarcodeDataUrl(product.barcode),
  ]);
  return { qrImage, barcodeImage };
}

export default {
  generateProductId,
  generateSaleId,
  generateReturnId,
  buildSku,
  renderQrDataUrl,
  renderBarcodeDataUrl,
  renderProductCodes,
};
