import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { InvoiceRecord, CompanySettings, InvoiceType } from '../types';
import { formatDateToIndian, formatIndianCurrency } from './financialYear';
import { calculateInvoiceTotals } from './taxCalculator';

// Cache for loaded base64 fonts to avoid re-fetching
let cachedRegularFont: string | null = null;
let cachedBoldFont: string | null = null;
let cachedBoldItalicFont: string | null = null;

async function fetchFontAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function fetchImageAsDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) {
    return url;
  }
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('Could not load image as data URL:', url, err);
    return '';
  }
}

async function loadFonts(doc: jsPDF): Promise<void> {
  try {
    if (!cachedRegularFont) {
      cachedRegularFont = await fetchFontAsBase64('/fonts/trebuc.ttf');
    }
    if (!cachedBoldFont) {
      cachedBoldFont = await fetchFontAsBase64('/fonts/trebucbd.ttf');
    }
    if (!cachedBoldItalicFont) {
      cachedBoldItalicFont = await fetchFontAsBase64('/fonts/trebucbi.ttf');
    }

    doc.addFileToVFS('TrebuchetMS-Regular.ttf', cachedRegularFont);
    doc.addFont('TrebuchetMS-Regular.ttf', 'TrebuchetMS', 'normal');

    doc.addFileToVFS('TrebuchetMS-Bold.ttf', cachedBoldFont);
    doc.addFont('TrebuchetMS-Bold.ttf', 'TrebuchetMS', 'bold');

    doc.addFileToVFS('TrebuchetMS-BoldItalic.ttf', cachedBoldItalicFont);
    doc.addFont('TrebuchetMS-BoldItalic.ttf', 'TrebuchetMS', 'bolditalic');
  } catch (e) {
    console.warn('Failed to load embedded Trebuchet MS font, using Helvetica fallback:', e);
  }
}

/**
 * Creates an authentic film-industry styled jsPDF document for Deven Jha Productions.
 * Matches the reference image styling: gold accents, black headers, structured tables,
 * dynamic settings, logo, QR code, and signature badge.
 */
