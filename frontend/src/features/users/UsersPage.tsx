import { API_URL } from '../../config';
import React, { useEffect, useState } from 'react';
import { Card, CardContent, Button, Box, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from '../../context/SnackbarContext';
import { PageHeader, DataTable, DateDisplay } from '../../components/shared';
import type { GridColDef } from '@mui/x-data-grid';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export const UsersPage: React.FC = () => {
  const { token, hasPermission } = useAuth();
  const { showSuccess, showError } = useSnackbar();
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog State for adding a new user
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('CASHIER');
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_URL + '/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch users list');
      const data = await res.json();
      setUsers(data.map((u: any) => ({
        id: u.id || u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
      })));
    } catch (err: any) {
      showError(err.message || 'Error fetching user accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      void fetchUsers();
    }
  }, [token]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail || !newPassword) {
      showError('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(API_URL + '/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          password: newPassword,
          role: newRole,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create user');
      }

      showSuccess('Operator account registered successfully!');
      setOpen(false);
      // Reset Form
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('CASHIER');
      void fetchUsers();
    } catch (err: any) {
      showError(err.message || 'Error creating operator account');
    } finally {
      setSaving(false);
    }
  };

  const columns: GridColDef<UserRow>[] = [
    { field: 'name', headerName: 'Full Name', width: 220, sortable: true },
    { field: 'email', headerName: 'Email Address', width: 250, sortable: true },
    { field: 'role', headerName: 'Role Designation', width: 160, sortable: true },
    {
      field: 'isActive',
      headerName: 'Status',
      width: 140,
      renderCell: (params) => (
        <Box
          sx={{
            display: 'inline-flex',
            px: 1.5,
            py: 0.25,
            borderRadius: 1,
            fontSize: '0.75rem',
            fontWeight: 600,
            bgcolor: params.value ? 'success.light' : 'error.light',
            color: params.value ? 'success.dark' : 'error.dark',
          }}
        >
          {params.value ? 'ACTIVE' : 'INACTIVE'}
        </Box>
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Registered Date',
      width: 180,
      renderCell: (params) => <DateDisplay date={params.value as string} />,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Button
          size="small"
          startIcon={<EditIcon />}
          color="primary"
          onClick={() => navigate(`/users/${params.row.id}`)}
          disabled={!hasPermission('users.edit')}
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Users & Access Rights"
        subtitle="Manage operators, credentials, and terminals"
        action={
          hasPermission('users.create') && (
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => setOpen(true)}
            >
              Add Operator
            </Button>
          )
        }
      />

      <Card>
        <CardContent sx={{ p: 0 }}>
          <DataTable
            rows={users}
            columns={columns}
            loading={loading}
            emptyTitle="No Operator Accounts Found"
            emptyDescription="Registered terminal managers and sales cashiers will be listed here."
          />
        </CardContent>
      </Card>

      {/* Register User Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleCreateUser}>
          <DialogTitle sx={{ fontFamily: '"Playfair Display", serif', fontWeight: 600 }}>
            Register New Operator
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <TextField
              fullWidth
              label="Full Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              disabled={saving}
              required
            />
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              disabled={saving}
              required
            />
            <TextField
              fullWidth
              label="Access Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={saving}
              required
            />
            <TextField
              fullWidth
              select
              label="Role Designation"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              disabled={saving}
              required
            >
              <MenuItem value="CASHIER">Cashier (Sales Entry Only)</MenuItem>
              <MenuItem value="MANAGER">Manager (Discounts & Edits)</MenuItem>
              <MenuItem value="ADMIN">Admin (Full Terminal Access)</MenuItem>
            </TextField>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
            <Button onClick={() => setOpen(false)} disabled={saving} color="inherit">
              Cancel
            </Button>
            <Button variant="contained" type="submit" disabled={saving}>
              {saving ? 'Registering...' : 'Register'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default UsersPage;
