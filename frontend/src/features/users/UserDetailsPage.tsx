import { API_URL } from '../../config';
import React, { useEffect, useState } from 'react';
import { Card, CardContent, TextField, Button, Box, Typography, MenuItem, Grid, Switch, FormControlLabel } from '@mui/material';
import { Save as SaveIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from '../../context/SnackbarContext';
import { PageHeader, LoadingState, ErrorState } from '../../components/shared';

export const UserDetailsPage: React.FC = () => {
  const { token, hasPermission } = useAuth();
  const { showSuccess, showError } = useSnackbar();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('CASHIER');
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/users/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          if (res.status === 404) throw new Error('Operator account not found');
          throw new Error('Failed to load user details');
        }
        const u = await res.json();
        setName(u.name);
        setEmail(u.email);
        setRole(u.role);
        setIsActive(u.isActive);
      } catch (err: any) {
        setError(err.message || 'Error loading operator account');
      } finally {
        setLoading(false);
      }
    };

    if (token && id) {
      void fetchUser();
    }
  }, [token, id]);

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      showError('Name and Email are required.');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        name,
        email,
        role,
        isActive,
      };
      if (password) {
        payload.password = password;
      }

      const res = await fetch(`${API_URL}/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to update operator profile');
      }

      showSuccess('Operator profile updated successfully!');
      setPassword(''); // Clear password field
      navigate('/users');
    } catch (err: any) {
      showError(err.message || 'Error updating operator profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState message="Fetching profile details..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => navigate('/users')} retryLabel="Back to Operators List" />;
  }

  const editRestricted = !hasPermission('users.edit');

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/users')} color="inherit">
          Back to Operators List
        </Button>
      </Box>
      
      <PageHeader title="Operator Profile" subtitle={`Review and edit details for ${name}`} />

      <Card sx={{ maxWidth: 800 }}>
        <CardContent sx={{ p: 4 }}>
          <form onSubmit={handleUpdateUser}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={saving || editRestricted}
                  required
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={saving || editRestricted}
                  required
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Reset Password (Leave blank to keep current)"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={saving || editRestricted}
                  placeholder="Enter new password"
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  select
                  label="Role Designation"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={saving || editRestricted}
                  required
                >
                  <MenuItem value="CASHIER">Cashier (Sales Entry Only)</MenuItem>
                  <MenuItem value="MANAGER">Manager (Discounts & Edits)</MenuItem>
                  <MenuItem value="ADMIN">Admin (Full Terminal Access)</MenuItem>
                </TextField>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      disabled={saving || editRestricted}
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Active Operator Account (Enable system login)
                    </Typography>
                  }
                />
              </Grid>

              {!editRestricted && (
                <Grid size={{ xs: 12 }} sx={{ mt: 1 }}>
                  <Button
                    variant="contained"
                    type="submit"
                    startIcon={<SaveIcon />}
                    disabled={saving}
                    size="large"
                  >
                    {saving ? 'Saving...' : 'Save Profile Changes'}
                  </Button>
                </Grid>
              )}
            </Grid>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default UserDetailsPage;