export async function createInvoicePDFDocument(
  invoice: InvoiceRecord,
  companySettings?: CompanySettings
): Promise<jsPDF> {
  const settings = invoice.companySnapshot || companySettings;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4', // 595.28 x 841.89 pt
  });

  await loadFonts(doc);

  const fontName = doc.getFontList()['TrebuchetMS'] ? 'TrebuchetMS' : 'Helvetica';

  // Standard A4 Metrics in points (72 pt/inch)
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const marginX = 39.5;
  const tableWidth = pageWidth - marginX * 2; // 516.28 pt

  // Film-Industry Premium Color Palette
  const goldBorderColor = { r: 197, g: 160, b: 89 }; // #c5a059 champagne gold
  const goldHeaderTextColor = { r: 229, g: 192, b: 123 }; // #e5c07b warm gold
  const darkHeaderBg = { r: 12, g: 13, b: 16 }; // #0c0d10 rich charcoal black
  const altRowBg = { r: 251, g: 248, b: 242 }; // #fbf8f2 warm off-white tint
  const subtotalBg = { r: 245, g: 235, b: 216 }; // #f5ebd8 warm gold-beige
  const lightBorderColor = { r: 232, g: 220, b: 206 }; // #e8dcce
  const charcoalText = { r: 17, g: 17, b: 17 }; // #111111

  // 1. Top Decorative Golden Wave Accents (Top Right)
  doc.setFillColor(goldBorderColor.r, goldBorderColor.g, goldBorderColor.b);
  doc.triangle(pageWidth - 210, 0, pageWidth, 0, pageWidth, 42, 'F');
  doc.setFillColor(253, 244, 216); // light champagne overlay
  doc.triangle(pageWidth - 140, 0, pageWidth, 0, pageWidth, 24, 'F');

  // 2. Company Logo (Top Left)
  const logoUrl = settings?.logoUrl || settings?.logoDataUrl || '/assets/logo.png';
  let logoDrawn = false;
  try {
    const logoData = await fetchImageAsDataUrl(logoUrl);
    if (logoData) {
      doc.addImage(logoData, 'PNG', marginX, 28, 56, 48);
      logoDrawn = true;
    }
  } catch (err) {
    console.warn('Error adding logo to PDF:', err);
  }

  if (!logoDrawn) {
    doc.setFillColor(darkHeaderBg.r, darkHeaderBg.g, darkHeaderBg.b);
    doc.circle(marginX + 28, 52, 24, 'F');
    doc.setFont(fontName, 'bold');
    doc.setFontSize(14);
    doc.setTextColor(goldHeaderTextColor.r, goldHeaderTextColor.g, goldHeaderTextColor.b);
    doc.text('DJP', marginX + 28, 57, { align: 'center' });
  }

  // 3. Vertical Divider Line beside Logo
  const dividerX = marginX + 66;
  doc.setDrawColor(goldBorderColor.r, goldBorderColor.g, goldBorderColor.b);
  doc.setLineWidth(1.2);
  doc.line(dividerX, 32, dividerX, 72);

  // 4. Company Name Beside Logo
  const companyTitleX = dividerX + 12;
  doc.setFont(fontName, 'bold');
  doc.setFontSize(18);
  doc.setTextColor(charcoalText.r, charcoalText.g, charcoalText.b);
  doc.text(settings?.companyName || 'Deven Jha Productions', companyTitleX, 56);

  // 5. INVOICE / TAX INVOICE Title (Top Right)
  const isTax = invoice.invoiceType === 'tax';
  doc.setFont(fontName, 'bold');
  doc.setFontSize(22);
  doc.setTextColor(charcoalText.r, charcoalText.g, charcoalText.b);
  const invoiceTitleText = isTax ? 'TAX INVOICE' : 'INVOICE';
  const invoiceTitleW = doc.getTextWidth(invoiceTitleText);
  const invoiceTitleX = pageWidth - marginX - invoiceTitleW;
  doc.text(invoiceTitleText, invoiceTitleX, 56);

  // Gold accent bar under INVOICE title
  doc.setFillColor(goldBorderColor.r, goldBorderColor.g, goldBorderColor.b);
  doc.roundedRect(pageWidth - marginX - 54, 62, 54, 2.5, 1, 1, 'F');

  // 6. Company Address Directly Below Logo
  doc.setFont(fontName, 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(34, 34, 34);

  let addrY = 88;
  if (settings?.addressLine1) {
    doc.text(settings.addressLine1, marginX, addrY);
    addrY += 10.5;
  }
  if (settings?.addressLine2) {
    doc.text(settings.addressLine2, marginX, addrY);
    addrY += 10.5;
  }
  if (settings?.addressLine3) {
    doc.text(settings.addressLine3, marginX, addrY);
    addrY += 10.5;
  }

  // 7. Contact Details with Mini Badge Icons
  const contactY = Math.max(addrY + 3, 122);
  const contactValX = marginX + 54;

  const drawMiniBadge = (y: number, text: string) => {
    doc.setFillColor(darkHeaderBg.r, darkHeaderBg.g, darkHeaderBg.b);
    doc.circle(marginX + 5, y - 2.5, 5.5, 'F');
    doc.setFont(fontName, 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(255, 255, 255);
    doc.text(text, marginX + 5, y - 0.5, { align: 'center' });
  };

  // GSTIN
  drawMiniBadge(contactY, 'GT');
  doc.setFont(fontName, 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(charcoalText.r, charcoalText.g, charcoalText.b);
  doc.text('GSTIN', marginX + 14, contactY);
  doc.text(':', marginX + 46, contactY);
  doc.text(settings?.gstin || '09PQRPK4105E1ZG', contactValX, contactY);

  // Phone
  drawMiniBadge(contactY + 12, 'PH');
  doc.setFont(fontName, 'normal');
  doc.text('Phone', marginX + 14, contactY + 12);
  doc.text(':', marginX + 46, contactY + 12);
  doc.text(settings?.phone || '8076187274', contactValX, contactY + 12);

  // Email
  drawMiniBadge(contactY + 24, '@');
  doc.text('Email Id', marginX + 14, contactY + 24);
  doc.text(':', marginX + 46, contactY + 24);
  doc.text(settings?.email || 'info@devenjhaproductions.com', contactValX, contactY + 24);

  // Website
  drawMiniBadge(contactY + 36, 'W');
  doc.text('Website', marginX + 14, contactY + 36);
  doc.text(':', marginX + 46, contactY + 36);
  doc.text(settings?.website || 'www.devenjhaproductions.com', contactValX, contactY + 36);

  // 8. Date & Invoice No Rounded Card (Aligned on Right)
  const metaCardW = 146;
  const metaCardH = 46;
  const metaCardX = pageWidth - marginX - metaCardW;
  const metaCardY = contactY - 14;

  doc.setDrawColor(goldBorderColor.r, goldBorderColor.g, goldBorderColor.b);
  doc.setLineWidth(1.2);
  doc.roundedRect(metaCardX, metaCardY, metaCardW, metaCardH, 6, 6, 'S');

  // Divider between row 1 and row 2
  doc.line(metaCardX, metaCardY + 23, metaCardX + metaCardW, metaCardY + 23);
  // Vertical column divider
  doc.line(metaCardX + 64, metaCardY, metaCardX + 64, metaCardY + metaCardH);

  // Row 1: Date
  doc.setFont(fontName, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(charcoalText.r, charcoalText.g, charcoalText.b);
  doc.text('Date', metaCardX + 8, metaCardY + 15);
  const formattedDate = formatDateToIndian(invoice.date);
  doc.text(formattedDate, metaCardX + 64 + (metaCardW - 64) / 2, metaCardY + 15, { align: 'center' });

  // Row 2: Invoice No
  doc.text('Invoice No.', metaCardX + 8, metaCardY + 38);
  doc.text(invoice.invoiceNumber || 'DJP/2026-27/01', metaCardX + 64 + (metaCardW - 64) / 2, metaCardY + 38, { align: 'center' });

  // 9. Bill To Section
  const billToY = contactY + 46;
  const billToW = 236;
  const customerName = invoice.customerName.trim() || 'M/s. BrainSpace';
  const customerAddress = invoice.customerAddress.trim();
  const addressLines = doc.splitTextToSize(customerAddress, billToW - 16);
  const mobileVal = invoice.customerMobile?.trim();

  const billToBodyH = 14 + Math.max(22, addressLines.length * 10 + 4) + 12 + (isTax ? 12 : 0);

  // Rounded outer border
  doc.setDrawColor(goldBorderColor.r, goldBorderColor.g, goldBorderColor.b);
  doc.setLineWidth(1.2);
  doc.roundedRect(marginX, billToY, billToW, billToBodyH, 6, 6, 'S');

  // Solid black tab at top-left: "Bill To :"
  doc.setFillColor(darkHeaderBg.r, darkHeaderBg.g, darkHeaderBg.b);
  doc.roundedRect(marginX, billToY, 68, 14, 3, 3, 'F');
  doc.setFont(fontName, 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(goldHeaderTextColor.r, goldHeaderTextColor.g, goldHeaderTextColor.b);
  doc.text('Bill To :', marginX + 8, billToY + 10);

  // Client Details inside
  doc.setFont(fontName, 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(charcoalText.r, charcoalText.g, charcoalText.b);
  let billToLineY = billToY + 26;
  doc.text(customerName, marginX + 8, billToLineY);

  doc.setFont(fontName, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(50, 50, 50);
  billToLineY += 11;
  for (const line of addressLines) {
    doc.text(line, marginX + 8, billToLineY);
    billToLineY += 9.5;
  }

  doc.setFont(fontName, 'normal');
  billToLineY += 2;
  doc.text(`Mobile : ${mobileVal || '+91 88664 30075'}`, marginX + 8, billToLineY);

  if (isTax && invoice.customerGstin) {
    billToLineY += 10.5;
    doc.setFont(fontName, 'bold');
    doc.text(`GSTIN : ${invoice.customerGstin.trim()}`, marginX + 8, billToLineY);
  }

  // 10. Itemized Table
  const tableY = billToY + billToBodyH + 12;
  const colDescW = Math.round(tableWidth * 0.73);
  const colHsnW = Math.round(tableWidth * 0.11);
  const colAmountW = tableWidth - colDescW - colHsnW;

  const col1X = marginX;
  const col2X = col1X + colDescW;
  const col3X = col2X + colHsnW;
  const colRightX = col1X + tableWidth;
  const tableHeaderH = 18;

  // Black Table Header Bar with Gold Border
  doc.setFillColor(darkHeaderBg.r, darkHeaderBg.g, darkHeaderBg.b);
  doc.roundedRect(col1X, tableY, tableWidth, tableHeaderH, 4, 4, 'F');
  doc.setDrawColor(goldBorderColor.r, goldBorderColor.g, goldBorderColor.b);
  doc.setLineWidth(1.2);
  doc.roundedRect(col1X, tableY, tableWidth, tableHeaderH, 4, 4, 'S');

  // Header column divider lines
  doc.setDrawColor(50, 50, 50);
  doc.line(col2X, tableY, col2X, tableY + tableHeaderH);
  doc.line(col3X, tableY, col3X, tableY + tableHeaderH);

  // Header text
  doc.setFont(fontName, 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(goldHeaderTextColor.r, goldHeaderTextColor.g, goldHeaderTextColor.b);
  doc.text('DESCRIPTION', col1X + 10, tableY + 12.5);
  doc.text('HSN/SAC', col2X + colHsnW / 2, tableY + 12.5, { align: 'center' });
  doc.text('AMOUNT', colRightX - 10, tableY + 12.5, { align: 'right' });

  // Calculate totals
  const totals = calculateInvoiceTotals({
    invoiceType: invoice.invoiceType,
    items: invoice.items,
    taxMode: invoice.taxMode,
    cgstRate: invoice.cgstRate,
    sgstRate: invoice.sgstRate,
    igstRate: invoice.igstRate,
  });

  interface TableRowDef {
    type: 'item' | 'blank' | 'cgst' | 'sgst' | 'igst';
    description: string;
    hsnSac?: string;
    amount?: string;
    isBold?: boolean;
    isSgstIndent?: boolean;
  }

  const tableRows: TableRowDef[] = [];
  const maxDescW = colDescW - 16;
  const items = invoice.items || [];

  items.forEach((item) => {
    const descText = item.description || '';
    const lines = doc.splitTextToSize(descText, maxDescW);
    const descLines: string[] = lines.length > 0 ? lines : [''];

    const hasAmount =
      item.amount !== '' &&
      item.amount !== undefined &&
      item.amount !== null &&
      !isNaN(Number(item.amount));
    const amtStr = hasAmount ? formatIndianCurrency(Number(item.amount)) : '';

    descLines.forEach((lineText: string, lineIdx: number) => {
      tableRows.push({
        type: 'item',
        description: lineText,
        hsnSac: lineIdx === 0 ? (item.hsnSac || '') : '',
        amount: lineIdx === 0 ? amtStr : '',
      });
    });
  });

  // Leave one blank line before tax breakdown
  if (isTax && items.length > 0) {
    tableRows.push({
      type: 'blank',
      description: '',
      hsnSac: '',
      amount: '',
    });
  }

  // Tax Breakdown Rows
  if (isTax) {
    if (totals.taxMode === 'cgst_sgst') {
      tableRows.push({
        type: 'cgst',
        description: `Add: CGST @ ${totals.cgstRate || 0}%`,
        hsnSac: invoice.cgstHsnSac?.trim() || '',
        amount: formatIndianCurrency(totals.cgstAmount),
        isBold: true,
      });
      tableRows.push({
        type: 'sgst',
        description: `SGST @ ${totals.sgstRate || 0}%`,
        hsnSac: invoice.sgstHsnSac?.trim() || '',
        amount: formatIndianCurrency(totals.sgstAmount),
        isBold: true,
        isSgstIndent: true,
      });
    } else if (totals.taxMode === 'igst') {
      tableRows.push({
        type: 'igst',
        description: `Add: IGST @ ${totals.igstRate || 0}%`,
        hsnSac: invoice.igstHsnSac?.trim() || '',
        amount: formatIndianCurrency(totals.igstAmount),
        isBold: true,
      });
    }
  }

  // Minimum 8 rows
  const minRows = 8;
  while (tableRows.length < minRows) {
    tableRows.push({
      type: 'blank',
      description: '',
      hsnSac: '',
      amount: '',
    });
  }

  const rowH = 15;
  const bodyHeight = tableRows.length * rowH;
  let currentY = tableY + tableHeaderH;

  // Draw rows with subtle alternating background
  for (let i = 0; i < tableRows.length; i++) {
    const row = tableRows[i];

    if (i % 2 === 0) {
      doc.setFillColor(altRowBg.r, altRowBg.g, altRowBg.b);
      doc.rect(col1X, currentY, tableWidth, rowH, 'F');
    }

    if (row.type !== 'blank') {
      doc.setFont(fontName, row.isBold ? 'bold' : 'normal');
      doc.setFontSize(8.2);
      doc.setTextColor(charcoalText.r, charcoalText.g, charcoalText.b);

      const textY = currentY + (rowH * 0.7);

      if (row.description) {
        let descX = col1X + 10;
        if (row.isSgstIndent) {
          doc.setFont(fontName, 'bold');
          const addPrefixWidth = doc.getTextWidth('Add: ');
          descX += addPrefixWidth;
        }
        doc.text(row.description, descX, textY);
      }

      if (row.hsnSac) {
        doc.text(row.hsnSac, col2X + colHsnW / 2, textY, { align: 'center' });
      }

      if (row.amount) {
        doc.text(row.amount, colRightX - 10, textY, { align: 'right' });
      }
    }

    currentY += rowH;
  }

  // Outer border around table body
  doc.setDrawColor(goldBorderColor.r, goldBorderColor.g, goldBorderColor.b);
  doc.setLineWidth(1.2);
  doc.rect(col1X, tableY + tableHeaderH, tableWidth, bodyHeight, 'S');

  // Column vertical dividers in table body
  doc.setDrawColor(lightBorderColor.r, lightBorderColor.g, lightBorderColor.b);
  doc.setLineWidth(0.8);
  doc.line(col2X, tableY + tableHeaderH, col2X, tableY + tableHeaderH + bodyHeight);
  doc.line(col3X, tableY + tableHeaderH, col3X, tableY + tableHeaderH + bodyHeight);

  // Subtotal / Total Row at Table Bottom
  const subtotalRowH = 18;
  const subtotalY = tableY + tableHeaderH + bodyHeight;

  // Subtotal label and value cells with warm gold-beige background
  doc.setFillColor(subtotalBg.r, subtotalBg.g, subtotalBg.b);
  doc.rect(col2X, subtotalY, colHsnW + colAmountW, subtotalRowH, 'F');

  doc.setDrawColor(goldBorderColor.r, goldBorderColor.g, goldBorderColor.b);
  doc.setLineWidth(1.2);
  doc.rect(col2X, subtotalY, colHsnW, subtotalRowH, 'S');
  doc.rect(col3X, subtotalY, colAmountW, subtotalRowH, 'S');

  doc.setFont(fontName, 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(charcoalText.r, charcoalText.g, charcoalText.b);
  const bottomLabel = isTax ? 'Total' : 'Sub-Total';
  doc.text(bottomLabel, col2X + colHsnW / 2, subtotalY + 12.5, { align: 'center' });

  doc.setFont(fontName, 'bold');
  doc.setFontSize(9.5);
  const finalTotalStr = formatIndianCurrency(isTax ? totals.grandTotal : totals.subtotal);
  doc.text(finalTotalStr, colRightX - 10, subtotalY + 12.5, { align: 'right' });

  // 11. Bottom Section: Payment Terms & Account Details on Left; SCAN AND PAY on Right
  const bottomSectionY = subtotalY + subtotalRowH + 12;
  const bottomWLeft = 340;

  // Payment Terms Card
  const termsHeaderH = 14;
  doc.setFillColor(darkHeaderBg.r, darkHeaderBg.g, darkHeaderBg.b);
  doc.roundedRect(marginX, bottomSectionY, bottomWLeft, termsHeaderH, 4, 4, 'F');
  doc.setDrawColor(goldBorderColor.r, goldBorderColor.g, goldBorderColor.b);
  doc.setLineWidth(1);
  doc.roundedRect(marginX, bottomSectionY, bottomWLeft, termsHeaderH, 4, 4, 'S');

  doc.setFont(fontName, 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(goldHeaderTextColor.r, goldHeaderTextColor.g, goldHeaderTextColor.b);
  doc.text('Payment Terms:', marginX + 8, bottomSectionY + 10);

  const termsText = settings?.paymentTerms || '1. 50% Advance & Balance 50% after completion of work.';
  const termsLines = doc.splitTextToSize(termsText, bottomWLeft - 16);
  const termsContentH = Math.max(18, termsLines.length * 10 + 6);

  doc.setDrawColor(goldBorderColor.r, goldBorderColor.g, goldBorderColor.b);
  doc.roundedRect(marginX, bottomSectionY + termsHeaderH, bottomWLeft, termsContentH, 4, 4, 'S');

  doc.setFont(fontName, 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(34, 34, 34);
  let termLineY = bottomSectionY + termsHeaderH + 11;
  for (const line of termsLines) {
    doc.text(line, marginX + 8, termLineY);
    termLineY += 9.5;
  }

  // Account Details Card
  const acctBoxY = bottomSectionY + termsHeaderH + termsContentH + 8;
  const acctHeaderH = 14;
  doc.setFillColor(darkHeaderBg.r, darkHeaderBg.g, darkHeaderBg.b);
  doc.roundedRect(marginX, acctBoxY, bottomWLeft, acctHeaderH, 4, 4, 'F');
  doc.setDrawColor(goldBorderColor.r, goldBorderColor.g, goldBorderColor.b);
  doc.setLineWidth(1);
  doc.roundedRect(marginX, acctBoxY, bottomWLeft, acctHeaderH, 4, 4, 'S');

  doc.setFont(fontName, 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(goldHeaderTextColor.r, goldHeaderTextColor.g, goldHeaderTextColor.b);
  doc.text('Account Details:', marginX + 8, acctBoxY + 10);

  const acctContentH = 62;
  doc.roundedRect(marginX, acctBoxY + acctHeaderH, bottomWLeft, acctContentH, 4, 4, 'S');

  doc.setFont(fontName, 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(charcoalText.r, charcoalText.g, charcoalText.b);
  let acctLineY = acctBoxY + acctHeaderH + 11;
  doc.text(settings?.bankName || 'Slice Small Finance Bank', marginX + 8, acctLineY);

  doc.setFont(fontName, 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(50, 50, 50);
  acctLineY += 12;

  doc.text('A/C No.', marginX + 8, acctLineY);
  doc.text(':', marginX + 54, acctLineY);
  doc.setFont(fontName, 'bold');
  doc.text(settings?.accountNo || '033911501053615', marginX + 62, acctLineY);
  doc.setFont(fontName, 'normal');
  acctLineY += 11;

  doc.text('Name', marginX + 8, acctLineY);
  doc.text(':', marginX + 54, acctLineY);
  doc.text(settings?.accountHolderName || 'Manshi Group of Services', marginX + 62, acctLineY);
  acctLineY += 11;

  doc.text('IFSC Code', marginX + 8, acctLineY);
  doc.text(':', marginX + 54, acctLineY);
  doc.setFont(fontName, 'bold');
  doc.text(settings?.ifscCode || 'NSF0000333', marginX + 62, acctLineY);
  doc.setFont(fontName, 'normal');
  acctLineY += 11;

  doc.text('Branch', marginX + 8, acctLineY);
  doc.text(':', marginX + 54, acctLineY);
  doc.text(settings?.branch || 'Koramangala, Bengaluru', marginX + 62, acctLineY);

  // 12. SCAN AND PAY (Right Column)
  const qrCardW = 126;
  const qrX = pageWidth - marginX - qrCardW;
  const qrTopY = bottomSectionY;

  // Header: — SCAN AND PAY —
  doc.setDrawColor(goldBorderColor.r, goldBorderColor.g, goldBorderColor.b);
  doc.setLineWidth(0.8);
  doc.line(qrX, qrTopY + 5, qrX + 18, qrTopY + 5);
  doc.line(qrX + qrCardW - 18, qrTopY + 5, qrX + qrCardW, qrTopY + 5);

  doc.setFont(fontName, 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(charcoalText.r, charcoalText.g, charcoalText.b);
  doc.text('SCAN AND PAY', qrX + qrCardW / 2, qrTopY + 8, { align: 'center' });

  // QR Card Box
  const qrBoxY = qrTopY + 14;
  const qrBoxH = 118;
  doc.setDrawColor(goldBorderColor.r, goldBorderColor.g, goldBorderColor.b);
  doc.setLineWidth(1.2);
  doc.roundedRect(qrX, qrBoxY, qrCardW, qrBoxH, 8, 8, 'S');

  // QR Image
  const qrUrl = settings?.qrScannerUrl || settings?.qrScannerDataUrl || '/assets/qr_scanner.jpg';
  try {
    const qrData = await fetchImageAsDataUrl(qrUrl);
    if (qrData) {
      doc.addImage(qrData, 'JPEG', qrX + 16, qrBoxY + 8, 94, 94);
    }
  } catch (err) {
    console.warn('Error adding QR scanner to PDF:', err);
  }

  // "UPI Accepted Here"
  doc.setFont(fontName, 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(80, 80, 80);
  doc.text('UPI Accepted Here', qrX + qrCardW / 2, qrBoxY + 107, { align: 'center' });

  // BHIM UPI Badge Text
  doc.setFont(fontName, 'bolditalic');
  doc.setFontSize(7.5);
  doc.setTextColor(charcoalText.r, charcoalText.g, charcoalText.b);
  doc.text('BHIM  UPI', qrX + qrCardW / 2, qrBoxY + 115, { align: 'center' });

  // 13. Digital Signature Badge (Below QR Card)
  const badgeY = qrBoxY + qrBoxH + 6;
  const badgeH = 26;

  doc.setFillColor(darkHeaderBg.r, darkHeaderBg.g, darkHeaderBg.b);
  doc.roundedRect(qrX, badgeY, qrCardW, badgeH, 6, 6, 'F');
  doc.setDrawColor(40, 45, 55);
  doc.setLineWidth(0.8);
  doc.roundedRect(qrX, badgeY, qrCardW, badgeH, 6, 6, 'S');

  // Blue verified circle with checkmark
  doc.setFillColor(37, 99, 235);
  doc.circle(qrX + 14, badgeY + badgeH / 2, 6, 'F');
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1.2);
  doc.line(qrX + 11.5, badgeY + 13, qrX + 13.5, badgeY + 15);
  doc.line(qrX + 13.5, badgeY + 15, qrX + 16.5, badgeY + 11);

  doc.setFont(fontName, 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(255, 255, 255);
  doc.text('Digitally Signed By', qrX + 26, badgeY + 10.5);

  doc.setFont(fontName, 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(148, 163, 184);
  doc.text('Authorized Signatory', qrX + 26, badgeY + 19.5);

  // 14. Refined Cinematic Footer (Script & Tagline)
  const footerY = Math.max(acctBoxY + acctHeaderH + acctContentH + 16, badgeY + badgeH + 12);

  doc.setFont(fontName, 'bolditalic');
  doc.setFontSize(15);
  doc.setTextColor(197, 155, 39); // rich warm gold
  doc.text('Thank You For Your Business!', pageWidth / 2, footerY, { align: 'center' });

  doc.setFont(fontName, 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(80, 80, 80);
  doc.text("Together, Let's Create Something Extraordinary...", pageWidth / 2, footerY + 11, { align: 'center' });

  // 15. Bottom Black Bar with Gold Star and Dividers
  const bottomBarH = 24;
  const bottomBarY = pageHeight - bottomBarH;

  doc.setFillColor(8, 8, 10);
  doc.rect(0, bottomBarY, pageWidth, bottomBarH, 'F');
  doc.setDrawColor(goldBorderColor.r, goldBorderColor.g, goldBorderColor.b);
  doc.setLineWidth(1);
  doc.line(0, bottomBarY, pageWidth, bottomBarY);

  doc.setFont(fontName, 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(goldHeaderTextColor.r, goldHeaderTextColor.g, goldHeaderTextColor.b);
  doc.text('★ Deven Jha Productions    |    Professional Services    |    Creative Excellence', pageWidth / 2, bottomBarY + 15, { align: 'center' });

  return doc;
}

/**
 * Sanitizes a customer or business name for use in filesystem filenames
 */
export function sanitizeCustomerNameForFilename(customerName?: string): string {
  if (!customerName) return 'Customer';
  const sanitized = customerName
    .replace(/[\x00-\x1f\x80-\x9f]/g, '')
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/-+/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^[-. ]+|[-. ]+$/g, '')
    .trim();

  return sanitized || 'Customer';
}

/**
 * Returns the standardized PDF filename for an invoice
 */
export function getInvoicePdfFilename(
  invoice: { customerName?: string; invoiceType?: InvoiceType; invoiceNumber?: string },
  options?: { appendInvoiceNumber?: boolean; existingFilenames?: Set<string> | string[] }
): string {
  const customer = sanitizeCustomerNameForFilename(invoice.customerName);
  const isTax = invoice.invoiceType === 'tax';
  const typeLabel = isTax ? 'Tax Invoice' : 'Invoice';
  const baseName = `${customer} ${typeLabel}`;
  let finalName = `${baseName}.pdf`;

  let shouldAppend = options?.appendInvoiceNumber ?? false;

  if (options?.existingFilenames) {
    const exists = Array.isArray(options.existingFilenames)
      ? options.existingFilenames.includes(finalName)
      : options.existingFilenames.has(finalName);
    if (exists) {
      shouldAppend = true;
    }
  }

  if (shouldAppend && invoice.invoiceNumber) {
    const safeInvNo = invoice.invoiceNumber.replace(/[/\\?%*:|"<>]/g, '-').trim();
    finalName = `${baseName} - ${safeInvNo}.pdf`;
  }

  return finalName;
}

export function getUniqueInvoicePdfFilenames(
  invoices: InvoiceRecord[]
): Map<string, string> {
  const result = new Map<string, string>();
  const counts = new Map<string, number>();

  for (const inv of invoices) {
    const base = getInvoicePdfFilename(inv);
    counts.set(base, (counts.get(base) || 0) + 1);
  }

  const assigned = new Set<string>();
  for (const inv of invoices) {
    const base = getInvoicePdfFilename(inv);
    let filename = base;
    if ((counts.get(base) || 0) > 1 || assigned.has(filename)) {
      filename = getInvoicePdfFilename(inv, { appendInvoiceNumber: true });
    }
    assigned.add(filename);
    result.set(inv.id, filename);
  }

  return result;
}

export function sanitizePdfFilename(filename: string): string {
  let cleaned = (filename || '')
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.toLowerCase().endsWith('.pdf')) {
    cleaned = cleaned.slice(0, -4).trim();
  }

  cleaned = cleaned.replace(/^[-. ]+|[-. ]+$/g, '').trim();

  if (!cleaned) {
    cleaned = 'Invoice';
  }

  return `${cleaned}.pdf`;
}

export function formatDefaultPdfFilename(
  customerName?: string,
  invoiceNumber?: string,
  invoiceType?: InvoiceType
): string {
  const customer = sanitizeCustomerNameForFilename(customerName) || 'Customer';
  const isTax = invoiceType === 'tax';
  const typeLabel = isTax ? 'Tax Invoice' : 'Invoice';
  const safeInvNo = (invoiceNumber || '').replace(/[/\\?%*:|"<>]/g, '-').trim();

  if (safeInvNo) {
    return `${customer} ${typeLabel} - ${safeInvNo}.pdf`;
  }
  return `${customer} ${typeLabel}.pdf`;
}

/**
 * Downloads the invoice as a pristine A4 PDF.
 * If the styled DOM invoice element is currently rendered in the document,
 * captures it using html2canvas at high DPI (2.5x) for an exact 1:1 match
 * with the on-screen preview and browser print.
 * Falls back to createInvoicePDFDocument if the element is not found.
 */
export async function downloadInvoicePDF(
  invoice: InvoiceRecord,
  companySettings?: CompanySettings,
  customFilename?: string
): Promise<void> {
  const filename = customFilename ? sanitizePdfFilename(customFilename) : getInvoicePdfFilename(invoice);

  // Check if live rendered invoice element is in the DOM
  const printableArea = typeof document !== 'undefined'
    ? document.getElementById('invoice-printable-area')
    : null;

  if (printableArea) {
    try {
      const canvas = await html2canvas(printableArea, {
        scale: 2.5, // Crisp 300+ DPI print quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4', // 595.28 x 841.89 pt
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, 595.28, 841.89);
      pdf.save(filename);
      return;
    } catch (err) {
      console.warn('html2canvas capture failed, falling back to direct PDF document generator:', err);
    }
  }

  // Fallback: Direct vector generator
  const doc = await createInvoicePDFDocument(invoice, companySettings);
  doc.save(filename);
}
