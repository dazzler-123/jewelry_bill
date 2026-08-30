import { createTheme } from '@mui/material/styles';
import { colors } from './colors';
import { typography } from './typography';
import { components } from './components';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: colors.primary,
    secondary: colors.secondary,
    background: colors.background,
    text: colors.text,
    divider: colors.divider,
  },
  typography,
  components,
});

export default theme;
