import React, { type ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, action }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', sm: 'center' },
        gap: 2,
        mb: 3,
      }}
    >
      <Box>
        <Typography
          variant="h5"
          component="h1"
          sx={{
            fontFamily: '"Playfair Display", serif',
            fontWeight: 600,
            color: 'text.primary',
            mb: 0.5,
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && <Box sx={{ alignSelf: { xs: 'stretch', sm: 'auto' } }}>{action}</Box>}
    </Box>
  );
};

export default PageHeader;
