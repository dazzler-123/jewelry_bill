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
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
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
  Person as PersonIcon,
  Receipt as ReceiptIcon,
  Payments as PaymentsIcon,
  WhatsApp as WhatsAppIcon,
  Add as AddIcon,
  Edit as EditIcon,
  AttachMoney as MoneyIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import {
  MoneyDisplay,
  DateDisplay,
  StatusChip,
} from '../../components/shared';
import { useSnackbar } from '../../context/SnackbarContext';
import { useAuth } from '../../context/AuthContext';

interface CustomerFinancials {
  totalPurchase: number;
  totalPaid: number;
  outstanding: number;
  overdue: number;
  lastPurchase?: string | null;
}

interface Bill {
  _id: string;
  id: string;
  invoiceNumber: string;
  createdAt: string;
  dueDate: string;
  status: string;
  pricingSnapshot: {
    finalAmount: number;
  };
  paymentSummary: {
    paidAmount: number;
    outstandingAmount: number;
  };
}

interface Payment {
  _id: string;
  paymentId: string;
  amount: number;
  method: string;
  paymentDate: string;
  referenceNumber?: string;
  notes?: string;
  status: string;
}

interface Customer {
  _id: string;
  customerCode: string;
  name: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  notes?: string;
  financials?: CustomerFinancials;
  bills?: Bill[];
  payments?: Payment[];
}

