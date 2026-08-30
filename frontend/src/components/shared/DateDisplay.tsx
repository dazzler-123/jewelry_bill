import React from 'react';
import { Typography, type TypographyProps } from '@mui/material';

interface DateDisplayProps extends TypographyProps {
  date: string | Date;
  includeTime?: boolean;
}

export const DateDisplay: React.FC<DateDisplayProps> = ({
  date,
  includeTime = false,
  ...props
}) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return <Typography component="span" {...props}>Invalid Date</Typography>;
  }

  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  };

  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }

  const formatted = new Intl.DateTimeFormat('en-IN', options).format(d);

  return (
    <Typography component="span" {...props} sx={{ fontFamily: 'inherit', fontWeight: 'inherit', ...props.sx }}>
      {formatted}
    </Typography>
  );
};

export default DateDisplay;
