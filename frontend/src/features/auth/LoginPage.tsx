import React, { useState } from 'react';
import { Card, CardContent, TextField, Button, Box, Typography, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from '../../context/SnackbarContext';
import DiamondIcon from '@mui/icons-material/Diamond';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { showSuccess, showError } = useSnackbar();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showError('Please fill in all credentials.');
      return;
    }
    setSubmitting(true);
    try {
      await login(email, password);
      showSuccess('Welcome back to Aurum Billing Terminal!');
      navigate('/dashboard');
    } catch (err: any) {
      showError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        bgcolor: '#FAF9F6', // Alabaster/Warm White
        p: 2,
      }}
    >
      <Container maxWidth="xs">
        <Card sx={{ border: '1px solid #EBE9E4', boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.03)' }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <DiamondIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            </Box>
            
            <Typography
              variant="h5"
              component="h1"
              sx={{
                fontFamily: '"Playfair Display", serif',
                fontWeight: 700,
                color: 'text.primary',
                letterSpacing: 0.5,
                mb: 1,
              }}
            >
              AURUM TERMINAL
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3.5, fontSize: '0.8rem' }}>
              Sign in to access jewelry billing and inventory controls
            </Typography>

            <form onSubmit={handleSubmit}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <TextField
                  fullWidth
                  label="Operator Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  placeholder="name@jewelryshop.com"
                  autoComplete="username"
                  required
                />
                
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                />

                <Button
                  fullWidth
                  variant="contained"
                  type="submit"
                  disabled={submitting}
                  size="large"
                  sx={{
                    mt: 1,
                    py: 1.2,
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  {submitting ? 'Authenticating...' : 'Sign In'}
                </Button>
              </Box>
            </form>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default LoginPage;
