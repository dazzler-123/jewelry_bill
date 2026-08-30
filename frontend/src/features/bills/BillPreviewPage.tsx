import { API_URL } from '../../config';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  CircularProgress,
  Paper,
  MenuItem,
  TextField,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  WhatsApp as WhatsAppIcon,
} from '@mui/icons-material';
import {
  MoneyDisplay,
  DateDisplay,
  StatusChip,
} from '../../components/shared';
import { useSnackbar } from '../../context/SnackbarContext';
import { useAuth } from '../../context/AuthContext';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ShopSettings {
  name: string;
  address: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  gstin?: string;
  pan?: string;
  termsAndConditions?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  whatsappMessageTemplate?: string;
}

interface BillItem {
  productName: string;
  sku?: string;
  barcode?: string;
  metal: string;
  purity: string;
  grossWeight: number;
  stoneWeight: number;
  otherWeight: number;
  netWeight: number;
  metalRate: number;
  metalValue: number;
  makingChargeType: string;
  makingChargeRate: number;
  makingChargeAmount: number;
  wastageType: string;
  wastageRate: number;
  wastageAmount: number;
  stoneCharge: number;
  otherCharge: number;
  discount: number;
  taxableAmount: number;
  tax: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  finalAmount: number;
}

interface Bill {
  _id: string;
  invoiceNumber: string;
  customerSnapshot: {
    name: string;
    phone: string;
    gstin?: string;
    address?: string;
  };
  itemsSnapshot: BillItem[];
  pricingSnapshot: {
    subtotal: number;
    makingChargesTotal: number;
    wastageChargesTotal: number;
    stoneChargesTotal: number;
    otherChargesTotal: number;
    discountAmount: number;
    taxableAmount: number;
    taxAmount: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    finalAmount: number;
  };
  paymentSummary: {
    paidAmount: number;
    outstandingAmount: number;
  };
  status: string;
  dueDate: string;
  createdAt: string;
  notes?: string;
}

