import React from 'react';
import type { InvoiceRecord, CompanySettings } from '../../types';
import { formatDateToIndian, formatIndianCurrency } from '../../utils/financialYear';
import { calculateInvoiceTotals } from '../../utils/taxCalculator';
import { Calendar, FileText, Phone, Mail, Globe, Landmark, CreditCard, Check } from 'lucide-react';
import './InvoiceDocument.css';

interface InvoiceDocumentProps {
  invoice: Partial<InvoiceRecord>;
  settings?: CompanySettings;
  scale?: number;
}

export const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({
  invoice,
  settings,
  scale = 1,
}) => {
  const activeSettings = invoice.companySnapshot || settings;

  const logoSrc = activeSettings?.logoUrl || activeSettings?.logoDataUrl || '/assets/logo.png';
  const qrSrc = activeSettings?.qrScannerUrl || activeSettings?.qrScannerDataUrl || '/assets/qr_scanner.jpg';

  const items = invoice.items || [];
  const isTax = invoice.invoiceType === 'tax';

  const totals = calculateInvoiceTotals({
    invoiceType: invoice.invoiceType,
    items: invoice.items,
    taxMode: invoice.taxMode,
    cgstRate: invoice.cgstRate,
    sgstRate: invoice.sgstRate,
    igstRate: invoice.igstRate,
  });

  interface PreviewRow {
    id: string;
    description: string;
    hsnSac?: string;
    amount?: string;
    isBold?: boolean;
    isSgstIndent?: boolean;
    isBlank?: boolean;
  }

  const previewRows: PreviewRow[] = [];

  // Display items consecutively
  items.forEach((item, itemIdx) => {
    const descLines = item.description ? item.description.split('\n') : [''];
    const hasAmount =
      item.amount !== '' &&
      item.amount !== undefined &&
      item.amount !== null &&
      !isNaN(Number(item.amount));
    const amtStr = hasAmount ? formatIndianCurrency(Number(item.amount)) : '';

    descLines.forEach((lineText, lineIdx) => {
      previewRows.push({
        id: `${item.id || itemIdx}-line-${lineIdx}`,
        description: lineText,
        hsnSac: lineIdx === 0 ? (item.hsnSac || '') : '',
        amount: lineIdx === 0 ? amtStr : '',
      });
    });
  });

  // Leave one blank line before tax breakdown
  if (isTax && items.length > 0) {
    previewRows.push({
      id: 'blank-tax-sep',
      description: '',
      isBlank: true,
    });
  }

  // Tax Breakdown Rows
  if (isTax) {
    if (totals.taxMode === 'cgst_sgst') {
      previewRows.push({
        id: 'cgst-row',
        description: `Add: CGST @ ${totals.cgstRate || 0}%`,
        hsnSac: invoice.cgstHsnSac?.trim() || '',
        amount: formatIndianCurrency(totals.cgstAmount),
        isBold: true,
      });
      previewRows.push({
        id: 'sgst-row',
        description: `SGST @ ${totals.sgstRate || 0}%`,
        hsnSac: invoice.sgstHsnSac?.trim() || '',
        amount: formatIndianCurrency(totals.sgstAmount),
        isBold: true,
        isSgstIndent: true,
      });
    } else if (totals.taxMode === 'igst') {
      previewRows.push({
        id: 'igst-row',
        description: `Add: IGST @ ${totals.igstRate || 0}%`,
        hsnSac: invoice.igstHsnSac?.trim() || '',
        amount: formatIndianCurrency(totals.igstAmount),
        isBold: true,
      });
    }
  }

  // Minimum 8 rows for spacious, elegant presentation
  const minRows = 8;
  const emptyFillCount = Math.max(0, minRows - previewRows.length);
  for (let i = 0; i < emptyFillCount; i++) {
    previewRows.push({
      id: `empty-fill-${i}`,
      description: '',
      isBlank: true,
    });
  }

  const formattedDate = invoice.date
    ? formatDateToIndian(invoice.date)
    : formatDateToIndian(new Date().toISOString().slice(0, 10));

  const mobileVal = invoice.customerMobile?.trim();

  return (
    <div
      className="invoice-document-scaler"
      style={{
        transform: `scale(${scale})`,
        transformOrigin: 'top center',
      }}
    >
      <div className="invoice-document a4-sheet film-edition" id="invoice-printable-area">
        {/* Top Gold Wave Decorative Accent */}
        <div className="inv-top-wave" aria-hidden="true">
          <svg viewBox="0 0 800 120" preserveAspectRatio="none" className="inv-wave-svg">
            <defs>
              <linearGradient id="invGoldTopGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8a6114" />
                <stop offset="25%" stopColor="#d4af37" />
                <stop offset="50%" stopColor="#fff1c5" />
                <stop offset="75%" stopColor="#c59b27" />
                <stop offset="100%" stopColor="#694605" />
              </linearGradient>
              <linearGradient id="invGoldTopGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fdf3d6" />
                <stop offset="30%" stopColor="#d4af37" />
                <stop offset="70%" stopColor="#9a6e18" />
                <stop offset="100%" stopColor="#4e3304" />
              </linearGradient>
            </defs>
            <path d="M 340 0 C 460 25, 540 60, 680 45 C 740 38, 770 20, 800 10 L 800 0 Z" fill="#d4af37" opacity="0.3" />
            <path d="M 400 0 C 480 35, 570 75, 670 65 C 725 60, 765 40, 800 25 L 800 0 Z" fill="url(#invGoldTopGrad1)" />
            <path d="M 480 0 C 540 25, 620 50, 710 42 C 750 38, 775 25, 800 12 L 800 0 Z" fill="url(#invGoldTopGrad2)" />
            <path d="M 400 0 C 480 35, 570 75, 670 65 C 725 60, 765 40, 800 25" fill="none" stroke="#fff8e7" strokeWidth="1.2" opacity="0.8" />
          </svg>
        </div>

        {/* Cinematic Background Watermark: Clapperboard, Film Reel & Flowing Filmstrip */}
        <div className="inv-watermark" aria-hidden="true">
          <svg viewBox="0 0 500 400" className="inv-watermark-svg">
            <g opacity="0.09">
              {/* Tilted Clapperboard */}
              <g transform="translate(130, 90) rotate(-18)">
                <rect x="0" y="28" width="145" height="95" rx="4" fill="#2b2d31" stroke="#4a4e58" strokeWidth="1.5" />
                <line x1="8" y1="58" x2="137" y2="58" stroke="#686d79" strokeWidth="1" />
                <line x1="8" y1="88" x2="137" y2="88" stroke="#686d79" strokeWidth="1" />
                <line x1="52" y1="28" x2="52" y2="58" stroke="#686d79" strokeWidth="1" />
                <line x1="94" y1="28" x2="94" y2="58" stroke="#686d79" strokeWidth="1" />
                <line x1="72" y1="58" x2="72" y2="88" stroke="#686d79" strokeWidth="1" />
                <text x="12" y="44" fontFamily="sans-serif" fontSize="7" fill="#888e9b" fontWeight="bold">PROD.</text>
                <text x="12" y="74" fontFamily="sans-serif" fontSize="7" fill="#888e9b" fontWeight="bold">SCENE</text>
                <text x="78" y="74" fontFamily="sans-serif" fontSize="7" fill="#888e9b" fontWeight="bold">TAKE</text>
                <text x="12" y="106" fontFamily="sans-serif" fontSize="7" fill="#888e9b" fontWeight="bold">DIRECTOR</text>
                <g>
                  <rect x="0" y="0" width="145" height="26" rx="3" fill="#1e2024" stroke="#4a4e58" strokeWidth="1.5" />
                  <polygon points="12,0 26,0 14,26 0,26" fill="#e6e8ee" />
                  <polygon points="42,0 56,0 44,26 30,26" fill="#e6e8ee" />
                  <polygon points="72,0 86,0 74,26 60,26" fill="#e6e8ee" />
                  <polygon points="102,0 116,0 104,26 90,26" fill="#e6e8ee" />
                  <polygon points="132,0 145,0 137,26 124,26" fill="#e6e8ee" />
                </g>
              </g>

              {/* 35mm Film Reel */}
              <g transform="translate(340, 160)">
                <circle cx="0" cy="0" r="76" fill="none" stroke="#444" strokeWidth="9" />
                <circle cx="0" cy="0" r="80" fill="none" stroke="#222" strokeWidth="1.5" />
                <circle cx="0" cy="0" r="71" fill="none" stroke="#222" strokeWidth="1.5" />
                <circle cx="0" cy="0" r="54" fill="#303236" stroke="#4f5258" strokeWidth="2" />
                <circle cx="0" cy="0" r="22" fill="#1f2022" stroke="#d4af37" strokeWidth="2.5" />
                <circle cx="0" cy="0" r="9" fill="#111" />
                <circle cx="0" cy="0" r="4" fill="#fff" opacity="0.6" />
                <circle cx="0" cy="-36" r="11" fill="#f8f9fa" stroke="#222" strokeWidth="1.5" />
                <circle cx="31.1" cy="-18" r="11" fill="#f8f9fa" stroke="#222" strokeWidth="1.5" />
                <circle cx="31.1" cy="18" r="11" fill="#f8f9fa" stroke="#222" strokeWidth="1.5" />
                <circle cx="0" cy="36" r="11" fill="#f8f9fa" stroke="#222" strokeWidth="1.5" />
                <circle cx="-31.1" cy="18" r="11" fill="#f8f9fa" stroke="#222" strokeWidth="1.5" />
                <circle cx="-31.1" cy="-18" r="11" fill="#f8f9fa" stroke="#222" strokeWidth="1.5" />
              </g>

              {/* Curving Filmstrip */}
              <g transform="translate(80, 20) rotate(14)">
                <path d="M 0 100 C 130 65, 270 125, 410 85 C 450 74, 490 66, 540 70" fill="none" stroke="#26282c" strokeWidth="36" strokeLinecap="round" />
                <path d="M 0 100 C 130 65, 270 125, 410 85 C 450 74, 490 66, 540 70" fill="none" stroke="#ffffff" strokeWidth="24" strokeDasharray="28 6" strokeLinecap="butt" />
                <path d="M 0 85 C 130 50, 270 110, 410 70 C 450 59, 490 51, 540 55" fill="none" stroke="#ffffff" strokeWidth="2" strokeDasharray="3 4" />
                <path d="M 0 115 C 130 80, 270 140, 410 100 C 450 89, 490 81, 540 85" fill="none" stroke="#ffffff" strokeWidth="2" strokeDasharray="3 4" />
              </g>
            </g>
          </svg>
        </div>

        {/* ========================================================================= */}
        {/* HEADER SECTION                                                            */}
        {/* ========================================================================= */}
        <div className="inv-top-row">
          {/* Left: Original DJP Logo & Company Name */}
          <div className="inv-company-header-group">
            <div className="inv-logo-box">
              {logoSrc ? (
                <img src={logoSrc} alt="Deven Jha Productions Logo" className="inv-logo-img" />
              ) : (
                <div className="inv-logo-placeholder">DJP</div>
              )}
            </div>
            <div className="inv-header-divider" />
            <div className="inv-company-title-wrap">
              <h1 className="inv-company-name">
                {activeSettings?.companyName || 'Deven Jha Productions'}
              </h1>
            </div>
          </div>

          {/* Right: INVOICE / TAX INVOICE heading */}
          <div className="inv-heading-group">
            <div className="inv-title">{isTax ? 'TAX INVOICE' : 'INVOICE'}</div>
            <div className="inv-title-gold-bar" />
          </div>
        </div>

        {/* Sub-Header: Company Address & Contact on Left; Date & Inv No Card on Right */}
        <div className="inv-sub-header-row">
          <div className="inv-company-details">
            <div className="inv-company-address">
              <div>{activeSettings?.addressLine1 || 'Office No. 2B, 2nd Floor, Bhawani Market,'}</div>
              <div>{activeSettings?.addressLine2 || 'Sector-27, Noida, Gautam Buddha Nagar,'}</div>
              <div>{activeSettings?.addressLine3 || 'Uttar Pradesh-201301'}</div>
            </div>

            <div className="inv-contact-list">
              <div className="inv-contact-line">
                <span className="inv-icon-pill">
                  <span className="inv-mini-badge">GT</span>
                </span>
                <span className="inv-contact-label">GSTIN</span>
                <span className="inv-contact-colon">:</span>
                <span className="inv-contact-val inv-val-bold">
                  {activeSettings?.gstin || '09PQRPK4105E1ZG'}
                </span>
              </div>

              <div className="inv-contact-line">
                <span className="inv-icon-pill">
                  <Phone size={10} className="inv-mini-icon" />
                </span>
                <span className="inv-contact-label">Phone</span>
                <span className="inv-contact-colon">:</span>
                <span className="inv-contact-val">
                  {activeSettings?.phone || '8076187274'}
                </span>
              </div>

              <div className="inv-contact-line">
                <span className="inv-icon-pill">
                  <Mail size={10} className="inv-mini-icon" />
                </span>
                <span className="inv-contact-label">Email Id</span>
                <span className="inv-contact-colon">:</span>
                <span className="inv-contact-val">
                  {activeSettings?.email || 'info@devenjhaproductions.com'}
                </span>
              </div>

              <div className="inv-contact-line">
                <span className="inv-icon-pill">
                  <Globe size={10} className="inv-mini-icon" />
                </span>
                <span className="inv-contact-label">Website</span>
                <span className="inv-contact-colon">:</span>
                <span className="inv-contact-val">
                  {activeSettings?.website || 'www.devenjhaproductions.com'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Card: Date & Invoice No */}
          <div className="inv-meta-card">
            <div className="inv-meta-card-row">
              <div className="inv-meta-cell-label">
                <Calendar size={12} className="inv-meta-icon" />
                <span>Date</span>
              </div>
              <div className="inv-meta-cell-value">
                {formattedDate}
              </div>
            </div>
            <div className="inv-meta-card-row">
              <div className="inv-meta-cell-label">
                <FileText size={12} className="inv-meta-icon" />
                <span>Invoice No.</span>
              </div>
              <div className="inv-meta-cell-value inv-invno-val">
                {invoice.invoiceNumber || 'DJP/2026-27/01'}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BILL TO SECTION                                                           */}
        {/* ========================================================================= */}
        <div className="inv-bill-to-section">
          <div className="inv-bill-to-card">
            <div className="inv-bill-to-header-tab">
              <span>Bill To :</span>
            </div>
            <div className="inv-bill-to-body">
              <div className="inv-bill-to-name">
                {invoice.customerName ? invoice.customerName : 'M/s. BrainSpace'}
              </div>
              <div className="inv-bill-to-address">
                {invoice.customerAddress
                  ? invoice.customerAddress.split('\n').map((line, idx) => (
                    <div key={idx}>{line}</div>
                  ))
                  : (
                    <>
                      <div>F-24/2, 3rd Floor, Nandi Apartment,</div>
                      <div>Sector - 24, Rohini, Delhi - 110042</div>
                    </>
                  )}
              </div>
              <div className="inv-bill-to-mobile">
                <span className="inv-lbl-muted">Mobile :</span> {mobileVal || '+91 88664 30075'}
              </div>
              {isTax && invoice.customerGstin && (
                <div className="inv-bill-to-gstin">
                  <span className="inv-lbl-muted">GSTIN :</span> {invoice.customerGstin.trim()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ITEMIZED INVOICE TABLE                                                    */}
        {/* ========================================================================= */}
        <div className="inv-items-table-wrapper">
          <table className="inv-items-table">
            <thead>
              <tr>
                <th className="col-desc">
                  <span className="th-desc-wrap">
                    <Calendar size={12} className="th-icon" />
                    <span>DESCRIPTION</span>
                  </span>
                </th>
                <th className="col-hsn">HSN/SAC</th>
                <th className="col-amount">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, idx) => (
                <tr key={row.id} className={idx % 2 === 0 ? 'row-stripe' : 'row-white'}>
                  <td className="col-desc" style={{ fontWeight: row.isBold ? 600 : 'normal' }}>
                    {row.isSgstIndent ? (
                      <span className="sgst-indent-wrap">
                        <span className="sgst-indent-spacer">Add:&nbsp;</span>
                        {row.description}
                      </span>
                    ) : (
                      row.description || '\u00A0'
                    )}
                  </td>
                  <td className="col-hsn">{row.hsnSac || ''}</td>
                  <td className="col-amount" style={{ fontWeight: row.isBold ? 600 : 'normal' }}>
                    {row.amount || ''}
                  </td>
                </tr>
              ))}
              <tr className="subtotal-row">
                <td className="col-desc subtotal-empty-cell"></td>
                <td className="col-hsn subtotal-label">{isTax ? 'Total' : 'Sub-Total'}</td>
                <td className="col-amount subtotal-value">
                  {formatIndianCurrency(isTax ? totals.grandTotal : totals.subtotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ========================================================================= */}
        {/* BOTTOM SECTION: PAYMENT TERMS & BANK DETAILS + SCAN & PAY                 */}
        {/* ========================================================================= */}
        <div className="inv-bottom-section">
          {/* Left Column: Terms + Bank */}
          <div className="inv-bottom-left">
            {/* Payment Terms */}
            <div className="inv-terms-card">
              <div className="inv-card-header-bar">
                <CreditCard size={12} className="card-header-icon" />
                <span>Payment Terms:</span>
              </div>
              <div className="inv-card-body-box inv-terms-body">
                {activeSettings?.paymentTerms ? (
                  activeSettings.paymentTerms.split('\n').map((line, idx) => (
                    <div key={idx}>{line}</div>
                  ))
                ) : (
                  <div>1. 50% Advance & Balance 50% after completion of work.</div>
                )}
              </div>
            </div>

            {/* Account Details */}
            <div className="inv-account-card">
              <div className="inv-card-header-bar">
                <Landmark size={12} className="card-header-icon" />
                <span>Account Details:</span>
              </div>
              <div className="inv-card-body-box inv-account-body">
                <div className="inv-bank-name">
                  {activeSettings?.bankName || 'Slice Small Finance Bank'}
                </div>
                <div className="inv-acct-grid">
                  <div className="inv-acct-row">
                    <span className="inv-acct-lbl">A/C No.</span>
                    <span className="inv-acct-colon">:</span>
                    <span className="inv-acct-val inv-val-bold">{activeSettings?.accountNo || '033911501053615'}</span>
                  </div>
                  <div className="inv-acct-row">
                    <span className="inv-acct-lbl">Name</span>
                    <span className="inv-acct-colon">:</span>
                    <span className="inv-acct-val">{activeSettings?.accountHolderName || 'Manshi Group of Services'}</span>
                  </div>
                  <div className="inv-acct-row">
                    <span className="inv-acct-lbl">IFSC Code</span>
                    <span className="inv-acct-colon">:</span>
                    <span className="inv-acct-val inv-val-bold">{activeSettings?.ifscCode || 'NSF0000333'}</span>
                  </div>
                  <div className="inv-acct-row">
                    <span className="inv-acct-lbl">Branch</span>
                    <span className="inv-acct-colon">:</span>
                    <span className="inv-acct-val">{activeSettings?.branch || 'Koramangala, Bengaluru'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: SCAN AND PAY & Digital Signature Badge */}
          <div className="inv-bottom-right">
            <div className="inv-scan-header-wrap">
              <span className="inv-scan-line" />
              <span className="inv-scan-title">SCAN AND PAY</span>
              <span className="inv-scan-line" />
            </div>

            <div className="inv-qr-card">
              <div className="inv-qr-frame">
                {qrSrc ? (
                  <img src={qrSrc} alt="UPI Payment QR Code" className="inv-qr-img" />
                ) : (
                  <div className="inv-qr-placeholder">QR Code</div>
                )}
              </div>

              <div className="inv-upi-label">UPI Accepted Here</div>

              {/* BHIM UPI Badge */}
              <div className="inv-bhim-upi-badge">
                <span className="bhim-text">BHIM</span>
                <span className="upi-arrows">
                  <svg viewBox="0 0 16 12" width="16" height="12">
                    <polygon points="2,0 8,6 2,12" fill="#16a34a" />
                    <polygon points="7,0 13,6 7,12" fill="#ea580c" />
                  </svg>
                </span>
                <span className="upi-text">UPI</span>
              </div>
            </div>

            {/* Digital Signature Badge */}
            <div className="inv-digital-signature-badge">
              <div className="inv-badge-icon-circle">
                <Check size={11} className="inv-check-icon" strokeWidth={3} />
              </div>
              <div className="inv-badge-text-block">
                <div className="inv-badge-title">Digitally Signed By</div>
                <div className="inv-badge-subtitle">Authorized Signatory</div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PREMIUM FILM FOOTER                                                       */}
        {/* ========================================================================= */}
        <div className="inv-footer-area">
          <div className="inv-thank-you-script">Thank You For Your Business!</div>
          <div className="inv-tagline-sub">Together, Let's Create Something Extraordinary...</div>
        </div>

        {/* Bottom Curved Wave Banner with Film Reel & Filmstrip */}
        <div className="inv-bottom-wave-banner" aria-hidden="true">
          <svg viewBox="0 0 800 130" preserveAspectRatio="none" className="inv-bot-wave-svg">
            <defs>
              <linearGradient id="invBotGoldGrad1" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#4e3304" />
                <stop offset="25%" stopColor="#aa7c11" />
                <stop offset="45%" stopColor="#fcedb9" />
                <stop offset="70%" stopColor="#c59b27" />
                <stop offset="100%" stopColor="#694605" />
              </linearGradient>
              <linearGradient id="invBotGoldGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fff4d0" />
                <stop offset="35%" stopColor="#d4af37" />
                <stop offset="70%" stopColor="#8a6114" />
                <stop offset="100%" stopColor="#2e1d02" />
              </linearGradient>
              <linearGradient id="invReelGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e2ba43" />
                <stop offset="30%" stopColor="#fdf4d6" />
                <stop offset="60%" stopColor="#b6891e" />
                <stop offset="90%" stopColor="#6a4a06" />
              </linearGradient>
            </defs>

            {/* Upper Golden Wave */}
            <path d="M 0 55 C 140 25, 320 70, 520 40 C 640 22, 720 10, 800 0 L 800 130 L 0 130 Z" fill="url(#invBotGoldGrad1)" />

            {/* Main Dark Wave */}
            <path d="M 0 68 C 160 40, 340 85, 540 50 C 660 30, 740 18, 800 10 L 800 130 L 0 130 Z" fill="#08080a" />

            {/* Shimmering Golden Edge */}
            <path d="M 0 67 C 160 39, 340 84, 540 49 C 660 29, 740 17, 800 9" fill="none" stroke="url(#invBotGoldGrad2)" strokeWidth="2.2" />
            <path d="M 0 55 C 140 25, 320 70, 520 40 C 640 22, 720 10, 800 0" fill="none" stroke="#fff8e7" strokeWidth="1" opacity="0.8" />

            {/* Filmstrip curving along right side */}
            <g transform="translate(600, 2) rotate(-11)">
              <path d="M 0 35 C 70 28, 140 20, 220 10" fill="none" stroke="#121316" strokeWidth="20" />
              <path d="M 0 35 C 70 28, 140 20, 220 10" fill="none" stroke="#333740" strokeWidth="14" strokeDasharray="18 4" />
              <path d="M 0 28 C 70 21, 140 13, 220 3" fill="none" stroke="#d4af37" strokeWidth="1.2" strokeDasharray="2 3" opacity="0.8" />
              <path d="M 0 42 C 70 35, 140 27, 220 17" fill="none" stroke="#d4af37" strokeWidth="1.2" strokeDasharray="2 3" opacity="0.8" />
            </g>

            {/* 35mm Golden Film Reel on Bottom-Left */}
            <g transform="translate(42, 68) scale(0.62)">
              <circle cx="0" cy="0" r="68" fill="none" stroke="url(#invReelGold)" strokeWidth="8" />
              <circle cx="0" cy="0" r="72" fill="none" stroke="#3a2403" strokeWidth="1.2" />
              <circle cx="0" cy="0" r="64" fill="none" stroke="#3a2403" strokeWidth="1.2" />
              <circle cx="0" cy="0" r="50" fill="#1b1c1e" stroke="url(#invReelGold)" strokeWidth="1.8" />
              <circle cx="0" cy="0" r="20" fill="url(#invReelGold)" stroke="#222" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="8" fill="#111" />
              <circle cx="0" cy="0" r="3" fill="#fff" opacity="0.7" />
              <circle cx="0" cy="-33" r="10" fill="#08080a" stroke="url(#invReelGold)" strokeWidth="1.5" />
              <circle cx="28.5" cy="-16.5" r="10" fill="#08080a" stroke="url(#invReelGold)" strokeWidth="1.5" />
              <circle cx="28.5" cy="16.5" r="10" fill="#08080a" stroke="url(#invReelGold)" strokeWidth="1.5" />
              <circle cx="0" cy="33" r="10" fill="#08080a" stroke="url(#invReelGold)" strokeWidth="1.5" />
              <circle cx="-28.5" cy="16.5" r="10" fill="#08080a" stroke="url(#invReelGold)" strokeWidth="1.5" />
              <circle cx="-28.5" cy="-16.5" r="10" fill="#08080a" stroke="url(#invReelGold)" strokeWidth="1.5" />
            </g>

            {/* Bottom Dark Footer Bar */}
            <rect x="0" y="98" width="800" height="32" fill="#050507" />
            <line x1="0" y1="98" x2="800" y2="98" stroke="#c5a059" strokeWidth="1" />

            <g fill="#e5c07b" fontFamily="'Montserrat', 'Trebuchet MS', sans-serif" fontSize="10.5" fontWeight="600" letterSpacing="0.8">
              <text x="56" y="118" fontSize="13" fill="#d4af37">★</text>
              <text x="80" y="118">Deven Jha Productions</text>
              <line x1="300" y1="106" x2="300" y2="124" stroke="#4a3610" strokeWidth="1" />
              <text x="355" y="118">Professional Services</text>
              <line x1="550" y1="106" x2="550" y2="124" stroke="#4a3610" strokeWidth="1" />
              <text x="610" y="118">Creative Excellence</text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};
