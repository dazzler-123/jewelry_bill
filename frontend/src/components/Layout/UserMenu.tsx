import React, { useState } from 'react';
import { IconButton, Avatar, Menu, MenuItem, ListItemText, ListItemIcon, Divider, Typography, Box } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const UserMenu: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNavigate = (path: string) => {
    handleClose();
    navigate(path);
  };

  return (
    <>
      <IconButton onClick={handleOpen} size="small" sx={{ ml: 1, p: 0.5 }}>
        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', color: 'primary.contrastText', fontSize: '0.85rem', fontWeight: 600 }}>
          {user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'OP'}
        </Avatar>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{
          paper: { sx: { width: 220, mt: 1 } },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
            {user?.name || 'Store Operator'}
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
            {user?.email || 'operator@jewelryshop.com'} ({user?.role || 'CASHIER'})
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={() => handleNavigate('/settings')}>
          <ListItemIcon>
            <AccountCircleIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          </ListItemIcon>
          <ListItemText primary={<Typography sx={{ fontSize: '0.8rem' }}>My Profile</Typography>} />
        </MenuItem>
        <MenuItem onClick={() => handleNavigate('/settings')}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          </ListItemIcon>
          <ListItemText primary={<Typography sx={{ fontSize: '0.8rem' }}>Shop Settings</Typography>} />
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { handleClose(); logout(); }}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText primary={<Typography sx={{ fontSize: '0.8rem', color: 'error.main' }}>Log out</Typography>} />
        </MenuItem>
      </Menu>
    </>
  );
};

export default UserMenu;