export const BillPreviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const { showSuccess, showError } = useSnackbar();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [bill, setBill] = useState<Bill | null>(null);
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
  const [printFormat, setPrintFormat] = useState<'a4' | '80mm' | '58mm'>('a4');

  useEffect(() => {
    if (!token || !id) return;
    const fetchInvoiceData = async () => {
      try {
        setLoading(true);
        // 1. Fetch active invoice details
        const billRes = await fetch(`${API_URL}/bills/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!billRes.ok) throw new Error('Invoice bill not found');
        const billData = await billRes.json();
        setBill(billData);

        // 2. Fetch active settings for logo, details
        const settingsRes = await fetch(API_URL + '/bills/settings/active', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setShopSettings(settingsData);
        }
      } catch (err: any) {
        showError(err.message || 'Error loading preview details');
        navigate('/bills');
      } finally {
        setLoading(false);
      }
    };
    fetchInvoiceData();
  }, [token, id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('printable-invoice');
    if (!element || !bill) return;

    showSuccess('Generating PDF document...');
    try {
      const widthMm = printFormat === '80mm' ? 80 : printFormat === '58mm' ? 58 : 210;

      // Calculate scale to keep text sharp
      const scaleValue = printFormat === 'a4' ? 2 : 3;

      const canvas = await html2canvas(element, {
        scale: scaleValue,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const imgHeightMm = (canvas.height * widthMm) / canvas.width;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: printFormat === 'a4' ? 'a4' : [widthMm, imgHeightMm],
      });

      if (printFormat === 'a4') {
        const pageHeightMm = 297;
        let heightLeft = imgHeightMm;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, widthMm, imgHeightMm);
        heightLeft -= pageHeightMm;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeightMm;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, widthMm, imgHeightMm);
          heightLeft -= pageHeightMm;
        }
      } else {
        // Fits thermal layout in single receipts page height dynamically
        pdf.addImage(imgData, 'PNG', 0, 0, widthMm, imgHeightMm);
      }

      pdf.save(`Invoice_${bill.invoiceNumber}.pdf`);
      showSuccess('PDF downloaded successfully');
    } catch (err: any) {
      showError('Failed to generate PDF: ' + err.message);
    }
  };

  const handleShare = async () => {
    if (!bill) return;
    const shareUrl = window.location.href;
    const shareText = `Invoice ${bill.invoiceNumber} from ${shopSettings?.name || 'Aurum Jewelry'} for ₹${bill.pricingSnapshot.finalAmount.toLocaleString('en-IN')}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice ${bill.invoiceNumber}`,
          text: shareText,
          url: shareUrl,
        });
        showSuccess('Shared successfully');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          showError('Share failed: ' + err.message);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        showSuccess('Invoice URL copied to clipboard');
      } catch (err) {
        showError('Could not copy URL');
      }
    }
  };

  const handleWhatsAppShare = () => {
    if (!bill) return;
    const name = bill.customerSnapshot.name;
    const phone = bill.customerSnapshot.phone.replace(/\D/g, '');
    const cleanPhone = phone.startsWith('91') && phone.length > 10 ? phone : `91${phone}`;

    const defaultMsg = `Dear ${name}, thank you for choosing ${shopSettings?.name || 'Aurum Jewelry House'}. Your invoice *${bill.invoiceNumber}* for *₹${bill.pricingSnapshot.finalAmount.toLocaleString('en-IN')}* is ready. View/Download: ${window.location.href}`;

    const text = shopSettings?.whatsappMessageTemplate
      ? shopSettings.whatsappMessageTemplate
        .replace('{name}', name)
        .replace('{invoice}', bill.invoiceNumber)
        .replace('{amount}', bill.pricingSnapshot.finalAmount.toLocaleString('en-IN'))
      : defaultMsg;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };
  const getStyleTag = () => {
    if (printFormat === '80mm') {
      return (
        <style>{`
          @media print {
            @page { size: 80mm auto; margin: 0; }
            body { margin: 0; padding: 0; width: 80mm; background: #fff; }
            #printable-invoice {
              width: 80mm !important;
              padding: 4mm !important;
              margin: 0 auto !important;
              border: none !important;
              box-shadow: none !important;
            }
          }
          #printable-invoice {
            width: 80mm;
            margin: 0 auto;
            padding: 4mm;
            font-size: 11px;
            font-family: monospace;
            background: #fff;
            color: #000;
            line-height: 1.4;
          }
          .no-print { display: none !important; }
        `}</style>
      );
    } else if (printFormat === '58mm') {
      return (
        <style>{`
          @media print {
            @page { size: 58mm auto; margin: 0; }
            body { margin: 0; padding: 0; width: 58mm; background: #fff; }
            #printable-invoice {
              width: 58mm !important;
              padding: 2mm !important;
              margin: 0 auto !important;
              border: none !important;
              box-shadow: none !important;
            }
          }
          #printable-invoice {
            width: 58mm;
            margin: 0 auto;
            padding: 2mm;
            font-size: 9px;
            font-family: monospace;
            background: #fff;
            color: #000;
            line-height: 1.3;
          }
          .no-print { display: none !important; }
        `}</style>
      );
    } else {
      return (
        <style>{`
          @media print {
            @page {
              size: A4;
              margin-top: 0;
              margin-bottom: 0;
              margin-left: 12mm;
              margin-right: 12mm;
            }
            body {
              margin: 0;
              padding-top: 12mm !important;
              padding-bottom: 12mm !important;
              background: #fff;
            }
            #printable-invoice {
              width: 100% !important;
              min-height: auto !important;
              padding: 0 !important;
              margin: 0 !important;
              border: none !important;
              box-shadow: none !important;
            }
            #printable-invoice th,
            #printable-invoice td,
            #printable-invoice td * {
              padding: 5px 3px !important;
              font-size: 9.5px !important;
            }
            #printable-invoice td .MuiTypography-caption,
            #printable-invoice td .MuiTypography-caption * {
              font-size: 8px !important;
            }
            #printable-invoice table {
              width: 100% !important;
              table-layout: auto !important;
            }
          }
          #printable-invoice {
            width: 210mm;
            min-height: 297mm;
            padding: 15mm;
            background: #fff;
            color: #000;
            font-family: 'Inter', sans-serif;
            margin: 0 auto;
          }
          .no-print { display: none !important; }
        `}</style>
      );
    }
  };

    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress size={50} />
        </Box>
      );
    }

    if (!bill) return null;

    return (
      <Box>
        {/* Print CSS styles injected dynamically */}
        {getStyleTag()}

        {/* Action Control Panel (Hidden during Print layout) */}
        <Card className="no-print" sx={{ mb: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
          <CardContent sx={{ p: 2.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(`/bills`)}
            >
              Invoice List
            </Button>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TextField
                select
                size="small"
                label="Invoice Print Format"
                value={printFormat}
                onChange={(e: any) => setPrintFormat(e.target.value)}
                sx={{ width: 180 }}
              >
                <MenuItem value="a4">Standard A4 Sheet</MenuItem>
                <MenuItem value="80mm">80mm Thermal Receipt</MenuItem>
                <MenuItem value="58mm">58mm Thermal Receipt</MenuItem>
              </TextField>

              <Button variant="contained" color="primary" startIcon={<PrintIcon />} onClick={handlePrint}>
                Print Invoice
              </Button>

              <Button variant="outlined" color="primary" startIcon={<DownloadIcon />} onClick={handleDownloadPDF}>
                Download PDF
              </Button>

              <Button variant="outlined" color="secondary" startIcon={<ShareIcon />} onClick={handleShare}>
                Share Link
              </Button>

              <Button variant="outlined" color="success" startIcon={<WhatsAppIcon />} onClick={handleWhatsAppShare}>
                WhatsApp
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Invoice Area Container Sheet */}
        <Paper
          id="printable-invoice"
          elevation={0}
          sx={{
            boxShadow: printFormat === 'a4' ? '0 4px 30px rgba(0,0,0,0.03)' : 'none',
            border: printFormat === 'a4' ? '1px solid' : 'none',
            borderColor: 'divider',
            borderRadius: 1.5,
            overflow: 'hidden',
          }}
        >
          {printFormat === 'a4' ? (
            /* ========================================================
               STANDARD A4 SHEET LAYOUT
               ======================================================== */
            <Box>
              {/* Header: Logo & Invoice details */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
                {/* Shop Logo & Name */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 44, height: 44, borderRadius: '50%', border: '2.5px solid #C5A880', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'primary.dark' }}>
                    <Typography variant="h6" sx={{ color: '#C5A880', fontWeight: 800, fontSize: '1.2rem', fontFamily: '"Playfair Display", serif' }}>A</Typography>
                  </Box>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', fontFamily: '"Playfair Display", serif', letterSpacing: '0.05rem' }}>
                      {shopSettings?.name || 'AURUM JEWELRY'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.05rem', textTransform: 'uppercase' }}>
                      Fine Jewelry Retailer
                    </Typography>
                  </Box>
                </Box>

                {/* Tax Invoice Title & Metadata */}
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: '"Playfair Display", serif', color: 'primary.main', mb: 0.5 }}>
                    TAX INVOICE
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Invoice: {bill.invoiceNumber}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Date: <DateDisplay date={bill.createdAt} />
                  </Typography>
                </Box>
              </Box>

              {/* Shop & Customer Metadata addresses block */}
              <Grid container spacing={4} sx={{ mb: 4.5 }}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.05rem', textTransform: 'uppercase', display: 'block', mb: 1 }}>
                    SOLD BY (ESTABLISHMENT)
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {shopSettings?.name || 'Aurum Jewelry House'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line', mb: 1 }}>
                    {shopSettings?.address}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block' }}>
                    <strong>Phone:</strong> {shopSettings?.phone} {shopSettings?.alternatePhone ? `/ ${shopSettings.alternatePhone}` : ''}
                  </Typography>
                  {shopSettings?.email && (
                    <Typography variant="caption" sx={{ display: 'block' }}>
                      <strong>Email:</strong> {shopSettings.email}
                    </Typography>
                  )}
                  {shopSettings?.gstin && (
                    <Typography variant="caption" sx={{ display: 'block', color: 'primary.main', fontWeight: 600, mt: 0.5 }}>
                      <strong>GSTIN:</strong> {shopSettings.gstin}
                    </Typography>
                  )}
                </Grid>

                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.05rem', textTransform: 'uppercase', display: 'block', mb: 1 }}>
                    BILLED TO (CLIENT)
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {bill.customerSnapshot.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {bill.customerSnapshot.address || 'Address: N/A'}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block' }}>
                    <strong>Contact Phone:</strong> {bill.customerSnapshot.phone}
                  </Typography>
                  {bill.customerSnapshot.gstin && (
                    <Typography variant="caption" sx={{ display: 'block', color: 'primary.main', fontWeight: 600, mt: 0.5 }}>
                      <strong>GSTIN:</strong> {bill.customerSnapshot.gstin}
                    </Typography>
                  )}
                </Grid>
              </Grid>

              {/* Invoice Line Items Table */}
              <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 4 }}>
                <Table size="small" sx={{ minWidth: 600 }}>
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Item Description</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Metal & Purity</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Weights (G/S/N)</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Rate (₹/g)</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Metal Val</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Making</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Wastage</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Stone/Other</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Disc</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {bill.itemsSnapshot.map((item, index) => (
                      <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{index + 1}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>{item.productName}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>
                            SKU: {item.sku || 'N/A'} | BAR: {item.barcode || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
                          {item.metal} {item.purity}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.75rem' }}>
                          {item.grossWeight.toFixed(3)}g / {item.stoneWeight.toFixed(3)}g / <strong>{item.netWeight.toFixed(3)}g</strong>
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.75rem' }}>
                          {item.metalRate.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.75rem' }}>
                          {item.metalValue.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.75rem' }}>
                          {item.makingChargeAmount.toLocaleString('en-IN')}
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.6rem' }}>
                            {item.makingChargeType === 'PER_GRAM' ? `₹${item.makingChargeRate}/g` : item.makingChargeType === 'PERCENTAGE' ? `${item.makingChargeRate}%` : 'Fixed'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.75rem' }}>
                          {item.wastageAmount.toLocaleString('en-IN')}
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.6rem' }}>
                            {item.wastageType === 'PERCENTAGE' ? `${item.wastageRate}%` : item.wastageType === 'GRAMS' ? `${item.wastageRate}g` : 'None'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.75rem' }}>
                          {(item.stoneCharge + item.otherCharge).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.75rem', color: 'error.main' }}>
                          {item.discount.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                          {item.finalAmount.toLocaleString('en-IN')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Calculations Breakdown summary block */}
              <Grid container spacing={4} sx={{ mb: 4.5 }}>
                {/* Left Side: Net banking details, signature lines */}
                <Grid size={{ xs: 6 }}>
                  {shopSettings?.bankName && (
                    <Box sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
                        NET-BANKING DIRECT SETTLEMENT
                      </Typography>
                      <Grid container spacing={1}>
                        <Grid size={{ xs: 5 }}>
                          <Typography variant="caption" color="text.secondary">Bank Name:</Typography>
                        </Grid>
                        <Grid size={{ xs: 7 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>{shopSettings.bankName}</Typography>
                        </Grid>
                        <Grid size={{ xs: 5 }}>
                          <Typography variant="caption" color="text.secondary">Account Number:</Typography>
                        </Grid>
                        <Grid size={{ xs: 7 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>{shopSettings.accountNumber}</Typography>
                        </Grid>
                        <Grid size={{ xs: 5 }}>
                          <Typography variant="caption" color="text.secondary">IFSC Code:</Typography>
                        </Grid>
                        <Grid size={{ xs: 7 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>{shopSettings.ifscCode}</Typography>
                        </Grid>
                        {shopSettings.branchName && (
                          <>
                            <Grid size={{ xs: 5 }}>
                              <Typography variant="caption" color="text.secondary">Branch Name:</Typography>
                            </Grid>
                            <Grid size={{ xs: 7 }}>
                              <Typography variant="caption" sx={{ fontWeight: 600 }}>{shopSettings.branchName}</Typography>
                            </Grid>
                          </>
                        )}
                      </Grid>
                    </Box>
                  )}

                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                      INVOICE POLICIES
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'pre-line', fontSize: '0.65rem', lineHeight: 1.3 }}>
                      {shopSettings?.termsAndConditions || 'Goods once sold cannot be returned.\nGold testing subject to local limits.'}
                    </Typography>
                  </Box>
                </Grid>

                {/* Right Side: Totals values list */}
                <Grid size={{ xs: 6 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Subtotal (Metal Value):</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        <MoneyDisplay amount={bill.pricingSnapshot.subtotal} />
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Making Charges:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        <MoneyDisplay amount={bill.pricingSnapshot.makingChargesTotal} />
                      </Typography>
                    </Box>
                    {bill.pricingSnapshot.wastageChargesTotal > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Wastage Value:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          <MoneyDisplay amount={bill.pricingSnapshot.wastageChargesTotal} />
                        </Typography>
                      </Box>
                    )}
                    {bill.pricingSnapshot.stoneChargesTotal > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Stone Charges:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          <MoneyDisplay amount={bill.pricingSnapshot.stoneChargesTotal} />
                        </Typography>
                      </Box>
                    )}
                    {bill.pricingSnapshot.otherChargesTotal > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Other Charges:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          <MoneyDisplay amount={bill.pricingSnapshot.otherChargesTotal} />
                        </Typography>
                      </Box>
                    )}
                    {bill.pricingSnapshot.discountAmount > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Discounts Offered:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.main' }}>
                          -<MoneyDisplay amount={bill.pricingSnapshot.discountAmount} />
                        </Typography>
                      </Box>
                    )}
                    <Divider sx={{ my: 0.5 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Taxable Amount:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        <MoneyDisplay amount={bill.pricingSnapshot.taxableAmount} />
                      </Typography>
                    </Box>

                    {bill.pricingSnapshot.igst !== undefined && bill.pricingSnapshot.igst > 0 ? (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">IGST (3.0%):</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          <MoneyDisplay amount={bill.pricingSnapshot.igst} />
                        </Typography>
                      </Box>
                    ) : (
                      <>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">CGST (1.5%):</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            <MoneyDisplay amount={bill.pricingSnapshot.cgst || 0} />
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">SGST (1.5%):</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            <MoneyDisplay amount={bill.pricingSnapshot.sgst || 0} />
                          </Typography>
                        </Box>
                      </>
                    )}
                    <Divider sx={{ my: 1 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>GRAND TOTAL:</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main' }}>
                        <MoneyDisplay amount={bill.pricingSnapshot.finalAmount} />
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.5 }}>
                      <Typography variant="body2" color="text.secondary">Paid Amount Receipt:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>
                        <MoneyDisplay amount={bill.paymentSummary.paidAmount} />
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Outstanding Dues balance:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: bill.paymentSummary.outstandingAmount > 0 ? 'error.main' : 'success.main' }}>
                        <MoneyDisplay amount={bill.paymentSummary.outstandingAmount} />
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">Payment Status State:</Typography>
                      <StatusChip status={bill.status} />
                    </Box>
                    {bill.paymentSummary.outstandingAmount > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">Liability Due Date:</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'error.main' }}>
                          <DateDisplay date={bill.dueDate} />
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Grid>
              </Grid>

              {/* Signatures Row */}
              <Box sx={{ mt: 7.5, display: 'flex', justifyContent: 'space-between', px: 2 }}>
                <Box sx={{ textAlign: 'center', width: 150 }}>
                  <Divider sx={{ borderColor: 'text.secondary', mb: 1 }} />
                  <Typography variant="caption" color="text.secondary">Client Signature</Typography>
                </Box>
                <Box sx={{ textAlign: 'center', width: 200 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
                    For, {shopSettings?.name || 'Aurum Jewelry House'}
                  </Typography>
                  <Divider sx={{ borderColor: 'text.secondary', mb: 1 }} />
                  <Typography variant="caption" color="text.secondary">Authorized Signatory</Typography>
                </Box>
              </Box>
            </Box>
          ) : (
            /* ========================================================
               THERMAL RECEIPTS LAYOUT (80mm & 58mm)
               ======================================================== */
            <Box>
              {/* Header: Shop details */}
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                  {shopSettings?.name || 'AURUM JEWELRY'}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', fontSize: '0.85em', color: 'text.secondary' }}>
                  {shopSettings?.address}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', fontSize: '0.85em' }}>
                  Phone: {shopSettings?.phone}
                </Typography>
                {shopSettings?.gstin && (
                  <Typography variant="caption" sx={{ display: 'block', fontSize: '0.85em', fontWeight: 600 }}>
                    GSTIN: {shopSettings.gstin}
                  </Typography>
                )}
              </Box>

              <Divider sx={{ borderStyle: 'dashed', my: 1 }} />

              {/* Bill demographics info */}
              <Box sx={{ fontSize: '0.9em', mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption"><strong>Bill:</strong> {bill.invoiceNumber}</Typography>
                  <Typography variant="caption">
                    <DateDisplay date={bill.createdAt} />
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                  <strong>Client:</strong> {bill.customerSnapshot.name} ({bill.customerSnapshot.phone})
                </Typography>
              </Box>

              <Divider sx={{ borderStyle: 'dashed', my: 1 }} />

              {/* Items text lists */}
              <Box sx={{ mb: 2 }}>
                {bill.itemsSnapshot.map((item, idx) => (
                  <Box key={idx} sx={{ mb: 1.5, fontSize: '0.95em' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      {idx + 1}. {item.productName}
                    </Typography>
                    <Box sx={{ pl: 1, display: 'flex', flexDirection: 'column', color: 'text.secondary' }}>
                      <Typography variant="caption">
                        Metal: {item.metal} {item.purity} | Net: {item.netWeight.toFixed(2)}g
                      </Typography>
                      <Typography variant="caption">
                        Rate: ₹{item.metalRate.toLocaleString('en-IN')} | Val: ₹{item.metalValue.toLocaleString('en-IN')}
                      </Typography>
                      {item.makingChargeAmount > 0 && (
                        <Typography variant="caption">
                          Making: ₹{item.makingChargeAmount.toLocaleString('en-IN')}
                        </Typography>
                      )}
                      {item.wastageAmount > 0 && (
                        <Typography variant="caption">
                          Wastage: ₹{item.wastageAmount.toLocaleString('en-IN')}
                        </Typography>
                      )}
                      {(item.stoneCharge + item.otherCharge) > 0 && (
                        <Typography variant="caption">
                          Stone/Other: ₹{(item.stoneCharge + item.otherCharge).toLocaleString('en-IN')}
                        </Typography>
                      )}
                      {item.discount > 0 && (
                        <Typography variant="caption" sx={{ color: 'error.main' }}>
                          Discount: -₹{item.discount.toLocaleString('en-IN')}
                        </Typography>
                      )}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'text.primary', mt: 0.25 }}>
                        <Typography variant="caption">Item Total:</Typography>
                        <Typography variant="caption">₹{item.finalAmount.toLocaleString('en-IN')}</Typography>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>

              <Divider sx={{ borderStyle: 'dashed', my: 1 }} />

              {/* Totals table summary */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, fontSize: '0.9em', mb: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption">Subtotal (Metal):</Typography>
                  <Typography variant="caption">₹{bill.pricingSnapshot.subtotal.toLocaleString('en-IN')}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption">Making Charges:</Typography>
                  <Typography variant="caption">₹{bill.pricingSnapshot.makingChargesTotal.toLocaleString('en-IN')}</Typography>
                </Box>
                {bill.pricingSnapshot.wastageChargesTotal > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption">Wastage Charges:</Typography>
                    <Typography variant="caption">₹{bill.pricingSnapshot.wastageChargesTotal.toLocaleString('en-IN')}</Typography>
                  </Box>
                )}
                {bill.pricingSnapshot.stoneChargesTotal > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption">Stone Charges:</Typography>
                    <Typography variant="caption">₹{bill.pricingSnapshot.stoneChargesTotal.toLocaleString('en-IN')}</Typography>
                  </Box>
                )}
                {bill.pricingSnapshot.discountAmount > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'error.main' }}>
                    <Typography variant="caption">Total Discount:</Typography>
                    <Typography variant="caption">-₹{bill.pricingSnapshot.discountAmount.toLocaleString('en-IN')}</Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption">Taxable Value:</Typography>
                  <Typography variant="caption">₹{bill.pricingSnapshot.taxableAmount.toLocaleString('en-IN')}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption">GST Tax (3%):</Typography>
                  <Typography variant="caption">₹{bill.pricingSnapshot.taxAmount.toLocaleString('en-IN')}</Typography>
                </Box>

                <Divider sx={{ borderStyle: 'dashed', my: 0.5 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <Typography variant="caption" sx={{ fontSize: '1.05em' }}>GRAND TOTAL:</Typography>
                  <Typography variant="caption" sx={{ fontSize: '1.05em' }}>₹{bill.pricingSnapshot.finalAmount.toLocaleString('en-IN')}</Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'success.main', mt: 0.5 }}>
                  <Typography variant="caption">Paid Amount:</Typography>
                  <Typography variant="caption">₹{bill.paymentSummary.paidAmount.toLocaleString('en-IN')}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', color: bill.paymentSummary.outstandingAmount > 0 ? 'error.main' : 'inherit' }}>
                  <Typography variant="caption">Balance Due:</Typography>
                  <Typography variant="caption">₹{bill.paymentSummary.outstandingAmount.toLocaleString('en-IN')}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                  <Typography variant="caption">Status:</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>{bill.status}</Typography>
                </Box>
              </Box>

              <Divider sx={{ borderStyle: 'dashed', my: 1 }} />

              {/* Footer */}
              <Box sx={{ textAlign: 'center', mt: 2, fontSize: '0.85em', color: 'text.secondary' }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
                  * Gold Purity Assured *
                </Typography>
                <Typography variant="caption" sx={{ display: 'block' }}>
                  Thank you! Visit again.
                </Typography>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>
    );
};

export default BillPreviewPage;
