import { API_URL } from '../../config';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  Button,
  Box,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Checkbox,
  FormControlLabel,
  Typography,
  Grid,
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Cancel as CancelIcon,
  AssignmentReturn as ReturnIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import type { GridColDef } from '@mui/x-data-grid';
import {
  PageHeader,
  DataTable,
  StatusChip,
  SearchInput,
  FilterPanel,
  MoneyDisplay,
  DateDisplay,
} from '../../components/shared';
import { useSnackbar } from '../../context/SnackbarContext';
import { useAuth } from '../../context/AuthContext';

interface BillItemSnapshot {
  _id?: string;
  productId?: string;
  barcode?: string;
  sku?: string;
  productName: string;
  metal: string;
  purity: string;
  grossWeight: number;
  stoneWeight: number;
  otherWeight: number;
  finalAmount: number;
}

interface BillRow {
  id: string;
  _id: string;
  invoiceNumber: string;
  customerSnapshot?: {
    name: string;
    phone: string;
  };
  createdAt: string;
  pricingSnapshot: {
    finalAmount: number;
  };
  paymentSummary: {
    paidAmount: number;
    outstandingAmount: number;
  };
  status: string;
  itemsSnapshot: BillItemSnapshot[];
}

export const BillsPage: React.FC = () => {
  const navigate = useNavigate();
  const { token, hasPermission } = useAuth();
  const { showSuccess, showError } = useSnackbar();

  // Data States
  const [bills, setBills] = useState<BillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  // Cancel Dialog States
  const [cancelOpen, setCancelOpen] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Return Dialog States
  const [returnOpen, setReturnOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<BillRow | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [returnReason, setReturnReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('CASH');
  const [refundAmount, setRefundAmount] = useState(0);
  const [returning, setReturning] = useState(false);

  const canCancel = hasPermission('billing.cancel');
  const canEdit = hasPermission('billing.edit');

  const fetchBills = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_URL + '/bills', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load bills log');
      const data = await res.json();
      setBills(data);
    } catch (err: any) {
      showError(err.message || 'Error fetching bills');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchBills();
    }
  }, [token]);

  // Open Cancel dialog
  const handleOpenCancel = (id: string) => {
    setSelectedBillId(id);
    setCancelReason('');
    setCancelOpen(true);
  };

  // Submit Bill Cancel
  const handleCancelBillSubmit = async () => {
    if (!cancelReason.trim()) {
      showError('Cancellation reason is required');
      return;
    }
    setCancelling(true);
    try {
      const res = await fetch(`${API_URL}/bills/${selectedBillId}/cancel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Cancellation failed');
      }

      showSuccess('Invoice cancelled, stock restored, and payments voided');
      setCancelOpen(false);
      fetchBills();
    } catch (err: any) {
      showError(err.message || 'Error cancelling invoice');
    } finally {
      setCancelling(false);
    }
  };

  // Open Return Dialog
  const handleOpenReturn = (bill: BillRow) => {
    setSelectedBill(bill);
    setSelectedItemIds([]);
    setReturnReason('');
    setRefundMethod('CASH');
    setRefundAmount(0);
    setReturnOpen(true);
  };

  // Handle Return checkbox toggle
  const handleItemCheckboxToggle = (itemId: string) => {
    const isChecked = selectedItemIds.includes(itemId);
    const updated = isChecked
      ? selectedItemIds.filter((id) => id !== itemId)
      : [...selectedItemIds, itemId];

    setSelectedItemIds(updated);

    // Calculate maximum refund value based on checked item values
    if (selectedBill) {
      const selectedValue = selectedBill.itemsSnapshot
        .filter((item) => {
          const id = item._id || item.productId || '';
          return updated.includes(id);
        })
        .reduce((sum, item) => sum + item.finalAmount, 0);

      // Pre-fill refund amount to match returned value
      setRefundAmount(selectedValue);
    }
  };

  // Submit Returns
  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBill) return;

    if (selectedItemIds.length === 0) {
      showError('Please select at least one item to return');
      return;
    }

    if (!returnReason.trim()) {
      showError('Please enter a return reason');
      return;
    }

    const itemsToReturn = selectedBill.itemsSnapshot
      .filter((item) => {
        const id = item._id || item.productId || '';
        return selectedItemIds.includes(id);
      })
      .map((item) => ({
        inventoryItemId: item.productId, // references InventoryItem
        sku: item.sku,
        name: item.productName,
        weight: item.grossWeight,
        value: item.finalAmount,
      }));

    const payload = {
      items: itemsToReturn,
      reason: returnReason.trim(),
      refundMethod,
      refundAmount,
    };

    setReturning(true);
    try {
      const res = await fetch(`${API_URL}/bills/${selectedBill._id}/return`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to process return');
      }

      showSuccess('Return processed successfully, stock updated and refund logged');
      setReturnOpen(false);
      fetchBills();
    } catch (err: any) {
      showError(err.message || 'Error processing item return');
    } finally {
      setReturning(false);
    }
  };

  const columns: GridColDef<BillRow>[] = [
    { field: 'invoiceNumber', headerName: 'Invoice No.', width: 130, sortable: true },
    {
      field: 'customerName',
      headerName: 'Customer Name',
      width: 180,
      valueGetter: (_, row) => row.customerSnapshot?.name || 'Walk-in',
      renderCell: (params) => (
        <Box sx={{ py: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{params.row.customerSnapshot?.name || 'Walk-in'}</Typography>
          <Typography variant="caption" color="text.secondary">{params.row.customerSnapshot?.phone}</Typography>
        </Box>
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Invoice Date',
      width: 140,
      renderCell: (params) => <DateDisplay date={params.value as string} includeTime />,
    },
    {
      field: 'total',
      headerName: 'Total Value',
      width: 140,
      align: 'right',
      headerAlign: 'right',
      valueGetter: (_, row) => row.pricingSnapshot?.finalAmount || 0,
      renderCell: (params) => <MoneyDisplay amount={params.value as number} />,
    },
    {
      field: 'due',
      headerName: 'Outstanding Due',
      width: 140,
      align: 'right',
      headerAlign: 'right',
      valueGetter: (_, row) => row.paymentSummary?.outstandingAmount || 0,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 700, color: params.value > 0 ? 'error.main' : 'text.primary' }}>
          <MoneyDisplay amount={params.value as number} />
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => <StatusChip status={params.value as string} />,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 190,
      sortable: false,
      renderCell: (params) => {
        const bill = params.row;
        const cancelled = bill.status === 'CANCELLED';
        const returned = bill.status === 'RETURNED';

        return (
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', height: '100%' }}>
            <Tooltip title="Print / Preview">
              <IconButton size="small" color="secondary" onClick={() => navigate(`/bills/${bill._id}/preview`)}>
                <PrintIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {canEdit && !cancelled && !returned && (
              <Tooltip title="Edit Bill">
                <IconButton size="small" color="primary" onClick={() => navigate(`/bills/${bill._id}/edit`)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Revision History">
              <IconButton size="small" color="info" onClick={() => navigate(`/bills/${bill._id}/history`)}>
                <HistoryIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {!cancelled && !returned && (
              <Tooltip title="Process Return">
                <IconButton size="small" color="warning" onClick={() => handleOpenReturn(bill)}>
                  <ReturnIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {canCancel && !cancelled && (
              <Tooltip title="Cancel Bill">
                <IconButton size="small" color="error" onClick={() => handleOpenCancel(bill._id)}>
                  <CancelIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        );
      },
    },
  ];

  const filteredBills = bills.filter((bill) => {
    const matchesSearch =
      (bill.customerSnapshot?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      bill.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (bill.customerSnapshot?.phone || '').includes(searchQuery);

    const matchesStatus = statusFilter ? bill.status === statusFilter : true;

    return matchesSearch && matchesStatus;
  });

  const handleClearFilters = () => {
    setStatusFilter('');
    setSearchQuery('');
    setFilterOpen(false);
  };

  return (
    <Box>
      <PageHeader title="Bills History Log" subtitle="Audit all invoices, process returns, view revisions ledger and cancel invoices" />

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by invoice, customer name or phone..."
            />
            <Button
              startIcon={<FilterIcon />}
              variant="outlined"
              color="inherit"
              onClick={() => setFilterOpen(true)}
              sx={{ height: 40 }}
            >
              Filters
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
        <CardContent sx={{ p: 0 }}>
          <DataTable
            rows={filteredBills.map((b) => ({
              ...b,
              id: b._id || Math.random().toString(),
            }))}
            columns={columns}
            loading={loading}
            getRowHeight={() => 'auto'}
            emptyTitle="No Bills Found"
            emptyDescription="There are no invoice records matching the search criteria."
          />
        </CardContent>
      </Card>

      <FilterPanel
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onClear={handleClearFilters}
        onApply={() => setFilterOpen(false)}
      >
        <FormControl fullWidth size="small">
          <InputLabel id="status-filter-label">Filter by Status</InputLabel>
          <Select
            labelId="status-filter-label"
            value={statusFilter}
            label="Filter by Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="">All Statuses</MenuItem>
            <MenuItem value="PAID">Paid</MenuItem>
            <MenuItem value="PARTIALLY_PAID">Partially Paid</MenuItem>
            <MenuItem value="UNPAID">Unpaid</MenuItem>
            <MenuItem value="OVERDUE">Overdue</MenuItem>
            <MenuItem value="RETURNED">Returned</MenuItem>
            <MenuItem value="CANCELLED">Cancelled</MenuItem>
          </Select>
        </FormControl>
      </FilterPanel>

      {/* Cancellation Reason Dialog */}
      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Cancel Invoice?</DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Cancelling this bill is an irreversible operation. It will restore all sold items back to in-stock inventory and void all linked payment transactions.
          </Typography>
          <TextField
            fullWidth
            label="Cancellation Reason"
            placeholder="Explain why this invoice is cancelled..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            required
            error={cancelReason.trim() === ''}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCancelOpen(false)} color="inherit">Close</Button>
          <Button
            onClick={handleCancelBillSubmit}
            variant="contained"
            color="error"
            disabled={cancelReason.trim() === '' || cancelling}
          >
            Confirm Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Process Returns Modal */}
      <Dialog open={returnOpen} onClose={() => setReturnOpen(false)} maxWidth="sm" fullWidth>
        {selectedBill && (
          <form onSubmit={handleReturnSubmit}>
            <DialogTitle sx={{ fontWeight: 600 }}>Process Item Return: {selectedBill.invoiceNumber}</DialogTitle>
            <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Select the checkbox next to the items being returned. Reverted items will automatically transition back to inventory stock.
              </Typography>

              {/* Items List */}
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1.5 }}>
                {selectedBill.itemsSnapshot.map((item) => {
                  const itemId = item._id || item.productId || '';
                  const checked = selectedItemIds.includes(itemId);

                  return (
                    <Box key={itemId} sx={{ py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={checked}
                            onChange={() => handleItemCheckboxToggle(itemId)}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.productName}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Wt: {item.grossWeight}g | Purity: {item.purity}
                            </Typography>
                          </Box>
                        }
                      />
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        ₹{item.finalAmount.toLocaleString('en-IN')}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>

              <TextField
                fullWidth
                label="Return Reason"
                placeholder="Why is the customer returning these items?"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                required
              />

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    select
                    label="Refund Method"
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value)}
                  >
                    <MenuItem value="CASH">Cash Refund</MenuItem>
                    <MenuItem value="UPI">UPI Transfer</MenuItem>
                    <MenuItem value="CARD">Card Reverse</MenuItem>
                    <MenuItem value="BANK_TRANSFER">Bank transfer</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Refund Amount Paid Out"
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(Number(e.target.value) || 0)}
                    required
                    slotProps={{
                      input: {
                        startAdornment: <Typography sx={{ mr: 1, color: 'text.secondary' }}>₹</Typography>,
                      },
                    }}
                    helperText="Must be equal or less than value of returned items."
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setReturnOpen(false)} color="inherit">Close</Button>
              <Button
                type="submit"
                variant="contained"
                color="warning"
                disabled={selectedItemIds.length === 0 || returnReason.trim() === '' || returning}
              >
                Submit Return
              </Button>
            </DialogActions>
          </form>
        )}
      </Dialog>
    </Box>
  );
};

export default BillsPage;
