import { API_URL } from '../../config';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Paper,
  Grid,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, History as HistoryIcon } from '@mui/icons-material';
import { PageHeader, MoneyDisplay, DateDisplay } from '../../components/shared';
import { useSnackbar } from '../../context/SnackbarContext';
import { useAuth } from '../../context/AuthContext';

interface Revision {
  _id: string;
  version: number;
  createdAt: string;
  reason: string;
  changedBy: {
    name: string;
    email: string;
  };
  previousData: any;
  newData: any;
}

export const BillHistoryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { showError } = useSnackbar();

  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoiceNumber, setInvoiceNumber] = useState('');

  useEffect(() => {
    const fetchRevisions = async () => {
      setLoading(true);
      try {
        // Fetch invoice details first to get invoice number
        const billRes = await fetch(`${API_URL}/bills/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (billRes.ok) {
          const billData = await billRes.json();
          setInvoiceNumber(billData.invoiceNumber);
        }

        // Fetch revision timelines
        const res = await fetch(`${API_URL}/bills/${id}/revisions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load revision history');
        const data = await res.json();
        setRevisions(data);
      } catch (err: any) {
        showError(err.message || 'Error fetching revisions');
      } finally {
        setLoading(false);
      }
    };

    if (id && token) {
      fetchRevisions();
    }
  }, [id, token]);

  // Dynamic difference analysis for previous vs new snapshots
  const renderChangeLog = (prev: any, next: any) => {
    const logs: Array<{ field: string; oldVal: React.ReactNode; newVal: React.ReactNode }> = [];

    // 1. Compare Final Amount
    const prevFinal = prev.pricingSnapshot?.finalAmount;
    const nextFinal = next.pricingSnapshot?.finalAmount;
    if (prevFinal !== nextFinal) {
      logs.push({
        field: 'Grand Total Amount',
        oldVal: <MoneyDisplay amount={prevFinal || 0} />,
        newVal: <MoneyDisplay amount={nextFinal || 0} />,
      });
    }

    // 2. Compare Due Date
    const prevDue = prev.dueDate;
    const nextDue = next.dueDate;
    if (prevDue && nextDue && new Date(prevDue).getTime() !== new Date(nextDue).getTime()) {
      logs.push({
        field: 'Invoice Due Date',
        oldVal: <DateDisplay date={prevDue} />,
        newVal: <DateDisplay date={nextDue} />,
      });
    }

    // 3. Compare Items Count
    const prevCount = prev.itemsSnapshot?.length || 0;
    const nextCount = next.itemsSnapshot?.length || 0;
    if (prevCount !== nextCount) {
      logs.push({
        field: 'Number of Line Items',
        oldVal: `${prevCount} items`,
        newVal: `${nextCount} items`,
      });
    }

    // 4. Compare Notes
    const prevNotes = prev.notes || '';
    const nextNotes = next.notes || '';
    if (prevNotes !== nextNotes) {
      logs.push({
        field: 'Invoice Notes',
        oldVal: prevNotes ? `"${prevNotes}"` : 'None',
        newVal: nextNotes ? `"${nextNotes}"` : 'None',
      });
    }

    if (logs.length === 0) {
      return (
        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          Minor/technical adjustments recorded.
        </Typography>
      );
    }

    return (
      <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
          DETAILED COMPARISON
        </Typography>
        <Grid container spacing={1}>
          {logs.map((log, index) => (
            <Grid container item xs={12} key={index} alignItems="center" spacing={1}>
              <Grid item xs={4}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{log.field}</Typography>
              </Grid>
              <Grid item xs={3.5} sx={{ textAlign: 'right', textDecoration: 'line-through', color: 'text.secondary' }}>
                <Typography variant="body2">{log.oldVal}</Typography>
              </Grid>
              <Grid item xs={1} sx={{ textAlign: 'center', color: 'primary.main', fontWeight: 700 }}>
                →
              </Grid>
              <Grid item xs={3.5} sx={{ fontWeight: 700, color: 'primary.main' }}>
                <Typography variant="body2">{log.newVal}</Typography>
              </Grid>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/bills')}>
          <ArrowBackIcon />
        </IconButton>
        <PageHeader title="Invoice Revisions Log" subtitle={`Revision history trail for: ${invoiceNumber}`} />
      </Box>

      {revisions.length === 0 ? (
        <Card>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <HistoryIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>No Revisions Logged</Typography>
            <Typography color="text.secondary">This invoice is in its original state and has not been modified.</Typography>
          </CardContent>
        </Card>
      ) : (
        <List sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: 0 }}>
          {revisions.map((rev, index) => (
            <Paper key={rev._id} variant="outlined" sx={{ p: 3, borderColor: 'divider', borderRadius: 2 }}>
              <ListItem sx={{ p: 0, display: 'block' }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        Version #{rev.version}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Revised on: <DateDisplay date={rev.createdAt} includeTime />
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        Changed by: <strong>{rev.changedBy?.name || 'System'}</strong> ({rev.changedBy?.email || 'N/A'})
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 2, p: 1.5, borderLeft: '3px solid', borderColor: 'primary.main', bgcolor: 'action.hover', fontStyle: 'italic' }}>
                        <strong>Reason:</strong> {rev.reason}
                      </Typography>
                      {renderChangeLog(rev.previousData, rev.newData)}
                    </Box>
                  }
                />
              </ListItem>
            </Paper>
          ))}
        </List>
      )}
    </Box>
  );
};

export default BillHistoryPage;
