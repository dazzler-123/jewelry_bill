import React from 'react';
import { Chip } from '@mui/material';
import { colors } from '../../theme/colors';

interface StatusChipProps {
  status: string;
  size?: 'small' | 'medium';
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, size = 'small' }) => {
  const getStatusConfig = (stat: string) => {
    const s = stat.toUpperCase();
    switch (s) {
      case 'PAID':
        return { label: 'Paid', color: colors.status.paid, bgColor: 'rgba(46, 125, 50, 0.08)' };
      case 'PARTIALLY_PAID':
        return { label: 'Partially Paid', color: colors.status.partiallyPaid, bgColor: 'rgba(197, 168, 128, 0.08)' };
      case 'UNPAID':
        return { label: 'Unpaid', color: colors.status.unpaid, bgColor: 'rgba(255, 140, 0, 0.08)' };
      case 'OVERDUE':
        return { label: 'Overdue', color: colors.status.overdue, bgColor: 'rgba(211, 47, 47, 0.08)' };
      case 'CANCELLED':
        return { label: 'Cancelled', color: colors.status.cancelled, bgColor: 'rgba(140, 140, 140, 0.08)' };
      case 'DRAFT':
        return { label: 'Draft', color: colors.status.draft, bgColor: 'rgba(122, 134, 154, 0.08)' };
      case 'RETURNED':
        return { label: 'Returned', color: colors.status.returned, bgColor: 'rgba(2, 136, 209, 0.08)' };
      case 'REFUNDED':
        return { label: 'Refunded', color: colors.status.refunded, bgColor: 'rgba(123, 31, 162, 0.08)' };
      // Inventory Statuses
      case 'IN_STOCK':
        return { label: 'In Stock', color: colors.status.paid, bgColor: 'rgba(46, 125, 50, 0.08)' };
      case 'SOLD':
        return { label: 'Sold', color: colors.status.overdue, bgColor: 'rgba(211, 47, 47, 0.08)' };
      case 'RESERVED':
        return { label: 'Reserved', color: colors.status.unpaid, bgColor: 'rgba(255, 140, 0, 0.08)' };
      case 'DAMAGED':
        return { label: 'Damaged', color: colors.status.overdue, bgColor: 'rgba(211, 47, 47, 0.08)' };
      default:
        return { label: stat, color: colors.text.secondary, bgColor: 'rgba(0,0,0,0.04)' };
    }
  };

  const { label, color, bgColor } = getStatusConfig(status);

  return (
    <Chip
      label={label}
      size={size}
      sx={{
        fontWeight: 600,
        fontSize: '0.7rem',
        color: color,
        backgroundColor: bgColor,
        border: `1px solid ${color}25`,
        borderRadius: '4px',
        height: size === 'small' ? 22 : 28,
        letterSpacing: '0.3px',
      }}
    />
  );
};

export default StatusChip;
