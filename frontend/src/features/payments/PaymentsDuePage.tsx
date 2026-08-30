import { API_URL } from '../../config';
import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  InputAdornment,
} from '@mui/material';
import {
  Payment as CollectIcon,
  History as HistoryIcon,
  NotificationsActive as RemindIcon,
  Undo as ReverseIcon,
  TrendingDown as TrendingDownIcon,
  AccessTime as OverdueIcon,
  CalendarToday as TodayIcon,
  DateRange as WeekIcon,
  CheckCircleOutlined as CollectedIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import {
  PageHeader,
  MoneyDisplay,
  DateDisplay,
  DataTable,
  StatusChip,
  ConfirmDialog,
} from '../../components/shared';
import { useSnackbar } from '../../context/SnackbarContext';
import { useAuth } from '../../context/AuthContext';
import type { GridColDef } from '@mui/x-data-grid';

interface DueBill {
  id: string;
  _id?: string;
  invoiceNumber: string;
  customerSnapshot: {
    customerId: string;
    name: string;
    phone: string;
    customerCode: string;
  };
  dueDate: string;
  createdAt: string;
  pricingSnapshot: {
    finalAmount: number;
  };
  paymentSummary: {
    paidAmount: number;
    outstandingAmount: number;
  };
  status: string;
}

interface PaymentTransaction {
  id: string;
  _id: string;
  paymentId: string;
  amount: number;
  method: string;
  paymentDate: string;
  referenceNumber?: string;
  notes?: string;
  status: string;
  createdBy?: {
    name: string;
  };
}

interface DueSummary {
  totalOutstanding: number;
  dueToday: number;
  overdue: number;
  dueThisWeek: number;
  collectedToday: number;
}

export const PaymentsDuePage: React.FC = () => {
  const { token, hasPermission } = useAuth();
  const { showSuccess, showError } = useSnackbar();

  // Data states
  const [summary, setSummary] = useState<DueSummary>({
    totalOutstanding: 0,
    dueToday: 0,
    overdue: 0,
    dueThisWeek: 0,
    collectedToday: 0,
  });
  const [dueBills, setDueBills] = useState<DueBill[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingDue, setLoadingDue] = useState(true);

  // Modals state
  const [collectOpen, setCollectOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<DueBill | null>(null);
  
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyPayments, setHistoryPayments] = useState<PaymentTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [remindOpen, setRemindOpen] = useState(false);
  const [remindChannel, setRemindChannel] = useState<'WHATSAPP' | 'SMS' | 'EMAIL'>('WHATSAPP');
  const [reminderText, setReminderText] = useState('');
  const [reminderRecipient, setReminderRecipient] = useState('');
  const [sendingReminder, setSendingReminder] = useState(false);

  // Form states (Collect payment)
  const [collectAmount, setCollectAmount] = useState('');
  const [collectMethod, setCollectMethod] = useState('UPI');
  const [collectDate, setCollectDate] = useState('');
  const [collectRef, setCollectRef] = useState('');
  const [collectNotes, setCollectNotes] = useState('');
  
  // Reversal states
  const [reversalConfirmOpen, setReversalConfirmOpen] = useState(false);
  const [reversingPaymentId, setReversingPaymentId] = useState<string | null>(null);

  // Success Progression Dialog
  const [progressionOpen, setProgressionOpen] = useState(false);
  const [progressionData, setProgressionData] = useState<{
    invoice: string;
    oldDue: number;
    payment: number;
    newDue: number;
  } | null>(null);

  const canCollect = hasPermission('payment.create');
  const canReverse = hasPermission('payment.refund');

  // Fetch summary metrics & due invoices
  const fetchDashboardData = async () => {
    setLoadingSummary(true);
    setLoadingDue(true);

    try {
      const summaryRes = await fetch(API_URL + '/payments/due/summary', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!summaryRes.ok) throw new Error('Failed to load dues summary metrics');
      const summaryData = await summaryRes.json();
      setSummary(summaryData);
    } catch (err: any) {
      showError(err.message || 'Error fetching summaries');
    } finally {
      setLoadingSummary(false);
    }

    try {
      const dueRes = await fetch(API_URL + '/payments/due', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!dueRes.ok) throw new Error('Failed to load outstanding invoices list');
      const dueData = await dueRes.json();
      setDueBills(dueData);
    } catch (err: any) {
      showError(err.message || 'Error loading dues list');
    } finally {
      setLoadingDue(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  // Open Collect Payment modal
  const handleOpenCollect = (bill: DueBill) => {
    setSelectedBill(bill);
    setCollectAmount(bill.paymentSummary.outstandingAmount.toString());
    setCollectMethod('UPI');
    setCollectRef('');
    setCollectNotes('');
    
    // Default payment date to now in local ISO format
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setCollectDate(now.toISOString().slice(0, 16));

    setCollectOpen(true);
  };

  // Submit Collect Payment
  const handleSubmitCollect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBill) return;

    const amt = Number(collectAmount);
    if (isNaN(amt) || amt <= 0) {
      showError('Please enter a valid positive payment amount');
      return;
    }

    if (amt > selectedBill.paymentSummary.outstandingAmount) {
      showError(`Payment amount cannot exceed outstanding balance of ₹${selectedBill.paymentSummary.outstandingAmount}`);
      return;
    }

    const payload = {
      billId: selectedBill.id || selectedBill._id,
      amount: amt,
      method: collectMethod,
      paymentDate: new Date(collectDate).toISOString(),
      referenceNumber: collectRef.trim() || undefined,
      notes: collectNotes.trim() || undefined,
    };

    try {
      const res = await fetch(API_URL + '/payments/collect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Payment collection failed');
      }

      const resData = await res.json();
      setCollectOpen(false);
      
      // Setup and open the progression flow popup
      setProgressionData({
        invoice: selectedBill.invoiceNumber,
        oldDue: resData.oldDue,
        payment: amt,
        newDue: resData.newDue,
      });
      setProgressionOpen(true);

      // Refresh data
      fetchDashboardData();
    } catch (err: any) {
      showError(err.message || 'Error collecting payment');
    }
  };

  // Open Payment Timeline modal
  const handleOpenHistory = async (bill: DueBill) => {
    setSelectedBill(bill);
    setLoadingHistory(true);
    setHistoryOpen(true);

    try {
      const res = await fetch(`${API_URL}/payments/history/${bill.id || bill._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load payment timeline');
      const data = await res.json();
      setHistoryPayments(data);
    } catch (err: any) {
      showError(err.message || 'Error loading payment history');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Trigger Reversal confirmation
  const handleOpenReverse = (paymentId: string) => {
    setReversingPaymentId(paymentId);
    setReversalConfirmOpen(true);
  };

  // Execute Reversal
  const handleReversePayment = async () => {
    if (!reversingPaymentId || !selectedBill) return;

    try {
      const res = await fetch(`${API_URL}/payments/${reversingPaymentId}/reverse`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to reverse payment');
      }

      showSuccess('Payment transaction successfully reversed and voided');
      setReversalConfirmOpen(false);
      
      // Refresh timelines
      setHistoryOpen(false);
      fetchDashboardData();
    } catch (err: any) {
      showError(err.message || 'Error reversing payment transaction');
    }
  };

  // Open Reminders Modal & Load initial channel text
  const handleOpenRemind = async (bill: DueBill) => {
    setSelectedBill(bill);
    setRemindChannel('WHATSAPP');
    setRemindOpen(true);
    setReminderText('');
    setReminderRecipient('');
    
    // Auto trigger WhatsApp preview load
    loadReminderPreview(bill, 'WHATSAPP');
  };

  const loadReminderPreview = async (bill: DueBill, channel: 'WHATSAPP' | 'SMS' | 'EMAIL') => {
    setSendingReminder(true);
    try {
      // Execute remind endpoint which logs notification, prints to console, and returns preview text
      const res = await fetch(`${API_URL}/payments/remind/${bill.id || bill._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ channel }),
      });
      if (!res.ok) throw new Error('Failed to generate reminder template');
      const data = await res.json();
      setReminderText(data.messageText);
      setReminderRecipient(data.recipient);
    } catch (err: any) {
      showError(err.message || 'Error preparing reminder message');
    } finally {
      setSendingReminder(false);
    }
  };

  const handleChannelChange = (channel: 'WHATSAPP' | 'SMS' | 'EMAIL') => {
    setRemindChannel(channel);
    if (selectedBill) {
      loadReminderPreview(selectedBill, channel);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(reminderText);
    showSuccess('Reminder template copied to clipboard');
  };

  // Calculate Days Overdue
  const getDaysOverdue = (dueDateStr: string): number => {
    const due = new Date(dueDateStr).getTime();
    const now = Date.now();
    if (due >= now) return 0;
    return Math.floor((now - due) / (1000 * 60 * 60 * 24));
  };

  // DataTable columns definition
  const columns: GridColDef[] = [
    {
      field: 'customer',
      headerName: 'Customer',
      width: 170,
      valueGetter: (_, row) => row.customerSnapshot?.name || 'Walk-in',
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{params.row.customerSnapshot?.name}</Typography>
          <Typography variant="caption" color="text.secondary">{params.row.customerSnapshot?.phone}</Typography>
        </Box>
      ),
    },
    { field: 'invoiceNumber', headerName: 'Invoice', width: 120 },
    {
      field: 'createdAt',
      headerName: 'Bill Date',
      width: 120,
      renderCell: (params) => <DateDisplay date={params.value} />,
    },
    {
      field: 'total',
      headerName: 'Grand Total',
      width: 130,
      align: 'right',
      headerAlign: 'right',
      valueGetter: (_, row) => row.pricingSnapshot?.finalAmount || 0,
      renderCell: (params) => <MoneyDisplay amount={params.value} />,
    },
    {
      field: 'paid',
      headerName: 'Paid',
      width: 120,
      align: 'right',
      headerAlign: 'right',
      valueGetter: (_, row) => row.paymentSummary?.paidAmount || 0,
      renderCell: (params) => <MoneyDisplay amount={params.value} />,
    },
    {
      field: 'due',
      headerName: 'Outstanding Due',
      width: 130,
      align: 'right',
      headerAlign: 'right',
      valueGetter: (_, row) => row.paymentSummary?.outstandingAmount || 0,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main' }}>
          <MoneyDisplay amount={params.value} />
        </Typography>
      ),
    },
    {
      field: 'dueDate',
      headerName: 'Due Date',
      width: 120,
      renderCell: (params) => <DateDisplay date={params.value} />,
    },
    {
      field: 'daysOverdue',
      headerName: 'Days Overdue',
      width: 120,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (_, row) => getDaysOverdue(row.dueDate),
      renderCell: (params) => {
        const days = params.value;
        return (
          <Typography
            variant="body2"
            sx={{
              fontWeight: days > 0 ? 700 : 500,
              color: days > 0 ? 'error.main' : 'text.primary',
            }}
          >
            {days > 0 ? `${days} days` : '0'}
          </Typography>
        );
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => <StatusChip status={params.value} />,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {canCollect && (
            <Tooltip title="Collect Dues">
              <IconButton size="small" color="primary" onClick={() => handleOpenCollect(params.row as DueBill)}>
                <CollectIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Payment Timeline">
            <IconButton size="small" color="info" onClick={() => handleOpenHistory(params.row as DueBill)}>
              <HistoryIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Send Alert Reminder">
            <IconButton size="small" color="warning" onClick={() => handleOpenRemind(params.row as DueBill)}>
              <RemindIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader title="Outstanding & Due Management" subtitle="Monitor receivables, record due clearances, and dispatch message alerts" />

      {/* Summary Cards Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Total Outstanding */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card sx={{ bgcolor: 'background.paper', borderTop: '4px solid', borderColor: 'primary.main', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 700, color: 'text.secondary', letterSpacing: 0.5 }}>
                  Total Outstanding
                </Typography>
                <TrendingDownIcon color="primary" fontSize="small" />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {loadingSummary ? <CircularProgress size={20} /> : <MoneyDisplay amount={summary.totalOutstanding} />}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        {/* Overdue */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card sx={{ bgcolor: 'background.paper', borderTop: '4px solid', borderColor: 'error.main', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 700, color: 'text.secondary', letterSpacing: 0.5 }}>
                  Overdue
                </Typography>
                <OverdueIcon color="error" fontSize="small" />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'error.main' }}>
                {loadingSummary ? <CircularProgress size={20} /> : <MoneyDisplay amount={summary.overdue} />}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        {/* Due Today */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card sx={{ bgcolor: 'background.paper', borderTop: '4px solid', borderColor: 'warning.main', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 700, color: 'text.secondary', letterSpacing: 0.5 }}>
                  Due Today
                </Typography>
                <TodayIcon color="warning" fontSize="small" />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'warning.main' }}>
                {loadingSummary ? <CircularProgress size={20} /> : <MoneyDisplay amount={summary.dueToday} />}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        {/* Due This Week */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card sx={{ bgcolor: 'background.paper', borderTop: '4px solid', borderColor: 'info.main', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 700, color: 'text.secondary', letterSpacing: 0.5 }}>
                  Due This Week
                </Typography>
                <WeekIcon color="info" fontSize="small" />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {loadingSummary ? <CircularProgress size={20} /> : <MoneyDisplay amount={summary.dueThisWeek} />}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        {/* Collected Today */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card sx={{ bgcolor: 'background.paper', borderTop: '4px solid', borderColor: 'success.main', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 700, color: 'text.secondary', letterSpacing: 0.5 }}>
                  Collected Today
                </Typography>
                <CollectedIcon color="success" fontSize="small" />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>
                {loadingSummary ? <CircularProgress size={20} /> : <MoneyDisplay amount={summary.collectedToday} />}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Due Table Card */}
      <Card sx={{ boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
        <CardContent sx={{ p: 3 }}>
          <DataTable
            rows={dueBills.map((b) => ({
              ...b,
              id: b.id || b._id || Math.random().toString(),
            }))}
            columns={columns}
            loading={loadingDue}
            emptyTitle="No Outstanding Receivables"
            emptyDescription="All invoices have been fully cleared and paid. Cash flow is balanced."
          />
        </CardContent>
      </Card>

      {/* Collect Payment Modal */}
      <Dialog open={collectOpen} onClose={() => setCollectOpen(false)} maxWidth="xs" fullWidth>
        {selectedBill && (
          <form onSubmit={handleSubmitCollect}>
            <DialogTitle sx={{ fontWeight: 600 }}>Collect Outstanding: {selectedBill.invoiceNumber}</DialogTitle>
            <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
              <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Customer Code / Name</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {selectedBill.customerSnapshot?.name} ({selectedBill.customerSnapshot?.phone})
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary">Current Due Balance:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main' }}>
                    ₹{selectedBill.paymentSummary.outstandingAmount.toLocaleString('en-IN')}
                  </Typography>
                </Box>
              </Box>

              <TextField
                fullWidth
                label="Payment Amount to Collect"
                type="number"
                value={collectAmount}
                onChange={(e) => setCollectAmount(e.target.value)}
                required
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                    htmlInput: { min: 0.1, max: selectedBill.paymentSummary.outstandingAmount, step: 'any' },
                  },
                }}
              />

              <TextField
                fullWidth
                select
                label="Payment Method"
                value={collectMethod}
                onChange={(e) => setCollectMethod(e.target.value)}
              >
                <MenuItem value="CASH">Cash</MenuItem>
                <MenuItem value="UPI">UPI</MenuItem>
                <MenuItem value="CARD">Card</MenuItem>
                <MenuItem value="BANK_TRANSFER">Bank transfer</MenuItem>
                <MenuItem value="CHEQUE">Cheque</MenuItem>
                <MenuItem value="OTHER">Other</MenuItem>
              </TextField>

              <TextField
                fullWidth
                label="Payment Date & Time"
                type="datetime-local"
                value={collectDate}
                onChange={(e) => setCollectDate(e.target.value)}
                required
              />

              <TextField
                fullWidth
                label="Reference ID / Transaction Code"
                value={collectRef}
                onChange={(e) => setCollectRef(e.target.value)}
                placeholder="e.g. UPI Ref, Cheque No"
              />

              <TextField
                fullWidth
                multiline
                rows={2}
                label="Transaction Notes"
                value={collectNotes}
                onChange={(e) => setCollectNotes(e.target.value)}
                placeholder="Remarks..."
              />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setCollectOpen(false)} color="inherit">Cancel</Button>
              <Button type="submit" variant="contained" color="primary">Record Collection</Button>
            </DialogActions>
          </form>
        )}
      </Dialog>

      {/* Progression Success Display Dialog */}
      <Dialog open={progressionOpen} onClose={() => setProgressionOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, color: 'success.main' }}>Collection Recorded</DialogTitle>
        <DialogContent dividers sx={{ py: 3 }}>
          {progressionData && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>
                Payment logged successfully for invoice {progressionData.invoice}!
              </Typography>
              <Grid container spacing={2} sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1.5 }}>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">Old Outstanding</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, textDecoration: 'line-through' }}>
                    <MoneyDisplay amount={progressionData.oldDue} />
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">Amount Cleared</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'success.main' }}>
                    -<MoneyDisplay amount={progressionData.payment} />
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">New Outstanding</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    <MoneyDisplay amount={progressionData.newDue} />
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setProgressionOpen(false)} variant="contained" color="primary" fullWidth>
            Proceed
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Timeline / History Modal */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Payment Timeline Ledger</DialogTitle>
        <DialogContent dividers>
          {loadingHistory ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : historyPayments.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              No payments have been logged for this invoice yet.
            </Typography>
          ) : (
            <List sx={{ py: 0 }}>
              {historyPayments.map((pay, index) => {
                const reversed = pay.status === 'FAILED';
                return (
                  <React.Fragment key={pay.paymentId}>
                    <ListItem
                      alignItems="flex-start"
                      sx={{
                        px: 0,
                        py: 2,
                        opacity: reversed ? 0.5 : 1,
                      }}
                      secondaryAction={
                        canReverse && !reversed ? (
                          <Tooltip title="Reverse/Void Transaction">
                            <IconButton size="small" color="error" onClick={() => handleOpenReverse(pay._id)}>
                              <ReverseIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : undefined
                      }
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, textDecoration: reversed ? 'line-through' : 'none' }}>
                              ₹{pay.amount.toLocaleString('en-IN')} — {pay.method}
                            </Typography>
                            {reversed && (
                              <Typography variant="caption" sx={{ bgcolor: 'error.main', color: 'error.contrastText', px: 1, borderRadius: 0.5, fontWeight: 700 }}>
                                VOIDED
                              </Typography>
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              Date: <DateDisplay date={pay.paymentDate} includeTime /> | Ref: {pay.referenceNumber || 'N/A'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              ID: {pay.paymentId} | Logged by: {pay.createdBy?.name || 'System'}
                            </Typography>
                            {pay.notes && (
                              <Typography variant="caption" sx={{ fontStyle: 'italic', display: 'block', mt: 0.5, color: 'text.primary' }}>
                                Notes: {pay.notes}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < historyPayments.length - 1 && <Divider />}
                  </React.Fragment>
                );
              })}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setHistoryOpen(false)} color="inherit">Close Ledger</Button>
        </DialogActions>
      </Dialog>

      {/* Reminder Preview Modal */}
      <Dialog open={remindOpen} onClose={() => setRemindOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Prepare Reminder Alert</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
          <ToggleButtonGroup
            value={remindChannel}
            exclusive
            fullWidth
            onChange={(_, val) => val && handleChannelChange(val)}
          >
            <ToggleButton value="WHATSAPP">WhatsApp</ToggleButton>
            <ToggleButton value="SMS">SMS Link</ToggleButton>
            <ToggleButton value="EMAIL">Email</ToggleButton>
          </ToggleButtonGroup>

          {sendingReminder ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={30} />
            </Box>
          ) : (
            <>
              <TextField
                fullWidth
                label="Recipient Contact"
                value={reminderRecipient}
                disabled
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">To:</InputAdornment>,
                  },
                }}
              />
              <TextField
                fullWidth
                multiline
                rows={5}
                label="Message Payload Preview"
                value={reminderText}
                disabled
                helperText="Reminder triggers notification logs in backend console."
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, display: 'flex', gap: 1 }}>
          <Button onClick={() => setRemindOpen(false)} color="inherit" sx={{ flexGrow: 1 }}>Close</Button>
          <Button
            startIcon={<CopyIcon />}
            variant="contained"
            color="primary"
            disabled={!reminderText || sendingReminder}
            onClick={copyToClipboard}
            sx={{ flexGrow: 1 }}
          >
            Copy Message
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reversal Confirmation Dialog */}
      <ConfirmDialog
        open={reversalConfirmOpen}
        title="Confirm Payment Reversal"
        content="Are you sure you want to reverse and void this payment? This is an immutable operation. The transaction remains logged but marked as failed, and the payment amount will be added back onto the bill's outstanding balance."
        confirmText="Confirm Reversal"
        color="error"
        onConfirm={handleReversePayment}
        onCancel={() => setReversalConfirmOpen(false)}
      />
    </Box>
  );
};

export default PaymentsDuePage;
