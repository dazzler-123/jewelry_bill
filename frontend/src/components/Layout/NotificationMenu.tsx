import React, { useState } from 'react';
import { IconButton, Badge, Menu, MenuItem, ListItemText, Typography, Divider, Box, Button } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';

export const NotificationMenu: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const notifications = [
    { id: '1', message: 'Gold rate updated to ₹7,850/g (24K)', type: 'INFO', time: '10 mins ago' },
    { id: '2', message: 'Overdue Bill: Invoice #INV-0083 is past due', type: 'WARNING', time: '2 hours ago' },
    { id: '3', message: 'Database backup completed successfully', type: 'SUCCESS', time: '1 day ago' },
  ];

  return (
    <>
      <IconButton color="inherit" onClick={handleOpen}>
        <Badge badgeContent={notifications.length} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.65rem', height: 16, minWidth: 16 } }}>
          <NotificationsIcon sx={{ color: 'text.secondary' }} />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{
          paper: { sx: { width: 320, maxHeight: 400, mt: 1 } },
        }}
      >
        <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Notifications
          </Typography>
          <Button size="small" variant="text" sx={{ color: 'primary.dark', fontSize: '0.7rem', p: 0, '&:hover': { background: 'none' } }}>
            Mark all read
          </Button>
        </Box>
        <Divider />
        {notifications.map((notif) => (
          <MenuItem key={notif.id} onClick={handleClose} sx={{ py: 1, borderBottom: '1px solid #FAF9F6', '&:last-child': { borderBottom: 'none' } }}>
            <ListItemText
              primary={
                <Typography variant="body2" color="text.primary" sx={{ whiteSpace: 'normal', fontSize: '0.8rem' }}>
                  {notif.message}
                </Typography>
              }
              secondary={
                <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                  {notif.time}
                </Typography>
              }
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default NotificationMenu;
