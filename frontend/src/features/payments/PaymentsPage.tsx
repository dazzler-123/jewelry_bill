import React from 'react';
import { Box } from '@mui/material';
import { PageHeader, EmptyState } from '../../components/shared';

export const PaymentsPage: React.FC = () => {
  return (
    <Box>
      <PageHeader title="Payments Transactions" subtitle="Track cash, UPI, card, and bank transfer receipts" />
      <EmptyState
        title="No Payments Logged"
        description="Individual payment transactions, reference codes, refunds, and due clearances will be listed here."
        actionLabel="Log Manual Payment"
        onAction={() => {}}
      />
    </Box>
  );
};

export default PaymentsPage;
