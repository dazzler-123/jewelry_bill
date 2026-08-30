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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import {
  PageHeader,
  MoneyDisplay,
  DateDisplay,
  DataTable,
  ConfirmDialog,
} from '../../components/shared';
import { useSnackbar } from '../../context/SnackbarContext';
import { useAuth } from '../../context/AuthContext';
import type { GridColDef } from '@mui/x-data-grid';

interface MetalRate {
  id: string;
  _id?: string;
  metalType: string;
  purity: string;
  ratePerGram: number;
  effectiveDate: string;
  updatedBy?: {
    name: string;
    email: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export const MetalRatesPage: React.FC = () => {
  const { token, hasPermission } = useAuth();
  const { showSuccess, showError } = useSnackbar();

  // State Management
  const [currentRates, setCurrentRates] = useState<MetalRate[]>([]);
  const [historyRates, setHistoryRates] = useState<MetalRate[]>([]);
  const [loadingCurrent, setLoadingCurrent] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Dialog States
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<MetalRate | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingRateId, setDeletingRateId] = useState<string | null>(null);

  // Form State
  const [metalType, setMetalType] = useState('GOLD');
  const [purity, setPurity] = useState('22K');
  const [customPurity, setCustomPurity] = useState('');
  const [ratePerGram, setRatePerGram] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');

  const canEdit = hasPermission('metalRate.edit');

  // Fetch live current and historical rates
  const fetchData = async () => {
    setLoadingCurrent(true);
    setLoadingHistory(true);
    try {
      // 1. Fetch current active rates
      const currentRes = await fetch(API_URL + '/metal-rates/current', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!currentRes.ok) throw new Error('Failed to fetch current active rates');
      const currentData = await currentRes.json();
      setCurrentRates(currentData);
    } catch (err: any) {
      showError(err.message || 'Error fetching active rates');
    } finally {
      setLoadingCurrent(false);
    }

    try {
      // 2. Fetch history rates
      const historyRes = await fetch(API_URL + '/metal-rates/history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!historyRes.ok) throw new Error('Failed to fetch historical rates');
      const historyData = await historyRes.json();
      setHistoryRates(historyData);
    } catch (err: any) {
      showError(err.message || 'Error fetching historical rates');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Handle Form Purity change helpers
  const getPurityOptions = (metal: string) => {
    switch (metal) {
      case 'GOLD':
        return ['24K', '22K', '20K', '18K', '14K', 'CUSTOM'];
      case 'SILVER':
        return ['999', 'Sterling 925', 'CUSTOM'];
      case 'PLATINUM':
        return ['950', '990', 'CUSTOM'];
      default:
        return ['CUSTOM'];
    }
  };

  // Open Dialog for Create
  const handleOpenCreate = () => {
    setEditingRate(null);
    setMetalType('GOLD');
    setPurity('22K');
    setCustomPurity('');
    setRatePerGram('');
    
    // Default effective date to local timezone datetime-local input string
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setEffectiveDate(now.toISOString().slice(0, 16));
    
    setDialogOpen(true);
  };

  // Open Dialog for Edit
  const handleOpenEdit = (rate: MetalRate) => {
    setEditingRate(rate);
    setMetalType(rate.metalType);
    
    const standardPurities = getPurityOptions(rate.metalType);
    if (standardPurities.includes(rate.purity)) {
      setPurity(rate.purity);
      setCustomPurity('');
    } else {
      setPurity('CUSTOM');
      setCustomPurity(rate.purity);
    }
    
    setRatePerGram(rate.ratePerGram.toString());
    
    const d = new Date(rate.effectiveDate);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    setEffectiveDate(d.toISOString().slice(0, 16));
    
    setDialogOpen(true);
  };

  // Open Confirm Dialog for Delete
  const handleOpenDelete = (id: string) => {
    setDeletingRateId(id);
    setConfirmOpen(true);
  };

  // Submit form (Create / Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ratePerGram || isNaN(Number(ratePerGram)) || Number(ratePerGram) < 0) {
      showError('Please enter a valid positive rate per gram');
      return;
    }

    const finalPurity = purity === 'CUSTOM' ? customPurity.trim() : purity;
    if (!finalPurity) {
      showError('Purity configuration is required');
      return;
    }

    const payload = {
      metalType,
      purity: finalPurity,
      ratePerGram: Number(ratePerGram),
      effectiveDate: new Date(effectiveDate).toISOString(),
    };

    try {
      let res;
      if (editingRate) {
        // Update
        res = await fetch(`${API_URL}/metal-rates/${editingRate.id || editingRate._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ratePerGram: payload.ratePerGram,
            effectiveDate: payload.effectiveDate,
          }),
        });
      } else {
        // Create
        res = await fetch(API_URL + '/metal-rates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Operation failed');
      }

      showSuccess(editingRate ? 'Metal rate updated successfully' : 'New metal rate scheduled successfully');
      setDialogOpen(false);
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Error saving metal rate');
    }
  };

  // Delete rate
  const handleDelete = async () => {
    if (!deletingRateId) return;

    try {
      const res = await fetch(`${API_URL}/metal-rates/${deletingRateId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to delete');
      }

      showSuccess('Metal rate entry deleted successfully');
      setConfirmOpen(false);
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Error deleting metal rate');
    }
  };

  // Datagrid Columns
  const columns: GridColDef[] = [
    {
      field: 'metalType',
      headerName: 'Metal Type',
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {params.value}
        </Typography>
      ),
    },
    { field: 'purity', headerName: 'Purity / Standard', width: 180 },
    {
      field: 'ratePerGram',
      headerName: 'Rate per Gram',
      width: 180,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          <MoneyDisplay amount={params.value} decimals={params.row.metalType === 'SILVER' ? 2 : 0} />
        </Typography>
      ),
    },
    {
      field: 'effectiveDate',
      headerName: 'Effective From',
      width: 230,
      renderCell: (params) => {
        const date = params.value;
        const isFuture = new Date(date).getTime() > Date.now();
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DateDisplay date={date} includeTime />
            {isFuture && (
              <Typography
                variant="caption"
                sx={{
                  bgcolor: 'info.light',
                  color: 'info.contrastText',
                  px: 1,
                  py: 0.25,
                  borderRadius: 0.75,
                  fontWeight: 600,
                  fontSize: '0.7rem',
                }}
              >
                Scheduled
              </Typography>
            )}
          </Box>
        );
      },
    },
    {
      field: 'updatedBy',
      headerName: 'Updated By',
      width: 200,
      valueGetter: (value) => value?.name || 'System',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params) => {
        const isPast = new Date(params.row.effectiveDate).getTime() <= Date.now();
        return (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {canEdit && (
              <Tooltip title={isPast ? "Edit Rate" : "Edit Details"}>
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => handleOpenEdit(params.row as MetalRate)}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {canEdit && (
              <Tooltip title="Delete Rate">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleOpenDelete(params.row.id || params.row._id)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        );
      },
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Metal Rate Management"
        subtitle="Manage live spot pricing and future scheduling of gold, silver, and other precious metals"
        action={
          canEdit ? (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleOpenCreate}
            >
              Schedule New Rate
            </Button>
          ) : undefined
        }
      />

      {/* Current Active Spot Rates Grid */}
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <TrendingUpIcon color="primary" /> Live Spot Rates (Current Active)
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {loadingCurrent ? (
          [1, 2, 3, 4].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body2" color="text.secondary">Loading rate...</Typography>
              </Card>
            </Grid>
          ))
        ) : currentRates.length === 0 ? (
          <Grid size={{ xs: 12 }}>
            <Card sx={{ p: 4, textAlign: 'center', bgcolor: 'rgba(0, 0, 0, 0.02)' }}>
              <Typography variant="subtitle1" color="text.secondary">
                No active metal rates configured in system. Please schedule rates.
              </Typography>
            </Card>
          </Grid>
        ) : (
          currentRates.map((rate) => (
            <Grid key={rate.id || rate._id} size={{ xs: 12, sm: 6, md: 3 }}>
              <Card
                sx={{
                  borderTop: '4px solid',
                  borderColor:
                    rate.metalType === 'GOLD'
                      ? '#D4AF37'
                      : rate.metalType === 'SILVER'
                      ? '#C0C0C0'
                      : rate.metalType === 'PLATINUM'
                      ? '#E5E4E2'
                      : 'primary.main',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                  transition: 'all 0.3s ease',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 30px rgba(0,0,0,0.1)' },
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: 'text.secondary',
                        letterSpacing: 1,
                      }}
                    >
                      {rate.metalType}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        px: 1.25,
                        py: 0.25,
                        borderRadius: 1,
                        bgcolor: 'action.hover',
                        color: 'text.primary',
                        fontSize: '0.75rem',
                      }}
                    >
                      {rate.purity}
                    </Typography>
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                    <MoneyDisplay amount={rate.ratePerGram} decimals={rate.metalType === 'SILVER' ? 2 : 0} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.8rem', ml: 0.5 }}>
                      / gram
                    </Typography>
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Active since: <DateDisplay date={rate.effectiveDate} includeTime />
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      {/* History and Scheduler Table */}
      <Card sx={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <HistoryIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Rate History & Future Schedules
            </Typography>
          </Box>

          <DataTable
            rows={historyRates.map((r) => ({
              ...r,
              id: r.id || r._id || Math.random().toString(),
            }))}
            columns={columns}
            loading={loadingHistory}
            emptyTitle="No metal rates found"
            emptyDescription="There are no historical or scheduled rates in the system. Use 'Schedule New Rate' to add one."
          />
        </CardContent>
      </Card>

      {/* Scheduling & Modification Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: 600 }}>
            {editingRate ? 'Edit Metal Rate' : 'Schedule New Metal Rate'}
          </DialogTitle>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  select
                  label="Metal Type"
                  value={metalType}
                  disabled={!!editingRate} // Cannot edit metal type of existing entry
                  onChange={(e) => {
                    setMetalType(e.target.value);
                    setPurity(getPurityOptions(e.target.value)[0]);
                    setCustomPurity('');
                  }}
                >
                  <MenuItem value="GOLD">Gold</MenuItem>
                  <MenuItem value="SILVER">Silver</MenuItem>
                  <MenuItem value="PLATINUM">Platinum</MenuItem>
                  <MenuItem value="OTHER">Other</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  select
                  label="Purity Standard"
                  value={purity}
                  disabled={!!editingRate} // Cannot edit purity of existing entry
                  onChange={(e) => {
                    setPurity(e.target.value);
                    if (e.target.value !== 'CUSTOM') {
                      setCustomPurity('');
                    }
                  }}
                >
                  {getPurityOptions(metalType).map((p) => (
                    <MenuItem key={p} value={p}>
                      {p === 'CUSTOM' ? 'Custom Purity...' : p}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            {purity === 'CUSTOM' && (
              <TextField
                fullWidth
                label="Custom Purity Name"
                placeholder="e.g. 20K, 92.5%, Rose Gold Purity"
                disabled={!!editingRate}
                value={customPurity}
                onChange={(e) => setCustomPurity(e.target.value)}
                required
              />
            )}

            <TextField
              fullWidth
              label="Rate per Gram (INR)"
              type="number"
              slotProps={{ htmlInput: { min: 0, step: 'any' } }}
              value={ratePerGram}
              onChange={(e) => setRatePerGram(e.target.value)}
              required
              placeholder="e.g. 7500"
            />

            <TextField
              fullWidth
              label="Effective Date & Time"
              type="datetime-local"
              slotProps={{ htmlInput: { step: 60 } }} // increments by minutes
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              required
              helperText={
                editingRate && new Date(editingRate.effectiveDate).getTime() <= Date.now()
                  ? "Note: This rate is already active. Effective date cannot be modified."
                  : "Specify when this price rate becomes active for invoice billing."
              }
              disabled={!!editingRate && new Date(editingRate.effectiveDate).getTime() <= Date.now()}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setDialogOpen(false)} color="inherit">
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="primary">
              {editingRate ? 'Update Rate' : 'Schedule Rate'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Metal Rate Entry"
        content="Are you sure you want to permanently delete this metal rate configuration? Past invoices using this snapshot rate will not be affected, but calculations going forward will use other matching active rates."
        confirmText="Confirm Delete"
        color="error"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </Box>
  );
};

export default MetalRatesPage;
