import { API_URL } from '../../config';
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Tabs,
  Tab,
  Button,
  Grid,
  TextField,
  Typography,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Print as PrintIcon,
  Timeline as SalesIcon,
  Scale as MetalIcon,
  Payments as PaymentIcon,
  WarningAmber as OutstandingIcon,
  Percent as TaxIcon,
} from '@mui/icons-material';
import {
  PageHeader,
  MoneyDisplay,
  DateDisplay,
} from '../../components/shared';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from '../../context/SnackbarContext';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export const ReportsPage: React.FC = () => {
  const { token } = useAuth();
  const { showSuccess, showError } = useSnackbar();

  // Tab State
  const [activeTab, setActiveTab] = useState(0);

  // Filters State
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30); // default last 30 days
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [search, setSearch] = useState('');
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Data States
  const [loading, setLoading] = useState(false);
  const [salesReport, setSalesReport] = useState<any>(null);
  const [metalReport, setMetalReport] = useState<any>(null);
  const [paymentReport, setPaymentReport] = useState<any>(null);
  const [outstandingReport, setOutstandingReport] = useState<any>(null);
  const [gstReport, setGstReport] = useState<any>(null);

  const fetchActiveReport = async () => {
    setLoading(true);
    try {
      const datesParam = `&startDate=${startDate}&endDate=${endDate}`;
      if (activeTab === 0) {
        // Sales Report
        const res = await fetch(`${API_URL}/reports/sales?page=${page}&limit=${limit}${datesParam}&search=${encodeURIComponent(search)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch sales report');
        setSalesReport(await res.json());
      } else if (activeTab === 1) {
        // Metal Report
        const res = await fetch(`${API_URL}/reports/metal?${datesParam.substring(1)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch metal report');
        setMetalReport(await res.json());
      } else if (activeTab === 2) {
        // Payment Report
        const res = await fetch(`${API_URL}/reports/payments?${datesParam.substring(1)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch payment report');
        setPaymentReport(await res.json());
      } else if (activeTab === 3) {
        // Outstanding Report
        const res = await fetch(`${API_URL}/reports/outstanding?page=${page}&limit=${limit}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch outstanding report');
        setOutstandingReport(await res.json());
      } else if (activeTab === 4) {
        // GST Report
        const res = await fetch(`${API_URL}/reports/gst?${datesParam.substring(1)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch GST report');
        setGstReport(await res.json());
      }
    } catch (err: any) {
      showError(err.message || 'Error fetching report details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchActiveReport();
    }
  }, [token, activeTab, startDate, endDate, search, page]);

  // Export to CSV
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = 'Report';

    if (activeTab === 0 && salesReport?.items) {
      filename = `Sales_Report_${startDate}_to_${endDate}`;
      headers = ['Invoice Number', 'Customer Name', 'Phone', 'Invoice Date', 'Amount (INR)', 'Paid (INR)', 'Salesperson'];
      rows = salesReport.items.map((b: any) => [
        b.invoiceNumber,
        b.customerSnapshot.name,
        b.customerSnapshot.phone,
        new Date(b.createdAt).toLocaleDateString('en-IN'),
        b.pricingSnapshot.finalAmount.toString(),
        b.paymentSummary.paidAmount.toString(),
        b.createdBy?.name || 'System',
      ]);
    } else if (activeTab === 1 && metalReport) {
      filename = `Metal_Report_${startDate}_to_${endDate}`;
      headers = ['Metal & Purity Type', 'Quantity Sold (Pcs)', 'Net Weight Sold (Grams)'];
      rows = [
        ['Total Gold Sold', metalReport.goldQuantity.toString(), metalReport.goldWeight.toString()],
        ['Total Silver Sold', metalReport.silverQuantity.toString(), metalReport.silverWeight.toString()],
        ...metalReport.purityBreakdown.map((p: any) => [p.purity, p.quantity.toString(), p.weight.toString()]),
      ];
    } else if (activeTab === 2 && paymentReport) {
      filename = `Payment_Report_${startDate}_to_${endDate}`;
      headers = ['Payment Mode Method', 'Total Amount Collected (INR)'];
      rows = [
        ['Cash Settlement', paymentReport.cash.toString()],
        ['UPI Payment', paymentReport.upi.toString()],
        ['Card Swipe', paymentReport.card.toString()],
        ['Net Banking Direct Transfer', paymentReport.bank.toString()],
        ['Cheque Clearings', paymentReport.cheque.toString()],
        ['GRAND TOTAL COLLECTIONS', paymentReport.total.toString()],
      ];
    } else if (activeTab === 3 && outstandingReport?.items) {
      filename = 'Outstanding_Debts_Report';
      headers = ['Client Name', 'Invoice', 'Total Amount (INR)', 'Paid (INR)', 'Outstanding Due (INR)', 'Liability Date', 'Overdue Days'];
      rows = outstandingReport.items.map((o: any) => [
        o.customerName,
        o.invoiceNumber,
        o.total.toString(),
        o.paid.toString(),
        o.due.toString(),
        new Date(o.dueDate).toLocaleDateString('en-IN'),
        o.overdueDays.toString(),
      ]);
    } else if (activeTab === 4 && gstReport) {
      filename = `GST_Tax_Report_${startDate}_to_${endDate}`;
      headers = ['Tax Parameter Ledger', 'Amount (INR)'];
      rows = [
        ['Total Net Taxable Value', gstReport.taxableValue.toString()],
        ['Central GST (CGST - 1.5%)', gstReport.cgst.toString()],
        ['State GST (SGST - 1.5%)', gstReport.sgst.toString()],
        ['Integrated GST (IGST - 3.0%)', gstReport.igst.toString()],
        ['GRAND TOTAL TAXES COLLECTED', gstReport.totalTax.toString()],
      ];
    }

    if (headers.length === 0) return;

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess('CSV exported successfully');
  };

  // Export to PDF
  const handleExportPDF = async () => {
    const element = document.getElementById('report-printable-area');
    if (!element) return;

    showSuccess('Generating report PDF...');
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const widthMm = 210;
      const pageHeightMm = 297;
      const imgHeightMm = (canvas.height * widthMm) / canvas.width;
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

      pdf.save(`Report_Export_${activeTab}.pdf`);
      showSuccess('PDF downloaded successfully');
    } catch (err: any) {
      showError('Failed to generate PDF: ' + err.message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Box>
      <style>{`
        @media print {
          body { background: #fff; color: #000; }
          .no-print { display: none !important; }
          #report-printable-area { box-shadow: none !important; border: none !important; width: 100% !important; margin: 0 !important; }
        }
      `}</style>

      {/* Header bar controls (Hidden during print) */}
      <Box className="no-print">
        <PageHeader
          title="Reports & Analytics Ledger"
          subtitle="Generate sales journals, tax audits, payment reports, outstanding liabilities sheets, and metal weight volume summaries"
          action={
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button variant="outlined" color="primary" startIcon={<DownloadIcon />} onClick={handleExportCSV}>
                Export CSV
              </Button>
              <Button variant="outlined" color="secondary" startIcon={<DownloadIcon />} onClick={handleExportPDF}>
                Export PDF
              </Button>
              <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint}>
                Print Report
              </Button>
            </Box>
          }
        />
      </Box>

      {/* Filter panel bar controls (Hidden during print) */}
      <Card className="no-print" sx={{ mb: 3.5, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Grid container spacing={2.5} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, sm: 3.5 }}>
              <TextField
                type="date"
                fullWidth
                label="Report Start Date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3.5 }}>
              <TextField
                type="date"
                fullWidth
                label="Report End Date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 5 }}>
              <TextField
                fullWidth
                label="Search Ledger Filter"
                placeholder="Query invoice numbers, phone, names..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Report tabs controls panel (Hidden during print) */}
      <Card className="no-print" sx={{ mb: 3.5 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 1 }}>
          <Tabs value={activeTab} onChange={(_, val) => { setActiveTab(val); setPage(1); }} variant="scrollable" scrollButtons="auto">
            <Tab label="Sales Journal" icon={<SalesIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
            <Tab label="Metal Weights" icon={<MetalIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
            <Tab label="Payments Audit" icon={<PaymentIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
            <Tab label="Outstanding Dues" icon={<OutstandingIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
            <Tab label="GST Tax Returns" icon={<TaxIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
          </Tabs>
        </Box>
      </Card>

      {/* Printable Report Data Container Sheet */}
      <Paper id="report-printable-area" variant="outlined" sx={{ p: 3.5, boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
            <CircularProgress size={45} />
          </Box>
        ) : (
          <Box>
            {/* Print Header header details (Only visible on print/PDF) */}
            <Box sx={{ display: 'none', '@media print': { display: 'block' }, mb: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                Aurum Jewelry House Reports
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Report Date Range: {startDate} to {endDate}
              </Typography>
            </Box>

            {/* TAB 0: Sales Journal */}
            {activeTab === 0 && salesReport && (
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  Daily Sales & Invoicing Journal
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Invoice #</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Sales Amount</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Paid Amount</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Salesperson</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {salesReport.items.map((b: any) => (
                        <TableRow key={b._id}>
                          <TableCell sx={{ fontWeight: 600 }}>{b.invoiceNumber}</TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{b.customerSnapshot.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{b.customerSnapshot.phone}</Typography>
                          </TableCell>
                          <TableCell><DateDisplay date={b.createdAt} /></TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            <MoneyDisplay amount={b.pricingSnapshot.finalAmount} />
                          </TableCell>
                          <TableCell align="right" sx={{ color: 'success.main' }}>
                            <MoneyDisplay amount={b.paymentSummary.paidAmount} />
                          </TableCell>
                          <TableCell>{b.createdBy?.name || 'System'}</TableCell>
                        </TableRow>
                      ))}

                      {/* Total Aggregates Row */}
                      <TableRow sx={{ bgcolor: 'rgba(197, 168, 128, 0.08)' }}>
                        <TableCell colSpan={3} sx={{ fontWeight: 800 }}>REPORT GRAND TOTALS:</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800 }}>
                          <MoneyDisplay amount={salesReport.summary.totalSalesAmount} />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: 'success.main' }}>
                          <MoneyDisplay amount={salesReport.summary.totalPaidAmount} />
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Pagination Controls */}
                {salesReport.pagination.totalPages > 1 && (
                  <Box className="no-print" sx={{ display: 'flex', justifyContent: 'center', mt: 3, gap: 1.5 }}>
                    <Button disabled={page <= 1} onClick={() => setPage(p => p - 1)} variant="outlined">Prev</Button>
                    <Typography sx={{ alignSelf: 'center' }}>
                      Page {page} of {salesReport.pagination.totalPages}
                    </Typography>
                    <Button disabled={page >= salesReport.pagination.totalPages} onClick={() => setPage(p => p + 1)} variant="outlined">Next</Button>
                  </Box>
                )}
              </Box>
            )}

            {/* TAB 1: Metal weights report */}
            {activeTab === 1 && metalReport && (
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  Metal Volumes & Purity Weight Summary
                </Typography>
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  <Grid size={{ xs: 6 }}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderTop: '4px solid', borderColor: 'primary.main' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>GOLD WEIGHT SOLD</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 800 }}>{metalReport.goldWeight.toFixed(3)} g</Typography>
                      <Typography variant="caption" color="text.secondary">{metalReport.goldQuantity} Items</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderTop: '4px solid', borderColor: 'secondary.main' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>SILVER WEIGHT SOLD</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 800 }}>{metalReport.silverWeight.toFixed(3)} g</Typography>
                      <Typography variant="caption" color="text.secondary">{metalReport.silverQuantity} Items</Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Purity Breakdowns</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Metal & Purity Category</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Pieces Sold</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Total Net Weight (Grams)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {metalReport.purityBreakdown.map((p: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell sx={{ fontWeight: 600, textTransform: 'uppercase' }}>{p.purity}</TableCell>
                          <TableCell align="right">{p.quantity}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>{p.weight.toFixed(3)}g</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* TAB 2: Payment receipts audit */}
            {activeTab === 2 && paymentReport && (
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  Collected Payment Receipts Summary
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                  <Table>
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Payment Method Mode</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Total Amount Received</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Cash Payments</TableCell>
                        <TableCell align="right"><MoneyDisplay amount={paymentReport.cash} /></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>UPI Payments (GPay/PhonePe)</TableCell>
                        <TableCell align="right"><MoneyDisplay amount={paymentReport.upi} /></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Debit / Credit Cards</TableCell>
                        <TableCell align="right"><MoneyDisplay amount={paymentReport.card} /></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Bank NET Transfers</TableCell>
                        <TableCell align="right"><MoneyDisplay amount={paymentReport.bank} /></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Cheques Collections</TableCell>
                        <TableCell align="right"><MoneyDisplay amount={paymentReport.cheque} /></TableCell>
                      </TableRow>
                      <TableRow sx={{ bgcolor: 'rgba(46, 125, 50, 0.08)' }}>
                        <TableCell sx={{ fontWeight: 800 }}>GRAND TOTAL RECEIPTS:</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: 'success.main' }}>
                          <MoneyDisplay amount={paymentReport.total} />
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* TAB 3: Outstanding dues list */}
            {activeTab === 3 && outstandingReport && (
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  Outstanding Client Accounts Due list
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Customer Name</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Invoice Code</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Invoice Value</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Paid Amount</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Outstanding Balance</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Payment Due Date</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Overdue Days</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {outstandingReport.items.map((o: any) => (
                        <TableRow key={o._id}>
                          <TableCell sx={{ fontWeight: 600 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{o.customerName}</Typography>
                            <Typography variant="caption" color="text.secondary">{o.customerPhone}</Typography>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{o.invoiceNumber}</TableCell>
                          <TableCell align="right"><MoneyDisplay amount={o.total} /></TableCell>
                          <TableCell align="right" sx={{ color: 'success.main' }}><MoneyDisplay amount={o.paid} /></TableCell>
                          <TableCell align="right" sx={{ color: 'error.main', fontWeight: 700 }}><MoneyDisplay amount={o.due} /></TableCell>
                          <TableCell><DateDisplay date={o.dueDate} /></TableCell>
                          <TableCell sx={{ color: o.overdueDays > 0 ? 'error.main' : 'inherit', fontWeight: o.overdueDays > 0 ? 700 : 'inherit' }}>
                            {o.overdueDays > 0 ? `${o.overdueDays} Days Overdue` : 'Not Overdue'}
                          </TableCell>
                        </TableRow>
                      ))}

                      {/* Summary Aggregates Row */}
                      <TableRow sx={{ bgcolor: 'rgba(211, 47, 47, 0.08)' }}>
                        <TableCell colSpan={2} sx={{ fontWeight: 800 }}>GRAND TOTAL LIABILITIES:</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800 }}><MoneyDisplay amount={outstandingReport.summary.grandTotal} /></TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: 'success.main' }}><MoneyDisplay amount={outstandingReport.summary.grandPaid} /></TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: 'error.main' }}><MoneyDisplay amount={outstandingReport.summary.grandDue} /></TableCell>
                        <TableCell colSpan={2} />
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Pagination Controls */}
                {outstandingReport.pagination.totalPages > 1 && (
                  <Box className="no-print" sx={{ display: 'flex', justifyContent: 'center', mt: 3, gap: 1.5 }}>
                    <Button disabled={page <= 1} onClick={() => setPage(p => p - 1)} variant="outlined">Prev</Button>
                    <Typography sx={{ alignSelf: 'center' }}>
                      Page {page} of {outstandingReport.pagination.totalPages}
                    </Typography>
                    <Button disabled={page >= outstandingReport.pagination.totalPages} onClick={() => setPage(p => p + 1)} variant="outlined">Next</Button>
                  </Box>
                )}
              </Box>
            )}

            {/* TAB 4: GST Tax returns report */}
            {activeTab === 4 && gstReport && (
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  GST Tax Ledger & Returns Summary
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Tax Parameter Description</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Total Value Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Total Net Taxable Value (Subtotal - Discount)</TableCell>
                        <TableCell align="right"><MoneyDisplay amount={gstReport.taxableValue} /></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Central GST (CGST - 1.5%)</TableCell>
                        <TableCell align="right" sx={{ color: 'primary.main' }}><MoneyDisplay amount={gstReport.cgst} /></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>State GST (SGST - 1.5%)</TableCell>
                        <TableCell align="right" sx={{ color: 'primary.main' }}><MoneyDisplay amount={gstReport.sgst} /></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Integrated GST (IGST - 3.0%)</TableCell>
                        <TableCell align="right" sx={{ color: 'primary.main' }}><MoneyDisplay amount={gstReport.igst} /></TableCell>
                      </TableRow>
                      <TableRow sx={{ bgcolor: 'rgba(197, 168, 128, 0.08)' }}>
                        <TableCell sx={{ fontWeight: 800 }}>GRAND TOTAL GST TAXES COLLECTED:</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: 'primary.main' }}>
                          <MoneyDisplay amount={gstReport.totalTax} />
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default ReportsPage;
