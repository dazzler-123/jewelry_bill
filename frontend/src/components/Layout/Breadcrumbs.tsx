import React from 'react';
import { Breadcrumbs as MuiBreadcrumbs, Link, Typography } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const getBreadcrumbName = (path: string) => {
    return path
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (location.pathname === '/' || location.pathname === '/dashboard') {
    return (
      <MuiBreadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
        <Typography color="text.primary" sx={{ fontWeight: 500 }}>
          Dashboard
        </Typography>
      </MuiBreadcrumbs>
    );
  }

  return (
    <MuiBreadcrumbs
      separator={<NavigateNextIcon fontSize="small" sx={{ color: 'text.disabled' }} />}
      aria-label="breadcrumb"
    >
      <Link component={RouterLink} to="/dashboard" underline="hover" color="inherit" sx={{ fontSize: '0.875rem' }}>
        Dashboard
      </Link>
      {pathnames.map((value, index) => {
        const last = index === pathnames.length - 1;
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;

        if (value === 'dashboard') return null;

        return last ? (
          <Typography color="text.primary" key={to} sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
            {getBreadcrumbName(value)}
          </Typography>
        ) : (
          <Link
            component={RouterLink}
            to={to}
            underline="hover"
            color="inherit"
            key={to}
            sx={{ fontSize: '0.875rem' }}
          >
            {getBreadcrumbName(value)}
          </Link>
        );
      })}
    </MuiBreadcrumbs>
  );
};

export default Breadcrumbs;
