import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { ErrorOutlined as ErrorOutlineIcon } from '@mui/icons-material';

export const NotFoundPage: React.FC = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        textAlign: 'center',
        p: 3,
        gap: 2.5,
      }}
    >
      <ErrorOutlineIcon sx={{ fontSize: 72, color: 'primary.main' }} />
      
      <Typography
        variant="h3"
        component="h1"
        sx={{
          fontFamily: '"Playfair Display", serif',
          fontWeight: 600,
          color: 'text.primary',
        }}
      >
        Page Not Found
      </Typography>
      
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ maxWidth: 480, mb: 1, fontSize: '0.9rem' }}
      >
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable in this billing terminal.
      </Typography>
      
      <Button
        component={RouterLink}
        to="/dashboard"
        variant="contained"
        size="large"
        sx={{
          fontFamily: 'inherit',
          px: 4,
          py: 1,
        }}
      >
        Back to Dashboard
      </Button>
    </Box>
  );
};

export default NotFoundPage;
