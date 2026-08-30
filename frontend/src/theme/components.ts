import { colors } from './colors';

export const components = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 4,
        boxShadow: 'none',
        textTransform: 'none' as const,
        fontWeight: 500,
        padding: '6px 16px',
        '&:hover': {
          boxShadow: 'none',
        },
      },
      contained: {
        backgroundColor: colors.primary.main,
        color: colors.primary.contrastText,
        '&:hover': {
          backgroundColor: colors.primary.dark,
        },
      },
      outlined: {
        borderColor: colors.primary.main,
        color: colors.primary.dark,
        '&:hover': {
          borderColor: colors.primary.dark,
          backgroundColor: 'rgba(197, 168, 128, 0.04)',
        },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 6,
        border: `1px solid ${colors.divider}`,
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.02)',
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 8,
        border: `1px solid ${colors.divider}`,
        boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  MuiTextField: {
    defaultProps: {
      variant: 'outlined' as const,
      size: 'small' as const,
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: {
        borderBottom: `1px solid ${colors.divider}`,
        padding: '10px 16px',
        fontSize: '0.875rem',
      },
      head: {
        fontWeight: 600,
        backgroundColor: '#FAF9F6',
        color: colors.text.primary,
      },
    },
  },
  MuiTableHead: {
    styleOverrides: {
      root: {
        borderBottom: `2px solid ${colors.divider}`,
      },
    },
  },
};
