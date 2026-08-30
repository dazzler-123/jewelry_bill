import React, { type ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 5,
        textAlign: 'center',
        bgcolor: 'background.paper',
        borderRadius: 1.5,
        border: '1px dashed',
        borderColor: 'divider',
        my: 2,
      }}
    >
      <Box sx={{ color: 'text.disabled', mb: 1.5, display: 'flex' }}>
        {icon || <InboxOutlinedIcon sx={{ fontSize: 40 }} />}
      </Box>
      <Typography variant="subtitle1" sx={{ fontFamily: '"Playfair Display", serif', fontWeight: 600, mb: 0.5 }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280, mb: 2, fontSize: '0.8rem' }}>
          {description}
        </Typography>
      )}
      {actionLabel && onAction && (
        <Button variant="contained" onClick={onAction} sx={{ fontSize: '0.8rem' }}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
};

export default EmptyState;
