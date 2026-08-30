import React from 'react';
import { TextField, InputAdornment } from '@mui/material';
import type { TextFieldProps } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

type SearchInputProps = Omit<TextFieldProps, 'onChange'> & {
  onChange: (value: string) => void;
  value: string;
};

export const SearchInput: React.FC<SearchInputProps> = ({ onChange, value, ...props }) => {
  return (
    <TextField
      value={value}
      onChange={(e) => onChange(e.target.value)}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: 'text.disabled', fontSize: 18 }} />
            </InputAdornment>
          ),
        },
      }}
      placeholder="Search..."
      fullWidth
      sx={{
        '& .MuiOutlinedInput-root': {
          fontSize: '0.85rem',
        },
        ...props.sx
      }}
      {...props}
    />
  );
};

export default SearchInput;
