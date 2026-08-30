import { API_URL } from '../../config';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import {
  PageHeader,
  MoneyDisplay,
  DataTable,
  DateDisplay,
} from '../../components/shared';
import { useSnackbar } from '../../context/SnackbarContext';
import { useAuth } from '../../context/AuthContext';
import type { GridColDef } from '@mui/x-data-grid';

interface CustomerFinancials {
  totalPurchase: number;
  totalPaid: number;
  outstanding: number;
  overdue: number;
  lastPurchase?: string | null;
}

interface Customer {
  id: string;
  _id: string;
  customerCode: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  notes?: string;
  outstandingBalance: number;
  financials?: CustomerFinancials;
}

export const CustomersPage: React.FC = () => {
  const { token, hasPermission } = useAuth();
  const { showSuccess, showError } = useSnackbar();
  const navigate = useNavigate();

  // Directory Data States
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Register Customer Modal States
  const [registerOpen, setRegisterOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [gstin, setGstin] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const canCreate = hasPermission('billing.create');

  // Load customer directory (with search query)
  const fetchCustomers = async (query = '') => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/customers/search?query=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch customers directory');
      const data = await res.json();
      setCustomers(data);
    } catch (err: any) {
      showError(err.message || 'Error loading customers');
    } finally {
      setLoading(false);
    }
  };

  // Implement 400ms debounced server-side search input
  useEffect(() => {
    if (!token) return;
    const delayDebounceFn = setTimeout(() => {
      fetchCustomers(searchQuery);
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [token, searchQuery]);

  // Submit registration
  const handleSubmitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      showError('Customer Name and Phone number are required');
      return;
    }

    setSaving(true);
    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      pincode: pincode.trim() || undefined,
      gstin: gstin.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    try {
      const res = await fetch(API_URL + '/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Registration failed');
      }

      showSuccess('Customer registered successfully');
      setRegisterOpen(false);

      // Clear forms
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setCity('');
      setState('');
      setPincode('');
      setGstin('');
      setNotes('');

      // Refresh
      fetchCustomers(searchQuery);
    } catch (err: any) {
      showError(err.message || 'Error registering customer');
    } finally {
      setSaving(false);
    }
  };

  // DataTable columns definition
  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Customer',
      minWidth: 180,
      flex: 1,
      renderCell: (params) => (
        <Box sx={{ py: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {params.value}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.75rem' }}>
            {params.row.customerCode}
          </Typography>
        </Box>
      ),
    },
    { field: 'phone', headerName: 'Phone', minWidth: 120, flex: 0.6 },
    {
      field: 'totalPurchases',
      headerName: 'Total Purchases',
      minWidth: 130,
      flex: 0.7,
      align: 'right',
      headerAlign: 'right',
      valueGetter: (_, row) => row.financials?.totalPurchase || 0,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          <MoneyDisplay amount={Number(params.value) || 0} />
        </Typography>
      ),
    },
    {
      field: 'totalPaid',
      headerName: 'Paid',
      minWidth: 120,
      flex: 0.6,
      align: 'right',
      headerAlign: 'right',
      valueGetter: (_, row) => row.financials?.totalPaid || 0,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
          <MoneyDisplay amount={Number(params.value) || 0} />
        </Typography>
      ),
    },
    {
      field: 'outstanding',
      headerName: 'Outstanding',
      minWidth: 130,
      flex: 0.7,
      align: 'right',
      headerAlign: 'right',
      valueGetter: (_, row) => row.financials?.outstanding || 0,
      renderCell: (params) => {
        const amt = Number(params.value) || 0;
        return (
          <Typography variant="body2" sx={{ fontWeight: 700, color: amt > 0 ? 'error.main' : 'success.main' }}>
            <MoneyDisplay amount={amt} />
          </Typography>
        );
      },
    },
    {
      field: 'lastPurchase',
      headerName: 'Last Purchase',
      minWidth: 130,
      flex: 0.7,
      valueGetter: (_, row) => row.financials?.lastPurchase || null,
      renderCell: (params) => {
        if (!params.value) return <Typography variant="caption" color="text.secondary">Never</Typography>;
        return <DateDisplay date={params.value} />;
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      minWidth: 120,
      flex: 0.6,
      sortable: false,
      renderCell: (params) => {
        const id = params.row._id || params.row.id;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<PersonIcon />}
              onClick={() => navigate(`/customers/${id}`)}
            >
              Profile
            </Button>
          </Box>
        );
      },
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Customers Directory"
        subtitle="Manage client demographics, track historical billing purchases, and check outstanding accounts"
        action={
          canCreate ? (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => setRegisterOpen(true)}
            >
              Register Customer
            </Button>
          ) : undefined
        }
      />

      {/* Directory search input panel */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          label="Search customer ledger"
          placeholder="Filter by name, phone number, or customer code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </Box>

      {/* Directory Data Grid */}
      <Card sx={{ boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
        <CardContent sx={{ p: { xs: 1, sm: 2, md: 3 }, '&:last-child': { pb: { xs: 1, sm: 2, md: 3 } } }}>
          <DataTable
            rows={customers.map((c) => ({
              ...c,
              id: c._id || c.id || Math.random().toString(),
            }))}
            columns={columns}
            loading={loading}
            getRowHeight={() => 'auto'}
            emptyTitle="No Customers Found"
            emptyDescription="There are no demographic records matching this criteria."
          />
        </CardContent>
      </Card>

      {/* Demographics Registration Dialog */}
      <Dialog open={registerOpen} onClose={() => !saving && setRegisterOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmitRegister}>
          <DialogTitle sx={{ fontWeight: 600 }}>Register Client Demographics</DialogTitle>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Customer Name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={saving}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  placeholder="10-digit mobile"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={saving}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Email Address"
                  placeholder="john.doe@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={saving}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="GSTIN ID"
                  placeholder="e.g. 27AAAAA1111A1Z1"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  disabled={saving}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Demographic Address"
                  placeholder="Flat, Street, Building details"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={saving}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  label="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={saving}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  label="State"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  disabled={saving}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  label="Pincode"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  disabled={saving}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Ledger Remarks / Notes"
                  value={notes}
                  placeholder="Provide any client specifics (sizing, preferences)..."
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={saving}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setRegisterOpen(false)} color="inherit" disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="primary" disabled={saving}>
              {saving ? 'Registering...' : 'Register Customer'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default CustomersPage;
