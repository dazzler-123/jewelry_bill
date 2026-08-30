import React, { useState } from 'react';
import {
  Box,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Receipt as ReceiptIcon,
  ReceiptLong as BillsIcon,
  People as CustomersIcon,
  Diamond as ProductsIcon,
  Inventory as InventoryIcon,
  Payments as PaymentsIcon,
  TrendingUp as RatesIcon,
  BarChart as ReportsIcon,
  ManageAccounts as UsersIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Breadcrumbs from './Breadcrumbs';
import NotificationMenu from './NotificationMenu';
import UserMenu from './UserMenu';

const drawerWidth = 240;

const menuItems = [
  { text: 'Dashboard', path: '/dashboard', icon: <DashboardIcon />, permission: undefined },
  { text: 'New Billing', path: '/billing/new', icon: <ReceiptIcon />, permission: 'billing.create' },
  { text: 'Bills History', path: '/bills', icon: <BillsIcon />, permission: 'billing.view' },
  { text: 'Customers', path: '/customers', icon: <CustomersIcon />, permission: 'billing.view' },
  { text: 'Products List', path: '/products', icon: <ProductsIcon />, permission: 'metalRate.view' },
  { text: 'Inventory', path: '/inventory', icon: <InventoryIcon />, permission: 'inventory.sell' },
  { text: 'Payments', path: '/payments', icon: <PaymentsIcon />, permission: 'payment.view' },
  { text: 'Metal Rates', path: '/metal-rates', icon: <RatesIcon />, permission: 'metalRate.view' },
  { text: 'Reports', path: '/reports', icon: <ReportsIcon />, permission: 'reports.view' },
  { text: 'Users Management', path: '/users', icon: <UsersIcon />, permission: 'users.view' },
  { text: 'Settings', path: '/settings', icon: <SettingsIcon />, permission: 'settings.manage' },
];

export const AppShell: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { hasPermission } = useAuth();

  const visibleMenuItems = menuItems.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#1C1C1C', color: '#FAF9F6' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 64 }}>
        <Typography variant="h6" noWrap component="div" sx={{ fontFamily: '"Playfair Display", serif', fontWeight: 700, color: 'primary.main', letterSpacing: 1, fontSize: '1.2rem' }}>
          AURUM JEWELRY
        </Typography>
      </Box>
      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.06)' }} />
      <List sx={{ px: 1, py: 2, flexGrow: 1 }}>
        {visibleMenuItems.map((item) => {
          const active = location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/');
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={Link}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                sx={{
                  borderRadius: 1,
                  backgroundColor: active ? 'rgba(197, 168, 128, 0.15)' : 'transparent',
                  color: active ? 'primary.main' : '#E0E0E0',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  },
                  '& .MuiListItemIcon-root': {
                    color: active ? 'primary.main' : '#8A8A8A',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={<Typography sx={{ fontSize: '0.8rem', fontWeight: active ? 600 : 500 }}>{item.text}</Typography>} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.06)' }} />
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="caption" sx={{ color: 'text.disabled', opacity: 0.4, fontSize: '0.7rem' }}>
          v1.0.0 Foundation
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <CssBaseline />
      
      {/* Top AppBar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', px: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 1, display: { md: 'none' }, color: 'text.primary' }}
            >
              <MenuIcon />
            </IconButton>
            <Breadcrumbs />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <NotificationMenu />
            <UserMenu />
          </Box>
        </Toolbar>
      </AppBar>

      {/* Side Navigation Drawers */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="menu navigation"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: 'none' },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Toolbar />
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default AppShell;
