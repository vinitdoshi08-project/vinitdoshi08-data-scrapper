import jsPDF from 'jspdf';
import { planLabel } from '../contexts/SubscriptionContext';

interface InvoiceData {
  paymentId: string;
  plan: string;
  date: string;
  amount: number;
  currency: string;
  status: string;
  customerName?: string;
  customerEmail?: string;
}

export function generateInvoicePDF(data: InvoiceData) {
  const doc = new jsPDF({
    unit: 'pt',
    format: 'a4',
  });

  const currencySymbol = data.currency === 'INR' ? 'Rs. ' : '$';
  const formattedAmount = `${currencySymbol}${((data.amount || 0) / 100).toFixed(2)} ${data.currency || 'USD'}`;
  const planName = data.plan ? planLabel(data.plan as any) : 'Starter';
  const invoiceNumber = (data.paymentId || 'INV-001').toUpperCase();
  const invoiceDate = data.date || new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

  // ── Colors ──
  const primaryColor = [52, 77, 225];    // #344de1 Scrapify Royal Blue
  const darkColor = [23, 32, 51];        // #172033
  const grayText = [105, 118, 140];      // #69768c
  const lightBg = [247, 249, 253];       // #f7f9fd
  const borderLine = [228, 234, 243];    // #e4eaf3

  // ── Header banner / background accent ──
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.rect(0, 0, 595, 130, 'F');

  // Top accent strip
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 595, 6, 'F');

  // Brand Name & Logo Badge
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.roundedRect(40, 35, 36, 36, 8, 8, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('S', 52, 60);

  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('Scrapify', 86, 58);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(grayText[0], grayText[1], grayText[2]);
  doc.text('All-in-One Data Intelligence Platform', 86, 73);

  // Invoice Title Right Aligned
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('TAX INVOICE', 555, 54, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(grayText[0], grayText[1], grayText[2]);
  doc.text(`Invoice #: ${invoiceNumber}`, 555, 72, { align: 'right' });
  doc.text(`Date: ${invoiceDate}`, 555, 87, { align: 'right' });

  // ── Details Box (Billed To & Payment Details) ──
  let curY = 160;

  // Left side: Billed To
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(grayText[0], grayText[1], grayText[2]);
  doc.text('BILLED TO:', 40, curY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text(data.customerName || 'Valued Customer', 40, curY + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(grayText[0], grayText[1], grayText[2]);
  if (data.customerEmail) {
    doc.text(data.customerEmail, 40, curY + 34);
  }

  // Right side: Payment Status badge & summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(grayText[0], grayText[1], grayText[2]);
  doc.text('PAYMENT DETAILS:', 380, curY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Status:`, 380, curY + 18);
  
  // Green badge for captured/paid
  doc.setFillColor(230, 255, 245);
  doc.roundedRect(425, curY + 6, 70, 17, 4, 4, 'F');
  doc.setTextColor(18, 139, 94);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text((data.status || 'PAID').toUpperCase(), 460, curY + 18, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(grayText[0], grayText[1], grayText[2]);
  doc.text(`Method: Razorpay Secure Checkout`, 380, curY + 34);

  // ── Table of items ──
  curY = 240;

  // Table header background
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(40, curY, 515, 28, 4, 4, 'F');
  doc.setDrawColor(borderLine[0], borderLine[1], borderLine[2]);
  doc.line(40, curY + 28, 555, curY + 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(grayText[0], grayText[1], grayText[2]);
  doc.text('DESCRIPTION', 55, curY + 18);
  doc.text('PLAN TYPE', 320, curY + 18);
  doc.text('QTY', 430, curY + 18, { align: 'center' });
  doc.text('AMOUNT', 540, curY + 18, { align: 'right' });

  // Table content row
  curY += 28;
  doc.setFillColor(255, 255, 255);
  doc.rect(40, curY, 515, 45, 'F');
  doc.setDrawColor(borderLine[0], borderLine[1], borderLine[2]);
  doc.line(40, curY + 45, 555, curY + 45);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text(`Scrapify ${planName} Plan Subscription`, 55, curY + 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(grayText[0], grayText[1], grayText[2]);
  doc.text('Unlimited web, YouTube & Maps scraping access', 55, curY + 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text(planName, 320, curY + 24);

  doc.text('1', 430, curY + 24, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.text(formattedAmount, 540, curY + 24, { align: 'right' });

  // ── Calculation Summary ──
  curY += 65;

  const summaryX = 350;
  const valueX = 540;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(grayText[0], grayText[1], grayText[2]);
  doc.text('Subtotal:', summaryX, curY);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text(formattedAmount, valueX, curY, { align: 'right' });

  curY += 20;
  doc.setTextColor(grayText[0], grayText[1], grayText[2]);
  doc.text('Tax (0% GST / Inclusive):', summaryX, curY);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text(`${currencySymbol}0.00`, valueX, curY, { align: 'right' });

  curY += 15;
  doc.setDrawColor(borderLine[0], borderLine[1], borderLine[2]);
  doc.line(summaryX, curY, 555, curY);

  curY += 20;
  // Total Row
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(summaryX - 10, curY - 14, 215, 34, 6, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('Total Paid:', summaryX, curY + 8);

  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFontSize(13);
  doc.text(formattedAmount, valueX, curY + 8, { align: 'right' });

  // ── Bottom Notice / Footer ──
  const footerY = 730;
  doc.setDrawColor(borderLine[0], borderLine[1], borderLine[2]);
  doc.line(40, footerY, 555, footerY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('Thank you for choosing Scrapify!', 40, footerY + 25);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(grayText[0], grayText[1], grayText[2]);
  doc.text('If you have any questions concerning this invoice or your subscription, contact support@scrapify.com', 40, footerY + 40);
  doc.text('This is a computer-generated receipt and requires no physical signature.', 40, footerY + 54);

  // Trigger browser download
  const safePlan = (data.plan || 'plan').toLowerCase();
  const safeId = (data.paymentId || 'invoice').slice(-8);
  doc.save(`Scrapify_Invoice_${safePlan}_${safeId}.pdf`);
}
