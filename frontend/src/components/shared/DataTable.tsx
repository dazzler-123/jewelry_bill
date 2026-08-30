import React from 'react';
import { DataGrid } from '@mui/x-data-grid';
import type { DataGridProps } from '@mui/x-data-grid';
import { Box } from '@mui/material';
import LoadingState from './LoadingState';
import EmptyState from './EmptyState';

type DataTableProps = Omit<DataGridProps, 'slots'> & {
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
};

export const DataTable: React.FC<DataTableProps> = ({
  loading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items matching this criteria.',
  ...props
}) => {
  return (
    <Box
      sx={{
        width: '100%',
        height: 480,
        '& .MuiDataGrid-root': {
          border: 'none',
          fontFamily: 'inherit',
        },
        '& .MuiDataGrid-columnHeaders': {
          backgroundColor: '#FAF9F6',
          borderBottom: '2px solid',
          borderColor: 'divider',
        },
        '& .MuiDataGrid-cell': {
          borderBottom: '1px solid',
          borderColor: 'divider',
          fontSize: '0.825rem',
        },
        '& .MuiDataGrid-footerContainer': {
          borderTop: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      <DataGrid
        loading={loading}
        slots={{
          loadingOverlay: () => <LoadingState message="Fetching records..." />,
          noRowsOverlay: () => <EmptyState title={emptyTitle} description={emptyDescription} />,
        }}
        disableRowSelectionOnClick
        density="compact"
        {...props}
      />
    </Box>
  );
};

export default DataTable;
