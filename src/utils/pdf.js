import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsRoot = path.join(__dirname, '../../uploads');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function formatPkr(amount) {
  const n = Number(amount) || 0;
  return `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Generate a simple invoice PDF. Returns absolute file path + public URL path.
 */
export function generateInvoicePdf(sale, business = {}) {
  const dir = path.join(uploadsRoot, 'invoices');
  ensureDir(dir);
  const filename = `${sale.invoiceNumber || sale._id}.pdf`;
  const filePath = path.join(dir, filename);

  const doc = new PDFDocument({ margin: 50 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  doc.fontSize(20).text(business.name || 'CopperMart Trading', { align: 'left' });
  doc.fontSize(10).fillColor('#666').text(business.address || '');
  doc.text(business.phone || '');
  doc.moveDown();
  doc.fillColor('#1d4ed8').fontSize(14).text('*** ESTIMATE BILL ***', { align: 'center' });
  doc.moveDown(0.5);
  doc.fillColor('#000').fontSize(14).text(`Invoice / Estimate ${sale.invoiceNumber}`);
  doc.fontSize(10).text(`Date: ${new Date(sale.date || sale.createdAt).toLocaleString('en-PK')}`);
  doc.text(`Customer: ${sale.customerName || 'Walk-in'}`);
  doc.moveDown();

  doc.fontSize(11).text('Items', { underline: true });
  doc.moveDown(0.5);
  (sale.items || []).forEach((item, i) => {
    const line = (item.quantity || 0) * (item.unitPriceCharged || 0);
    doc
      .fontSize(10)
      .text(
        `${i + 1}. ${item.productName || item.product}  × ${item.quantity} ${item.unitUsed || ''} @ ${formatPkr(item.unitPriceCharged)} = ${formatPkr(line)}`
      );
  });

  doc.moveDown();
  doc.fontSize(12).text(`Total: ${formatPkr(sale.totalAmount)}`);
  doc.text(`Paid: ${formatPkr(sale.amountPaid)}`);
  doc.text(`Due: ${formatPkr(sale.dueAmount)}`);
  doc.text(`Mode: ${sale.paymentMode || '-'}`);
  doc.moveDown();
  doc.fontSize(9).fillColor('#666').text(business.footerNote || 'Thank you for your business!');
  doc.fillColor('#1e40af').fontSize(8).text('Developed by Tech Wave Software House | 03217165022', { align: 'center' });

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () =>
      resolve({
        filePath,
        filename,
        urlPath: `/uploads/invoices/${filename}`,
      })
    );
    stream.on('error', reject);
  });
}

export function generatePaymentReceiptPdf(payment, customer, business = {}) {
  const dir = path.join(uploadsRoot, 'receipts');
  ensureDir(dir);
  const filename = `RCP-${payment._id}.pdf`;
  const filePath = path.join(dir, filename);

  const doc = new PDFDocument({ margin: 50 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  doc.fontSize(18).text(business.name || 'CopperMart Trading');
  doc.moveDown();
  doc.fontSize(14).text('Payment Receipt');
  doc.fontSize(10).text(`Receipt ID: ${payment._id}`);
  doc.text(`Date: ${new Date(payment.date || Date.now()).toLocaleString('en-PK')}`);
  doc.text(`Customer: ${customer?.name || '-'}`);
  doc.text(`Amount: ${formatPkr(payment.amount)}`);
  doc.text(`Mode: ${payment.paymentMode}`);
  doc.text(`Type: ${payment.type}`);
  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () =>
      resolve({
        filePath,
        filename,
        urlPath: `/uploads/receipts/${filename}`,
      })
    );
    stream.on('error', reject);
  });
}
