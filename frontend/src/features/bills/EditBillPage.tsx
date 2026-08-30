import { API_URL } from '../../config';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  TextField,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { PageHeader, MoneyDisplay, StatusChip } from '../../components/shared';
import { useSnackbar } from '../../context/SnackbarContext';
import { useAuth } from '../../context/AuthContext';
import {
  calculateInvoiceItem,
  calculateInvoiceSummary,
} from '../../services/billing/calculation/calculation.engine';

interface InvoiceItem {
  id: string;
  productName: string;
  sku?: string;
  barcode?: string;
  productId?: string;
  metal: 'GOLD' | 'SILVER' | 'PLATINUM' | 'OTHER';
  purity: string;
  grossWeight: number;
  stoneWeight: number;
  otherWeight: number;
  netWeight?: number;
  metalRate: number;
  makingChargeType: 'PERCENTAGE' | 'PER_GRAM' | 'FIXED';
  makingChargeRate: number;
  wastageType: 'PERCENTAGE' | 'WEIGHT' | 'FIXED' | 'NONE';
  wastageRate: number;
  stoneChargeType?: 'FIXED' | 'PER_CARAT' | 'PER_PIECE';
  stoneRate?: number;
  stonePieces?: number;
  stoneWeightCarats?: number;
  otherCharge?: number;
  discountType?: 'PERCENTAGE' | 'FIXED';
  discountRate?: number;
  finalAmount?: number;
}

