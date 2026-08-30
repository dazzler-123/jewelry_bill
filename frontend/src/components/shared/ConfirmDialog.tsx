import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  severity?: 'primary' | 'error' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  severity = 'primary',
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const getButtonStyles = () => {
    switch (severity) {
      case 'error':
        return {
          bgcolor: 'error.main',
          color: '#FFF',
          '&:hover': { bgcolor: 'error.dark' },
        };
      case 'warning':
        return {
          bgcolor: 'warning.main',
          color: '#FFF',
          '&:hover': { bgcolor: 'warning.dark' },
        };
      default:
        return {
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          '&:hover': { bgcolor: 'primary.dark' },
        };
    }
  };

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontFamily: '"Playfair Display", serif', fontWeight: 600, fontSize: '1.1rem' }}>
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onCancel} disabled={loading} color="inherit" sx={{ fontSize: '0.8rem' }}>
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          disabled={loading}
          autoFocus
          sx={{ ...getButtonStyles(), fontSize: '0.8rem' }}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