export const CustomerProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const { showSuccess, showError } = useSnackbar();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  // Edit Demographics Dialog States
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAlternatePhone, setEditAlternatePhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editPincode, setEditPincode] = useState('');
  const [editGstin, setEditGstin] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  // Collect Payment Dialog States
  const [collectOpen, setCollectOpen] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState('');
  const [collectAmount, setCollectAmount] = useState('');
  const [collectMethod, setCollectMethod] = useState('CASH');
  const [collectReference, setCollectReference] = useState('');
  const [collectNotes, setCollectNotes] = useState('');
  const [collecting, setCollecting] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/customers/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Customer profile not found');
      const data = await res.json();
      setCustomer(data);

      // Prefill edit form state
      setEditName(data.name || '');
      setPhoneState(data);
    } catch (err: any) {
      showError(err.message || 'Error fetching customer profile');
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  };

  const setPhoneState = (data: Customer) => {
    setEditPhone(data.phone || '');
    setEditAlternatePhone(data.alternatePhone || '');
    setEditEmail(data.email || '');
    setEditAddress(data.address || '');
    setEditCity(data.city || '');
    setEditState(data.state || '');
    setEditPincode(data.pincode || '');
    setEditGstin(data.gstin || '');
    setEditNotes(data.notes || '');
  };

  useEffect(() => {
    if (token && id) {
      fetchProfile();
    }
  }, [token, id]);

  const handleEditOpen = () => {
    if (customer) {
      setEditName(customer.name);
      setPhoneState(customer);
      setEditOpen(true);
    }
  };

  // Submit Demographics Changes
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editPhone.trim()) {
      showError('Name and primary phone are required');
      return;
    }

    setUpdating(true);
    const payload = {
      name: editName.trim(),
      phone: editPhone.trim(),
      alternatePhone: editAlternatePhone.trim() || undefined,
      email: editEmail.trim() || undefined,
      address: editAddress.trim() || undefined,
      city: editCity.trim() || undefined,
      state: editState.trim() || undefined,
      pincode: editPincode.trim() || undefined,
      gstin: editGstin.trim() || undefined,
      notes: editNotes.trim() || undefined,
    };

    try {
      const res = await fetch(`${API_URL}/customers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to update demographics');
      }

      showSuccess('Demographics updated successfully');
      setEditOpen(false);
      fetchProfile();
    } catch (err: any) {
      showError(err.message || 'Error updating demographics');
    } finally {
      setUpdating(false);
    }
  };

  // Submit Collect Payment against outstanding invoice
  const handleCollectPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amtVal = Number(collectAmount) || 0;
    if (!selectedBillId) {
      showError('Please select an outstanding invoice');
      return;
    }
    if (amtVal <= 0) {
      showError('Payment amount must be greater than zero');
      return;
    }

    const matchedBill = customer?.bills?.find((b) => b._id === selectedBillId);
    if (matchedBill && amtVal > matchedBill.paymentSummary.outstandingAmount) {
      showError(`Amount exceeds invoice outstanding balance of ₹${matchedBill.paymentSummary.outstandingAmount}`);
      return;
    }

    setCollecting(true);
    const payload = {
      billId: selectedBillId,
      amount: amtVal,
      method: collectMethod,
      referenceNumber: collectReference.trim() || undefined,
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
        const err = await res.json();
        throw new Error(err.message || 'Payment collection failed');
      }

      showSuccess(`Payment of ₹${amtVal} recorded successfully`);
      setCollectOpen(false);
      // reset forms
      setSelectedBillId('');
      setCollectAmount('');
      setCollectReference('');
      setCollectNotes('');
      fetchProfile();
    } catch (err: any) {
      showError(err.message || 'Error logging payment');
    } finally {
      setCollecting(false);
    }
  };

  // Pre-fill invoice for collection when paying directly from Due Bills tab
  const handleOpenCollectForInvoice = (billId: string, outstandingAmt: number) => {
    setSelectedBillId(billId);
    setCollectAmount(outstandingAmt.toString());
    setCollectOpen(true);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={50} />
      </Box>
    );
  }

  if (!customer) return null;

  const dueBills = customer.bills?.filter((b) => b.paymentSummary.outstandingAmount > 0) || [];
  const cleanPhoneForWa = customer.phone.replace(/\D/g, '');

  return (
    <Box>
      {/* Top action header navigation bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3.5 }}>
        <Button
          variant="outlined"
          color="inherit"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/customers')}
        >
          Back to Directory
        </Button>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: '"Playfair Display", serif' }}>
            Client Profile: {customer.name}
          </Typography>
          <Typography variant="caption" sx={{ bgcolor: 'action.hover', px: 1, py: 0.25, borderRadius: 0.5, fontWeight: 700 }}>
            Demographics Code: {customer.customerCode}
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3.5}>
        {/* Left Side: Profile Detail Summary Card & Quick Actions panel */}
        <Grid size={{ xs: 12, md: 4.5 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
            {/* Demographics Card */}
            <Card variant="outlined" sx={{ borderTop: '4px solid', borderColor: 'primary.main', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <PersonIcon color="primary" sx={{ fontSize: 28 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Contact Information
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2.5 }} />

                <Grid container spacing={2.5}>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Mobile Number</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{customer.phone}</Typography>
                  </Grid>
                  {customer.alternatePhone && (
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Alternate Phone</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{customer.alternatePhone}</Typography>
                    </Grid>
                  )}
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Email ID Address</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{customer.email || 'N/A'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Postal Address</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {[customer.address, customer.city, customer.state, customer.pincode].filter(Boolean).join(', ') || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>GSTIN</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      {customer.gstin || 'Unregistered'}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Internal Remarks</Typography>
                    <Typography variant="body2" sx={{ fontStyle: 'italic' }}>{customer.notes || 'None'}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Quick Actions Panel */}
            <Card variant="outlined" sx={{ boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                  Quick Action Tools
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    fullWidth
                    onClick={() => navigate(`/billing/new?customerId=${customer._id}`)}
                  >
                    New POS Bill
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<MoneyIcon />}
                    fullWidth
                    disabled={(customer.financials?.outstanding || 0) <= 0}
                    onClick={() => setCollectOpen(true)}
                  >
                    Collect Payment Due
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<ReceiptIcon />}
                    fullWidth
                    onClick={() => navigate('/bills')}
                  >
                    View All Bills
                  </Button>
                  <Button
                    variant="outlined"
                    color="success"
                    startIcon={<WhatsAppIcon />}
                    fullWidth
                    onClick={() => window.open(`https://wa.me/91${cleanPhoneForWa}`, '_blank')}
                  >
                    WhatsApp Customer
                  </Button>
                  <Button
                    variant="outlined"
                    color="info"
                    startIcon={<EditIcon />}
                    fullWidth
                    onClick={handleEditOpen}
                  >
                    Edit Demographics
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Grid>

        {/* Right Side: Stat metrics cards & tabs details list */}
        <Grid size={{ xs: 12, md: 7.5 }}>
          {/* Stats Metrics Panels Row */}
          {customer.financials && (
            <Grid container spacing={2} sx={{ mb: 3.5 }}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderTop: '4px solid', borderColor: 'primary.main' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Purchases</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>
                    <MoneyDisplay amount={customer.financials.totalPurchase} />
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderTop: '4px solid', borderColor: 'success.main' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Total Paid</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700, color: 'success.main' }}>
                    <MoneyDisplay amount={customer.financials.totalPaid} />
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderTop: '4px solid', borderColor: 'warning.main' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Outstanding</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700, color: 'warning.main' }}>
                    <MoneyDisplay amount={customer.financials.outstanding} />
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderTop: '4px solid', borderColor: 'error.main' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Overdue Balance</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700, color: 'error.main' }}>
                    <MoneyDisplay amount={customer.financials.overdue} />
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* History ledger Tabs panels container */}
          <Card variant="outlined" sx={{ boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 1 }}>
              <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)}>
                <Tab label="Purchase History" icon={<ReceiptIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
                <Tab label="Payment History" icon={<PaymentsIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
                <Tab label={`Due Bills (${dueBills.length})`} icon={<WarningIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
              </Tabs>
            </Box>

            <CardContent sx={{ p: 3 }}>
              {/* Tab 0: Invoices list */}
              {activeTab === 0 && (
                <Box>
                  {(!customer.bills || customer.bills.length === 0) ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center', fontStyle: 'italic' }}>
                      No bills cataloged for this customer.
                    </Typography>
                  ) : (
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead sx={{ bgcolor: 'action.hover' }}>
                          <TableRow>
                            <TableCell>Bill Code</TableCell>
                            <TableCell>Invoice Date</TableCell>
                            <TableCell align="right">Amount</TableCell>
                            <TableCell align="right">Outstanding</TableCell>
                            <TableCell align="center">Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {customer.bills.map((bill) => (
                            <TableRow key={bill._id}>
                              <TableCell sx={{ fontWeight: 600 }}>{bill.invoiceNumber}</TableCell>
                              <TableCell><DateDisplay date={bill.createdAt} /></TableCell>
                              <TableCell align="right">
                                <MoneyDisplay amount={bill.pricingSnapshot?.finalAmount} />
                              </TableCell>
                              <TableCell align="right">
                                <MoneyDisplay amount={bill.paymentSummary?.outstandingAmount} />
                              </TableCell>
                              <TableCell align="center">
                                <StatusChip status={bill.status} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              )}

              {/* Tab 1: Payments list */}
              {activeTab === 1 && (
                <Box>
                  {(!customer.payments || customer.payments.length === 0) ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center', fontStyle: 'italic' }}>
                      No receipts or collections logged for this customer.
                    </Typography>
                  ) : (
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead sx={{ bgcolor: 'action.hover' }}>
                          <TableRow>
                            <TableCell>Receipt ID</TableCell>
                            <TableCell>Payment Date</TableCell>
                            <TableCell>Method</TableCell>
                            <TableCell>Reference #</TableCell>
                            <TableCell align="right">Collected</TableCell>
                            <TableCell align="center">Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {customer.payments.map((p) => (
                            <TableRow key={p._id}>
                              <TableCell sx={{ fontWeight: 600, color: 'success.main' }}>{p.paymentId}</TableCell>
                              <TableCell><DateDisplay date={p.paymentDate} /></TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>{p.method}</TableCell>
                              <TableCell>{p.referenceNumber || '—'}</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 600 }}>
                                <MoneyDisplay amount={p.amount} />
                              </TableCell>
                              <TableCell align="center">
                                <StatusChip status={p.status} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              )}

              {/* Tab 2: Due Bills list */}
              {activeTab === 2 && (
                <Box>
                  {dueBills.length === 0 ? (
                    <Box sx={{ py: 3, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <SuccessIcon color="success" sx={{ fontSize: 32 }} />
                      <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                        All bills fully paid! No outstanding liabilities.
                      </Typography>
                    </Box>
                  ) : (
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead sx={{ bgcolor: 'action.hover' }}>
                          <TableRow>
                            <TableCell>Bill Code</TableCell>
                            <TableCell>Due Date</TableCell>
                            <TableCell align="right">Invoice Value</TableCell>
                            <TableCell align="right">Balance Due</TableCell>
                            <TableCell align="center">Action</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {dueBills.map((bill) => (
                            <TableRow key={bill._id}>
                              <TableCell sx={{ fontWeight: 600 }}>{bill.invoiceNumber}</TableCell>
                              <TableCell>
                                <DateDisplay date={bill.dueDate} />
                              </TableCell>
                              <TableCell align="right">
                                <MoneyDisplay amount={bill.pricingSnapshot?.finalAmount} />
                              </TableCell>
                              <TableCell align="right" sx={{ color: 'error.main', fontWeight: 700 }}>
                                <MoneyDisplay amount={bill.paymentSummary?.outstandingAmount} />
                              </TableCell>
                              <TableCell align="center">
                                <Button
                                  variant="contained"
                                  color="success"
                                  size="small"
                                  onClick={() => handleOpenCollectForInvoice(bill._id, bill.paymentSummary.outstandingAmount)}
                                >
                                  Collect
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Edit Demographics Dialog Form */}
      <Dialog open={editOpen} onClose={() => !updating && setEditOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSaveEdit}>
          <DialogTitle sx={{ fontWeight: 600 }}>Modify Demographic Information</DialogTitle>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Customer Name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={updating}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  disabled={updating}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Alternate Phone"
                  value={editAlternatePhone}
                  onChange={(e) => setEditAlternatePhone(e.target.value)}
                  disabled={updating}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Email Address"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  disabled={updating}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Demographic Address"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  disabled={updating}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  label="City"
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  disabled={updating}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  label="State"
                  value={editState}
                  onChange={(e) => setEditState(e.target.value)}
                  disabled={updating}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  label="Pincode"
                  value={editPincode}
                  onChange={(e) => setEditPincode(e.target.value)}
                  disabled={updating}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="GSTIN Code Identifier"
                  value={editGstin}
                  onChange={(e) => setEditGstin(e.target.value)}
                  disabled={updating}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Ledger Remarks / Notes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  disabled={updating}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setEditOpen(false)} color="inherit" disabled={updating}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="primary" disabled={updating}>
              {updating ? 'Updating...' : 'Save Demographics'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Collect Payment Dialog Form */}
      <Dialog open={collectOpen} onClose={() => !collecting && setCollectOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleCollectPaymentSubmit}>
          <DialogTitle sx={{ fontWeight: 600 }}>Collect & Log Payment Receipt</DialogTitle>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
            <TextField
              select
              fullWidth
              label="Select Outstanding Invoice"
              value={selectedBillId}
              onChange={(e) => {
                const billId = e.target.value;
                setSelectedBillId(billId);
                const billObj = customer.bills?.find((b) => b._id === billId);
                if (billObj) {
                  setCollectAmount(billObj.paymentSummary.outstandingAmount.toString());
                }
              }}
              disabled={collecting}
              required
            >
              {dueBills.map((bill) => (
                <MenuItem key={bill._id} value={bill._id}>
                  {bill.invoiceNumber} — Outstanding: ₹{bill.paymentSummary.outstandingAmount.toLocaleString('en-IN')}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              label="Collection Amount (₹)"
              type="number"
              value={collectAmount}
              onChange={(e) => setCollectAmount(e.target.value)}
              slotProps={{ htmlInput: { min: 0.01, step: 'any' } }}
              disabled={collecting}
              required
            />

            <TextField
              select
              fullWidth
              label="Payment Collection Method"
              value={collectMethod}
              onChange={(e) => setCollectMethod(e.target.value)}
              disabled={collecting}
              required
            >
              <MenuItem value="CASH">Cash</MenuItem>
              <MenuItem value="CARD">Debit / Credit Card</MenuItem>
              <MenuItem value="UPI">UPI Payment</MenuItem>
              <MenuItem value="BANK_TRANSFER">Bank Net-Transfer</MenuItem>
            </TextField>

            <TextField
              fullWidth
              label="Reference / Instrument Number"
              placeholder="e.g. Txn Ref, Cheque No"
              value={collectReference}
              onChange={(e) => setCollectReference(e.target.value)}
              disabled={collecting}
            />

            <TextField
              fullWidth
              multiline
              rows={2}
              label="Collection Notes"
              placeholder="e.g. Received net balance due"
              value={collectNotes}
              onChange={(e) => setCollectNotes(e.target.value)}
              disabled={collecting}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setCollectOpen(false)} color="inherit" disabled={collecting}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="success" disabled={collecting}>
              {collecting ? 'Processing...' : 'Record Payment'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default CustomerProfilePage;