export const EditBillPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { showSuccess, showError } = useSnackbar();

  // Page States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [billStatus, setBillStatus] = useState('');

  // Form inputs
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [isInterState, setIsInterState] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [editReason, setEditReason] = useState('');

  // Read-only metrics (payments history snapshot)
  const [historicalPaid, setHistoricalPaid] = useState(0);
  const [paymentsHistory, setPaymentsHistory] = useState<any[]>([]);

  // Dialog modal for saving confirm
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Fetch bill data
  useEffect(() => {
    const fetchBill = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/bills/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Invoice not found');
        const data = await res.json();

        setInvoiceNumber(data.invoiceNumber);
        setCustomerName(data.customerSnapshot?.name || 'Walk-in');
        setCustomerPhone(data.customerSnapshot?.phone || '');
        setBillStatus(data.status);
        setIsInterState(data.pricingSnapshot?.igst > 0);
        setNotes(data.notes || '');
        setHistoricalPaid(data.paymentSummary?.paidAmount || 0);

        // Prepopulate dueDate (slice to date string)
        if (data.dueDate) {
          setDueDate(new Date(data.dueDate).toISOString().slice(0, 10));
        }

        // Map itemsSnapshot to InvoiceItem state structure
        const mappedItems = (data.itemsSnapshot || []).map((item: any, idx: number) => ({
          ...item,
          id: item._id || idx.toString(),
          metal: item.metal || 'GOLD',
          makingChargeType: item.makingChargeType || 'FIXED',
          wastageType: item.wastageType || 'NONE',
        }));
        setItems(mappedItems);

        // Fetch payments timeline history
        const payRes = await fetch(`${API_URL}/payments/history/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (payRes.ok) {
          const payData = await payRes.json();
          setPaymentsHistory(payData.filter((p: any) => p.status === 'SUCCESS'));
        }
      } catch (err: any) {
        showError(err.message || 'Error loading invoice');
        navigate('/bills');
      } finally {
        setLoading(false);
      }
    };

    if (id && token) {
      fetchBill();
    }
  }, [id, token]);

  // Handle item rows manipulation
  const handleAddItem = () => {
    const newItem: InvoiceItem = {
      id: Math.random().toString(),
      productName: '',
      metal: 'GOLD',
      purity: '22K',
      grossWeight: 0,
      stoneWeight: 0,
      otherWeight: 0,
      metalRate: 7000,
      makingChargeType: 'FIXED',
      makingChargeRate: 0,
      wastageType: 'NONE',
      wastageRate: 0,
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setItems(updated);
  };

  // Live summary computations
  const getCalculatedItems = () => {
    return items.map((item) => {
      const calcInput = {
        metal: item.metal,
        purity: item.purity,
        grossWeight: Number(item.grossWeight) || 0,
        stoneWeight: Number(item.stoneWeight) || 0,
        otherWeight: Number(item.otherWeight) || 0,
        metalRate: Number(item.metalRate) || 0,
        makingChargeType: item.makingChargeType,
        makingChargeRate: Number(item.makingChargeRate) || 0,
        wastageType: item.wastageType,
        wastageRate: Number(item.wastageRate) || 0,
        stoneChargeType: item.stoneChargeType,
        stoneRate: Number(item.stoneRate) || 0,
        stonePieces: Number(item.stonePieces) || 0,
        stoneWeightCarats: Number(item.stoneWeightCarats) || 0,
        otherCharge: Number(item.otherCharge) || 0,
        discountType: item.discountType,
        discountRate: Number(item.discountRate) || 0,
      };
      const result = calculateInvoiceItem(calcInput, isInterState);
      return {
        ...item,
        netWeight: result.netWeight,
        finalAmount: result.finalAmount,
      };
    });
  };

  const calculatedItemsList = getCalculatedItems();

  const inputForSummary = calculatedItemsList.map((item) => ({
    metal: item.metal,
    purity: item.purity,
    grossWeight: Number(item.grossWeight) || 0,
    stoneWeight: Number(item.stoneWeight) || 0,
    otherWeight: Number(item.otherWeight) || 0,
    metalRate: Number(item.metalRate) || 0,
    makingChargeType: item.makingChargeType,
    makingChargeRate: Number(item.makingChargeRate) || 0,
    wastageType: item.wastageType,
    wastageRate: Number(item.wastageRate) || 0,
    stoneChargeType: item.stoneChargeType as any,
    stoneRate: item.stoneRate || 0,
    stonePieces: item.stonePieces || 0,
    stoneWeightCarats: item.stoneWeightCarats || 0,
    otherCharge: item.otherCharge || 0,
    discountType: 'FIXED' as const,
    discountRate: (Number(item.grossWeight) || 0) * (Number(item.metalRate) || 0) - (item.finalAmount || 0) > 0 ? 0 : 0, // placeholder
  }));

  // Re-calculate invoice summary on-the-fly
  const invoiceSummary = calculateInvoiceSummary({
    items: items.map((item) => {
      const calcResult = calculateInvoiceItem(
        {
          metal: item.metal,
          purity: item.purity,
          grossWeight: Number(item.grossWeight) || 0,
          stoneWeight: Number(item.stoneWeight) || 0,
          otherWeight: Number(item.otherWeight) || 0,
          metalRate: Number(item.metalRate) || 0,
          makingChargeType: item.makingChargeType,
          makingChargeRate: Number(item.makingChargeRate) || 0,
          wastageType: item.wastageType,
          wastageRate: Number(item.wastageRate) || 0,
          stoneChargeType: item.stoneChargeType as any,
          stoneRate: Number(item.stoneRate) || 0,
          stonePieces: Number(item.stonePieces) || 0,
          stoneWeightCarats: Number(item.stoneWeightCarats) || 0,
          otherCharge: Number(item.otherCharge) || 0,
          discountType: item.discountType as any,
          discountRate: Number(item.discountRate) || 0,
        },
        isInterState
      );
      return {
        metal: item.metal,
        purity: item.purity,
        grossWeight: Number(item.grossWeight) || 0,
        stoneWeight: Number(item.stoneWeight) || 0,
        otherWeight: Number(item.otherWeight) || 0,
        metalRate: Number(item.metalRate) || 0,
        makingChargeType: 'FIXED' as const,
        makingChargeRate: calcResult.makingChargeAmount,
        wastageType: 'NONE' as const,
        wastageRate: 0,
        stoneChargeType: 'FIXED' as const,
        stoneRate: calcResult.stoneCharge,
        stonePieces: 0,
        stoneWeightCarats: 0,
        otherCharge: calcResult.otherCharge,
        discountType: 'FIXED' as const,
        discountRate: calcResult.discountAmount,
      };
    }),
    isInterState,
  });

  const newOutstanding = Math.max(0, invoiceSummary.finalAmount - historicalPaid);

  // Submit Save
  const handleSaveInvoice = async () => {
    if (!editReason.trim()) {
      showError('Please specify the reason for editing this invoice');
      return;
    }

    setSaving(true);
    setConfirmOpen(false);

    const payload = {
      items: items.map((item) => ({
        productId: item.productId,
        barcode: item.barcode,
        productName: item.productName,
        sku: item.sku,
        metal: item.metal,
        purity: item.purity,
        grossWeight: Number(item.grossWeight),
        stoneWeight: Number(item.stoneWeight) || 0,
        otherWeight: Number(item.otherWeight) || 0,
        metalRate: Number(item.metalRate),
        makingChargeType: item.makingChargeType,
        makingChargeRate: Number(item.makingChargeRate) || 0,
        wastageType: item.wastageType,
        wastageRate: Number(item.wastageRate) || 0,
        stoneChargeType: item.stoneChargeType || undefined,
        stoneRate: Number(item.stoneRate) || 0,
        stonePieces: Number(item.stonePieces) || 0,
        stoneWeightCarats: Number(item.stoneWeightCarats) || 0,
        otherCharge: Number(item.otherCharge) || 0,
        discountType: item.discountType || undefined,
        discountRate: Number(item.discountRate) || 0,
      })),
      isInterState,
      dueDate: new Date(dueDate).toISOString(),
      notes: notes.trim() || undefined,
      editReason: editReason.trim(),
    };

    try {
      const res = await fetch(`${API_URL}/bills/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Invoice save failed');
      }

      showSuccess('Invoice successfully revised and saved');
      navigate(`/bills/${id}/preview`);
    } catch (err: any) {
      showError(err.message || 'Error updating invoice');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/bills')}>
          <ArrowBackIcon />
        </IconButton>
        <PageHeader title={`Edit Invoice: ${invoiceNumber}`} subtitle={`Customer: ${customerName} | Status: ${billStatus}`} />
      </Box>

      <Grid container spacing={3}>
        {/* Left Side: Items Editor Form */}
        <Grid size={{ xs: 12, md: 8.5 }}>
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Line Items</Typography>
                <Button startIcon={<AddIcon />} variant="outlined" size="small" onClick={handleAddItem}>
                  Add Line
                </Button>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {items.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                  No items on this invoice. Click 'Add Line' to insert an item.
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {items.map((item, index) => (
                    <Box key={item.id} sx={{ p: 2.5, bgcolor: 'action.hover', borderRadius: 1.5, position: 'relative' }}>
                      <IconButton
                        sx={{ position: 'absolute', right: 8, top: 8 }}
                        color="error"
                        size="small"
                        onClick={() => handleRemoveItem(index)}
                        disabled={items.length === 1}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>

                      <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700, mb: 2, display: 'block' }}>
                        ITEM #{index + 1}
                      </Typography>

                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Product Name"
                            value={item.productName}
                            onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                            required
                          />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 2 }}>
                          <TextField
                            fullWidth
                            size="small"
                            select
                            label="Metal"
                            value={item.metal}
                            onChange={(e) => handleItemChange(index, 'metal', e.target.value)}
                          >
                            <MenuItem value="GOLD">Gold</MenuItem>
                            <MenuItem value="SILVER">Silver</MenuItem>
                            <MenuItem value="PLATINUM">Platinum</MenuItem>
                            <MenuItem value="OTHER">Other</MenuItem>
                          </TextField>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 2 }}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Purity"
                            value={item.purity}
                            onChange={(e) => handleItemChange(index, 'purity', e.target.value)}
                            required
                          />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 2 }}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Barcode (Optional)"
                            value={item.barcode || ''}
                            onChange={(e) => handleItemChange(index, 'barcode', e.target.value)}
                          />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 2 }}>
                          <TextField
                            fullWidth
                            size="small"
                            label="SKU (Optional)"
                            value={item.sku || ''}
                            onChange={(e) => handleItemChange(index, 'sku', e.target.value)}
                          />
                        </Grid>

                        <Grid size={{ xs: 6, sm: 3 }}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Gross Weight (g)"
                            type="number"
                            value={item.grossWeight || ''}
                            onChange={(e) => handleItemChange(index, 'grossWeight', Number(e.target.value) || 0)}
                            required
                          />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Stone Wt (g)"
                            type="number"
                            value={item.stoneWeight || ''}
                            onChange={(e) => handleItemChange(index, 'stoneWeight', Number(e.target.value) || 0)}
                          />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Other Wt (g)"
                            type="number"
                            value={item.otherWeight || ''}
                            onChange={(e) => handleItemChange(index, 'otherWeight', Number(e.target.value) || 0)}
                          />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Metal Rate (₹)"
                            type="number"
                            value={item.metalRate || ''}
                            onChange={(e) => handleItemChange(index, 'metalRate', Number(e.target.value) || 0)}
                            required
                          />
                        </Grid>

                        <Grid size={{ xs: 6, sm: 3 }}>
                          <TextField
                            fullWidth
                            size="small"
                            select
                            label="Making Type"
                            value={item.makingChargeType}
                            onChange={(e) => handleItemChange(index, 'makingChargeType', e.target.value)}
                          >
                            <MenuItem value="FIXED">Fixed (₹)</MenuItem>
                            <MenuItem value="PER_GRAM">Per Gram (₹)</MenuItem>
                            <MenuItem value="PERCENTAGE">Percentage (%)</MenuItem>
                          </TextField>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Making Rate"
                            type="number"
                            value={item.makingChargeRate || ''}
                            onChange={(e) => handleItemChange(index, 'makingChargeRate', Number(e.target.value) || 0)}
                          />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                          <TextField
                            fullWidth
                            size="small"
                            select
                            label="Wastage Type"
                            value={item.wastageType}
                            onChange={(e) => handleItemChange(index, 'wastageType', e.target.value)}
                          >
                            <MenuItem value="NONE">None</MenuItem>
                            <MenuItem value="PERCENTAGE">Percentage (%)</MenuItem>
                            <MenuItem value="WEIGHT">Weight (g)</MenuItem>
                            <MenuItem value="FIXED">Fixed (₹)</MenuItem>
                          </TextField>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Wastage Rate"
                            type="number"
                            value={item.wastageRate || ''}
                            onChange={(e) => handleItemChange(index, 'wastageRate', Number(e.target.value) || 0)}
                            disabled={item.wastageType === 'NONE'}
                          />
                        </Grid>

                        {/* Optional Stone / Discount Fields */}
                        <Grid size={{ xs: 6, sm: 3 }}>
                          <TextField
                            fullWidth
                            size="small"
                            select
                            label="Stone Charge Type"
                            value={item.stoneChargeType || ''}
                            onChange={(e) => handleItemChange(index, 'stoneChargeType', e.target.value || undefined)}
                          >
                            <MenuItem value="">None</MenuItem>
                            <MenuItem value="FIXED">Fixed Amount</MenuItem>
                            <MenuItem value="PER_CARAT">Per Carat</MenuItem>
                            <MenuItem value="PER_PIECE">Per Piece</MenuItem>
                          </TextField>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Stone Rate"
                            type="number"
                            value={item.stoneRate || ''}
                            onChange={(e) => handleItemChange(index, 'stoneRate', Number(e.target.value) || 0)}
                            disabled={!item.stoneChargeType}
                          />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                          <TextField
                            fullWidth
                            size="small"
                            select
                            label="Discount Type"
                            value={item.discountType || ''}
                            onChange={(e) => handleItemChange(index, 'discountType', e.target.value || undefined)}
                          >
                            <MenuItem value="">None</MenuItem>
                            <MenuItem value="PERCENTAGE">Percentage (%)</MenuItem>
                            <MenuItem value="FIXED">Fixed Deduct (₹)</MenuItem>
                          </TextField>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Discount Rate"
                            type="number"
                            value={item.discountRate || ''}
                            onChange={(e) => handleItemChange(index, 'discountRate', Number(e.target.value) || 0)}
                            disabled={!item.discountType}
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Historical Payments Display */}
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Preserved Payment History</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Payments already cleared cannot be edited here to maintain immutable financial records.
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {paymentsHistory.length === 0 ? (
                <Typography color="text.secondary" sx={{ fontStyle: 'italic', py: 1 }}>
                  No payment transactions have been logged.
                </Typography>
              ) : (
                <List>
                  {paymentsHistory.map((p) => (
                    <ListItem key={p.paymentId} sx={{ px: 0 }}>
                      <ListItemText
                        primary={<Typography variant="subtitle2" sx={{ fontWeight: 600 }}>₹{p.amount.toLocaleString('en-IN')} — {p.method}</Typography>}
                        secondary={<Typography variant="caption" color="text.secondary">ID: {p.paymentId} | Date: {new Date(p.paymentDate).toLocaleDateString('en-IN')}</Typography>}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right Side: Sticky Recalculations summary */}
        <Grid size={{ xs: 12, md: 3.5 }}>
          <Card sx={{ position: 'sticky', top: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Pricing Recalculations</Typography>
              <Divider sx={{ mb: 2.5 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Interstate switch */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Inter-State GST?</Typography>
                  <Button
                    size="small"
                    variant={isInterState ? 'contained' : 'outlined'}
                    onClick={() => setIsInterState(!isInterState)}
                  >
                    {isInterState ? 'IGST 3%' : 'CGST/SGST'}
                  </Button>
                </Box>

                <TextField
                  fullWidth
                  label="Due Date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  required
                />

                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Invoice Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />

                <Divider sx={{ my: 1 }} />

                {/* Subtotals */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Subtotal:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    <MoneyDisplay amount={invoiceSummary.subtotal} />
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">GST Tax (3%):</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    <MoneyDisplay amount={invoiceSummary.taxAmount} />
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, bgcolor: 'action.hover', borderRadius: 0.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>New Total:</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    <MoneyDisplay amount={invoiceSummary.finalAmount} />
                  </Typography>
                </Box>

                <Divider sx={{ my: 0.5 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Historical Paid:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                    <MoneyDisplay amount={historicalPaid} />
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, bgcolor: 'error.light', color: 'error.contrastText', borderRadius: 0.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>New Due Balance:</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    <MoneyDisplay amount={newOutstanding} />
                  </Typography>
                </Box>

                {/* Edit reason input */}
                <TextField
                  fullWidth
                  label="Reason for Editing"
                  placeholder="Explain why this invoice is revised..."
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  required
                  error={editReason.trim() === ''}
                  helperText="Required to record revision version history."
                  sx={{ mt: 1 }}
                />

                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  disabled={items.length === 0 || editReason.trim() === '' || saving}
                  onClick={() => setConfirmOpen(true)}
                  sx={{ mt: 1, py: 1.25 }}
                >
                  Save Revision
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 600 }}>Save Invoice Changes?</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2 }}>
            You are about to save changes and generate a new version revision for this invoice. Historical payments will be preserved, and the outstanding balance will be adjusted to **₹{newOutstanding.toLocaleString('en-IN')}**.
          </Typography>
          <Typography variant="body2" sx={{ fontStyle: 'italic', fontWeight: 600 }}>
            Reason: {editReason}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleSaveInvoice} variant="contained" color="primary" disabled={saving}>
            Confirm & Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EditBillPage;
