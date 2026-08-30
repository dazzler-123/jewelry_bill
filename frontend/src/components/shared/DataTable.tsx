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
        maxWidth: '100%',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        '& .MuiDataGrid-root': {
          border: 'none',
          fontFamily: 'inherit',
          minWidth: 600,
        },
        '& .MuiDataGrid-columnHeaders': {
          backgroundColor: '#FAF9F6',
          borderBottom: '2px solid',
          borderColor: 'divider',
        },
        '& .MuiDataGrid-cell': {
          borderBottom: '1px solid',
          borderColor: 'divider',
          fontSize: { xs: '0.75rem', sm: '0.825rem' },
        },
        '& .MuiDataGrid-footerContainer': {
          borderTop: '1px solid',
          borderColor: 'divider',
        },
        '& .MuiDataGrid-virtualScroller': {
          minHeight: 200,
        },
      }}
    >
      <DataGrid
        loading={loading}
        autoHeight
        slots={{
          loadingOverlay: () => <LoadingState message="Fetching records..." />,
          noRowsOverlay: () => <EmptyState title={emptyTitle} description={emptyDescription} />,
        }}
        disableRowSelectionOnClick
        density="compact"
        pageSizeOptions={[10, 25, 50]}
        {...props}
      />
    </Box>
  );
};

export default DataTable;
