import React from 'react';
import { Box, CircularProgress, Typography, Skeleton } from '@mui/material';

interface LoadingStateProps {
  message?: string;
  variant?: 'spinner' | 'skeleton-list' | 'skeleton-card';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading details...',
  variant = 'spinner',
}) => {
  if (variant === 'skeleton-list') {
    return (
      <Box sx={{ width: '100%', py: 2 }}>
        <Skeleton height={40} sx={{ mb: 1 }} />
        <Skeleton height={32} sx={{ mb: 1 }} />
        <Skeleton height={32} sx={{ mb: 1 }} />
        <Skeleton height={32} sx={{ mb: 1 }} />
        <Skeleton height={32} />
      </Box>
    );
  }

  if (variant === 'skeleton-card') {
    return (
      <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, bgcolor: 'background.paper' }}>
        <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 1, mb: 2 }} />
        <Skeleton variant="text" width="60%" height={24} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="40%" height={20} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        gap: 2,
      }}
    >
      <CircularProgress size={32} sx={{ color: 'primary.main' }} />
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
        {message}
      </Typography>
    </Box>
  );
};

export default LoadingState;
