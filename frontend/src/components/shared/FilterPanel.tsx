import React, { type ReactNode } from 'react';
import { Drawer, Box, Typography, IconButton, Divider, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface FilterPanelProps {
  open: boolean;
  onClose: () => void;
  onClear: () => void;
  onApply: () => void;
  children: ReactNode;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  open,
  onClose,
  onClear,
  onApply,
  children,
}) => {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: { width: { xs: '100%', sm: 360 }, p: 0 },
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.paper' }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontFamily: '"Playfair Display", serif', fontWeight: 600 }}>
            Filter Options
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>
        <Divider />
        <Box sx={{ p: 3, flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3.5 }}>
          {children}
        </Box>
        <Divider />
        <Box sx={{ p: 2, display: 'flex', gap: 2, bgcolor: '#FAF9F6' }}>
          <Button onClick={onClear} fullWidth variant="outlined" color="inherit" sx={{ fontSize: '0.8rem' }}>
            Clear All
          </Button>
          <Button onClick={onApply} fullWidth variant="contained" sx={{ fontSize: '0.8rem' }}>
            Apply
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default FilterPanel;
