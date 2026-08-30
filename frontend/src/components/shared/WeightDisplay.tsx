import React from 'react';
import { Typography, type TypographyProps } from '@mui/material';

interface WeightDisplayProps extends TypographyProps {
  weight: number;
  decimals?: number;
  unit?: string;
}

export const WeightDisplay: React.FC<WeightDisplayProps> = ({
  weight,
  decimals = 3,
  unit = 'g',
  ...props
}) => {
  const formatted = weight.toFixed(decimals);

  return (
    <Typography component="span" {...props} sx={{ fontFamily: 'inherit', fontWeight: 'inherit', ...props.sx }}>
      {formatted} {unit}
    </Typography>
  );
};

export default WeightDisplay;
