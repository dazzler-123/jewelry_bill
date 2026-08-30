import React from 'react';
import { Typography, type TypographyProps } from '@mui/material';

interface MoneyDisplayProps extends TypographyProps {
  amount: number;
  decimals?: number;
}

export const MoneyDisplay: React.FC<MoneyDisplayProps> = ({
  amount,
  decimals = 2,
  ...props
}) => {
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);

  return (
    <Typography component="span" {...props} sx={{ fontFamily: 'inherit', fontWeight: 'inherit', ...props.sx }}>
      {formatted}
    </Typography>
  );
};

export default MoneyDisplay;
