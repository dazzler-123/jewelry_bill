import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { ErrorOutlined as ErrorOutlineIcon } from '@mui/icons-material';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to load data',
  message,
  onRetry,
  retryLabel = 'Retry',
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4,
        textAlign: 'center',
        bgcolor: 'background.paper',
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: 'error.light',
        my: 2,
      }}
    >
      <ErrorOutlineIcon sx={{ fontSize: 36, color: 'error.main', mb: 1.5 }} />
      <Typography variant="subtitle1" sx={{ fontFamily: '"Playfair Display", serif', fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360, mb: 2, fontSize: '0.8rem' }}>
        {message}
      </Typography>
      {onRetry && (
        <Button variant="outlined" color="primary" onClick={onRetry} sx={{ fontSize: '0.8rem' }}>
          {retryLabel}
        </Button>
      )}
    </Box>
  );
};

export default ErrorState;
