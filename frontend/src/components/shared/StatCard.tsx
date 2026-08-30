import React, { type ReactNode } from 'react';
import { Card, CardContent, Typography, Box, Skeleton } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

interface StatCardProps {
  title: string;
  value: ReactNode;
  icon?: ReactNode;
  trend?: string;
  trendDirection?: 'up' | 'down';
  loading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  trendDirection,
  loading = false,
}) => {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
            {title}
          </Typography>
          {icon && <Box sx={{ color: 'primary.dark', opacity: 0.8 }}>{icon}</Box>}
        </Box>
        {loading ? (
          <Skeleton variant="text" width="60%" height={32} />
        ) : (
          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              color: 'text.primary',
              fontFamily: '"Playfair Display", serif',
              mb: 1,
            }}
          >
            {value}
          </Typography>
        )}
        {trend && !loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {trendDirection === 'up' ? (
              <TrendingUpIcon fontSize="small" color="success" sx={{ width: 16, height: 16 }} />
            ) : trendDirection === 'down' ? (
              <TrendingDownIcon fontSize="small" color="error" sx={{ width: 16, height: 16 }} />
            ) : null}
            <Typography
              variant="caption"
              color={trendDirection === 'up' ? 'success.main' : trendDirection === 'down' ? 'error.main' : 'text.secondary'}
              sx={{ fontWeight: 600, fontSize: '0.75rem' }}
            >
              {trend}
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
              vs last month
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
