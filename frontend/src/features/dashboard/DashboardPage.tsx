import { API_URL } from '../../config';
import React, { useEffect, useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  MenuItem,
  TextField,
  Paper,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  ReceiptLong as BillsIcon,
  Diamond as MetalIcon,
  Warning as OverdueIcon,
  MoneyOff as OutstandingIcon,
  AccountBalanceWallet as CollectionIcon,
} from '@mui/icons-material';
import {
  PageHeader,
  StatCard,
  MoneyDisplay,
  DateDisplay,
} from '../../components/shared';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from '../../context/SnackbarContext';

interface DashboardStats {
  todaySales: number;
  todayBillsCount: number;
  goldSoldGrams: number;
  silverSoldGrams: number;
  outstanding: number;
  overdue: number;
  todayCollection: number;
}

interface ChartDataPoint {
  label: string;
  amount: number;
}

export const DashboardPage: React.FC = () => {
  const { token } = useAuth();
  const { showError } = useSnackbar();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [chartFilter, setChartFilter] = useState<'today' | '7days' | '30days' | '3months'>('7days');
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingChart, setLoadingChart] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch(API_URL + '/reports/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch dashboard metrics');
      const data = await res.json();
      setStats(data);
    } catch (err: any) {
      showError(err.message || 'Error loading dashboard metrics');
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchChart = async () => {
    setLoadingChart(true);
    try {
      const res = await fetch(`${API_URL}/reports/sales-chart?filter=${chartFilter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch chart data');
      const data = await res.json();
      setChartData(data);
    } catch (err: any) {
      showError(err.message || 'Error loading sales chart');
    } finally {
      setLoadingChart(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchStats();
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchChart();
    }
  }, [token, chartFilter]);

  // SVG Custom Chart Math
  const chartWidth = 700;
  const chartHeight = 220;
  const paddingX = 40;
  const paddingY = 20;

  const maxVal = Math.max(...chartData.map((d) => d.amount), 5000);
  const plotWidth = chartWidth - paddingX * 2;
  const plotHeight = chartHeight - paddingY * 2;

  const points = chartData.map((d, index) => {
    const x = paddingX + (index / Math.max(chartData.length - 1, 1)) * plotWidth;
    const y = chartHeight - paddingY - (d.amount / maxVal) * plotHeight;
    return { x, y, label: d.label, amount: d.amount };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = points.length > 0 ? `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z` : '';

  return (
    <Box>
      <PageHeader
        title="Dashboard Overview"
        subtitle="Live Store Demographics and Real-Time Business Performance Indicators"
        action={
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
            Sync: <DateDisplay date={new Date()} includeTime />
          </Typography>
        }
      />

      {loadingStats || !stats ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}>
          <CircularProgress size={50} />
        </Box>
      ) : (
        <Grid container spacing={3.5} sx={{ mb: 4.5 }}>
          {/* today sales */}
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard
              title="Today's Net Sales"
              value={<MoneyDisplay amount={stats.todaySales} />}
              trend={`Bills: ${stats.todayBillsCount}`}
              trendDirection="up"
              icon={<TrendingUpIcon />}
            />
          </Grid>
          {/* today bills count */}
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard
              title="Today's Collections"
              value={<MoneyDisplay amount={stats.todayCollection} />}
              trend="Successful receipts"
              trendDirection="up"
              icon={<CollectionIcon />}
            />
          </Grid>
          {/* gold sold today */}
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard
              title="Today's Gold Sold"
              value={`${stats.goldSoldGrams.toFixed(2)}g`}
              trend="Net metal weight"
              trendDirection="up"
              icon={<MetalIcon color="primary" />}
            />
          </Grid>
          {/* silver sold today */}
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard
              title="Today's Silver Sold"
              value={`${stats.silverSoldGrams.toFixed(2)}g`}
              trend="Net metal weight"
              trendDirection="up"
              icon={<MetalIcon color="secondary" />}
            />
          </Grid>
          {/* total outstanding */}
          <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
            <StatCard
              title="Total Outstanding Dues"
              value={<MoneyDisplay amount={stats.outstanding} />}
              trend="Active pending invoice ledgers"
              trendDirection="down"
              icon={<OutstandingIcon />}
            />
          </Grid>
          {/* total overdue */}
          <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
            <StatCard
              title="Total Overdue Balances"
              value={<MoneyDisplay amount={stats.overdue} />}
              trend="Past billing payment due dates"
              trendDirection="down"
              icon={<OverdueIcon />}
            />
          </Grid>
          {/* Today's total Bills count card */}
          <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
            <StatCard
              title="Invoice Bills Generated"
              value={`${stats.todayBillsCount} Bills`}
              trend="Today's billing transaction logs"
              trendDirection="up"
              icon={<BillsIcon />}
            />
          </Grid>
        </Grid>
      )}

      {/* Sales Line Graph Chart Section */}
      <Card sx={{ boxShadow: '0 4px 20px rgba(0,0,0,0.04)', mb: 4.5 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontFamily: '"Playfair Display", serif', fontWeight: 700 }}>
                Revenue Sales History Ledger
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Aggregated billing collections trends over selected date filter ranges
              </Typography>
            </Box>

            <TextField
              select
              size="small"
              label="Chart Time Filter"
              value={chartFilter}
              onChange={(e: any) => setChartFilter(e.target.value)}
              sx={{ width: 180 }}
            >
              <MenuItem value="today">Today (Hourly)</MenuItem>
              <MenuItem value="7days">Last 7 Days</MenuItem>
              <MenuItem value="30days">Last 30 Days</MenuItem>
              <MenuItem value="3months">Last 3 Months</MenuItem>
            </TextField>
          </Box>

          {loadingChart ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 220 }}>
              <CircularProgress size={30} />
            </Box>
          ) : chartData.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 5, textAlign: 'center', fontStyle: 'italic' }}>
              No sales data cataloged for the selected time filter.
            </Typography>
          ) : (
            <Box sx={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height={chartHeight} style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C5A880" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#C5A880" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal reference helper grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
                  const yVal = paddingY + r * plotHeight;
                  return (
                    <line
                      key={i}
                      x1={paddingX}
                      y1={yVal}
                      x2={chartWidth - paddingX}
                      y2={yVal}
                      stroke="rgba(197, 168, 128, 0.15)"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                    />
                  );
                })}

                {/* Area under line */}
                {areaPath && <path d={areaPath} fill="url(#chartGradient)" />}

                {/* Line chart path */}
                {linePath && <path d={linePath} fill="none" stroke="#C5A880" strokeWidth={3} />}

                {/* Interactive chart data points */}
                {points.map((p, index) => {
                  const isHovered = hoveredIndex === index;
                  return (
                    <g key={index}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isHovered ? 6 : 4}
                        fill={isHovered ? '#fff' : '#C5A880'}
                        stroke="#C5A880"
                        strokeWidth={2}
                        style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                        onMouseEnter={() => setHoveredIndex(index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                      />
                    </g>
                  );
                })}

                {/* X-Axis labels (only show subset to avoid clutter) */}
                {points.map((p, idx) => {
                  const intervalCount = Math.ceil(points.length / 7);
                  if (idx % intervalCount !== 0 && idx !== points.length - 1) return null;
                  return (
                    <text
                      key={idx}
                      x={p.x}
                      y={chartHeight - 4}
                      textAnchor="middle"
                      fill="rgba(0,0,0,0.5)"
                      fontSize="9px"
                    >
                      {p.label}
                    </text>
                  );
                })}
              </svg>

              {/* Dynamic Interactive Tooltip overlay */}
              {hoveredIndex !== null && points[hoveredIndex] && (
                <Paper
                  variant="outlined"
                  sx={{
                    position: 'absolute',
                    top: Math.max(0, points[hoveredIndex].y - 65),
                    left: `${(points[hoveredIndex].x / chartWidth) * 100}%`,
                    transform: 'translateX(-50%)',
                    p: 1,
                    textAlign: 'center',
                    pointerEvents: 'none',
                    bgcolor: 'background.paper',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    zIndex: 10,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                    {points[hoveredIndex].label}
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    ₹{points[hoveredIndex].amount.toLocaleString('en-IN')}
                  </Typography>
                </Paper>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default DashboardPage;
