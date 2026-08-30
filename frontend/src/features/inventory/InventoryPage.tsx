import { API_URL } from '../../config';
import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Grid,
  Typography,
  Autocomplete,
  Drawer,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from '../../context/SnackbarContext';
import {
  PageHeader,
  DataTable,
  SearchInput,
  FilterPanel,
  DateDisplay,
  WeightDisplay,
  MoneyDisplay,
  StatusChip,
} from '../../components/shared';
import type { GridColDef } from '@mui/x-data-grid';

interface ProductOption {
  _id: string;
  sku: string;
  barcode: string;
  name: string;
  metal: string;
  purity: string;
  defaultMakingCharge: number;
  defaultWastage: number;
}

interface InventoryRow {
  id: string;
  productId: {
    _id: string;
    name: string;
  };
  sku: string;
  barcode: string;
  metal: string;
  purity: string;
  grossWeight: number;
  stoneWeight: number;
  otherWeight: number;
  netWeight: number;
  purchasePrice?: number;
  sellingPrice?: number;
  makingCharge?: number;
  wastage?: number;
  status: string;
  location?: string;
  createdAt: string;
}

interface HistoryLog {
  _id: string;
  previousStatus: string;
  newStatus: string;
  reason: string;
  userId: {
    name: string;
    email: string;
  };
  billId?: string | {
    _id: string;
    invoiceNumber: string;
  };
  createdAt: string;
}

export const InventoryPage: React.FC = () => {
  const { token, hasPermission } = useAuth();
  const { showSuccess, showError } = useSnackbar();

  // Inventory list state
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMetal, setFilterMetal] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [appliedStatus, setAppliedStatus] = useState('');
  const [appliedMetal, setAppliedMetal] = useState('');

  // Dropdown options
  const [productsList, setProductsList] = useState<ProductOption[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Dialog / Drawer states
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Active records
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryRow | null>(null);
  const [historyItemId, setHistoryItemId] = useState<string | null>(null);
  const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Form Fields (Receive/Edit)
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [metal, setMetal] = useState('GOLD');
  const [purity, setPurity] = useState('22K');
  const [grossWeight, setGrossWeight] = useState('');
  const [stoneWeight, setStoneWeight] = useState('0');
  const [otherWeight, setOtherWeight] = useState('0');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [makingCharge, setMakingCharge] = useState('');
  const [wastage, setWastage] = useState('');
  const [status, setStatus] = useState('IN_STOCK');
  const [location, setLocation] = useState('');
  const [updateReason, setUpdateReason] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (searchQuery.trim()) queryParams.append('query', searchQuery.trim());
      if (appliedStatus) queryParams.append('status', appliedStatus);
      if (appliedMetal) queryParams.append('metal', appliedMetal);

      const res = await fetch(`${API_URL}/inventory?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch inventory items');
      const data = await res.json();
      setItems(
        data.map((item: any) => ({
          id: item._id || item.id,
          productId: item.productId || { _id: '', name: 'N/A' },
          sku: item.sku,
          barcode: item.barcode,
          metal: item.metal,
          purity: item.purity,
          grossWeight: item.grossWeight,
          stoneWeight: item.stoneWeight || 0,
          otherWeight: item.otherWeight || 0,
          netWeight: item.netWeight,
          purchasePrice: item.purchasePrice,
          sellingPrice: item.sellingPrice,
          makingCharge: item.makingCharge,
          wastage: item.wastage,
          status: item.status,
          location: item.location,
          createdAt: item.createdAt,
        }))
      );
    } catch (err: any) {
      showError(err.message || 'Error loading stock logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch(API_URL + '/products?active=true', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch catalog list');
      const data = await res.json();
      setProductsList(data);
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (token) {
      void fetchInventory();
    }
  }, [token, searchQuery, appliedStatus, appliedMetal]);

  useEffect(() => {
    if (token && (receiveOpen || editOpen)) {
      void fetchActiveProducts();
    }
  }, [token, receiveOpen, editOpen]);

  // Autofill form when product selected during receive
  const handleSelectProductOption = (prod: ProductOption | null) => {
    setSelectedProduct(prod);
    if (prod) {
      setSku(prod.sku);
      setBarcode(prod.barcode);
      setMetal(prod.metal);
      setPurity(prod.purity);
      setMakingCharge(prod.defaultMakingCharge?.toString() || '');
      setWastage(prod.defaultWastage?.toString() || '');
    } else {
      setSku('');
      setBarcode('');
      setMetal('GOLD');
      setPurity('22K');
      setMakingCharge('');
      setWastage('');
    }
  };

  const handleOpenReceiveDialog = () => {
    setSelectedProduct(null);
    setSku('');
    setBarcode('');
    setMetal('GOLD');
    setPurity('22K');
    setGrossWeight('');
    setStoneWeight('0');
    setOtherWeight('0');
    setPurchasePrice('');
    setSellingPrice('');
    setMakingCharge('');
    setWastage('');
    setStatus('IN_STOCK');
    setLocation('');
    setReceiveOpen(true);
  };

  const handleSaveReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      showError('Please select a cataloged product design');
      return;
    }
    if (!grossWeight || Number(grossWeight) <= 0) {
      showError('Gross weight must be greater than 0');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        productId: selectedProduct._id,
        sku: sku.trim().toUpperCase(),
        barcode: barcode.trim(),
        metal: metal.toUpperCase(),
        purity: purity.trim(),
        grossWeight: Number(grossWeight),
        stoneWeight: Number(stoneWeight) || 0,
        otherWeight: Number(otherWeight) || 0,
        purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
        sellingPrice: sellingPrice ? Number(sellingPrice) : undefined,
        makingCharge: makingCharge ? Number(makingCharge) : undefined,
        wastage: wastage ? Number(wastage) : undefined,
        status,
        location: location.trim() || undefined,
      };

      const res = await fetch(API_URL + '/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to receive stock');
      }

      showSuccess('Stock item cataloged and received successfully!');
      setReceiveOpen(false);
      void fetchInventory();
    } catch (err: any) {
      showError(err.message || 'Error receiving stock item');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEditDialog = (item: InventoryRow) => {
    setEditingItem(item);
    setSku(item.sku);
    setBarcode(item.barcode);
    setMetal(item.metal);
    setPurity(item.purity);
    setGrossWeight(item.grossWeight.toString());
    setStoneWeight(item.stoneWeight.toString());
    setOtherWeight(item.otherWeight.toString());
    setPurchasePrice(item.purchasePrice?.toString() || '');
    setSellingPrice(item.sellingPrice?.toString() || '');
    setMakingCharge(item.makingCharge?.toString() || '');
    setWastage(item.wastage?.toString() || '');
    setStatus(item.status);
    setLocation(item.location || '');
    setUpdateReason('');
    setEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!grossWeight || Number(grossWeight) <= 0) {
      showError('Gross weight must be greater than 0');
      return;
    }

    const isStatusChanged = editingItem.status !== status;
    if (isStatusChanged && !updateReason.trim()) {
      showError('Please provide an adjustment update reason for changing status');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        sku: sku.trim().toUpperCase(),
        barcode: barcode.trim(),
        metal: metal.toUpperCase(),
        purity: purity.trim(),
        grossWeight: Number(grossWeight),
        stoneWeight: Number(stoneWeight) || 0,
        otherWeight: Number(otherWeight) || 0,
        purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
        sellingPrice: sellingPrice ? Number(sellingPrice) : undefined,
        makingCharge: makingCharge ? Number(makingCharge) : undefined,
        wastage: wastage ? Number(wastage) : undefined,
        status: status.toUpperCase(),
        location: location.trim() || undefined,
        updateReason: isStatusChanged ? updateReason.trim() : undefined,
      };

      const res = await fetch(`${API_URL}/inventory/${editingItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to update stock');
      }

      showSuccess('Stock item adjusted successfully!');
      setEditOpen(false);
      void fetchInventory();
    } catch (err: any) {
      showError(err.message || 'Error updating stock details');
    } finally {
      setSaving(false);
    }
  };

  // Chronological trace log viewer
  const handleOpenHistory = async (item: InventoryRow) => {
    setHistoryItemId(item.barcode);
    setHistoryLogs([]);
    setHistoryOpen(true);
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_URL}/inventory/${item.id}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load item movement logs');
      const data = await res.json();
      setHistoryLogs(data);
    } catch (err: any) {
      showError(err.message || 'Error loading stock movements');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleApplyFilters = () => {
    setAppliedStatus(filterStatus);
    setAppliedMetal(filterMetal);
    setIsFilterOpen(false);
  };

  const handleClearFilters = () => {
    setFilterStatus('');
    setFilterMetal('');
    setAppliedStatus('');
    setAppliedMetal('');
    setIsFilterOpen(false);
  };

  const columns: GridColDef<InventoryRow>[] = [
    { field: 'sku', headerName: 'SKU', width: 120, sortable: true },
    { field: 'barcode', headerName: 'Barcode', width: 130, sortable: true },
    {
      field: 'productName',
      headerName: 'Product',
      width: 180,
      valueGetter: (_, row) => row.productId?.name || 'Custom Product',
    },
    { field: 'metal', headerName: 'Metal', width: 90, sortable: true },
    { field: 'purity', headerName: 'Purity', width: 80, sortable: true },
    {
      field: 'grossWeight',
      headerName: 'Gross Wt',
      width: 100,
      renderCell: (params) => <WeightDisplay weight={params.value as number} />,
    },
    {
      field: 'netWeight',
      headerName: 'Net Wt',
      width: 100,
      renderCell: (params) => <WeightDisplay weight={params.value as number} />,
    },
    {
      field: 'sellingPrice',
      headerName: 'Price Tag',
      width: 120,
      renderCell: (params) => (
        params.value !== undefined ? <MoneyDisplay amount={params.value as number} /> : <Typography variant="caption" color="text.disabled">—</Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => <StatusChip status={params.value as string} />,
    },
    { field: 'location', headerName: 'Location', width: 110, sortable: true },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            startIcon={<EditIcon />}
            onClick={() => handleOpenEditDialog(params.row)}
            disabled={!hasPermission('inventory.edit')}
          >
            Adjust
          </Button>
          <Button
            size="small"
            color="secondary"
            startIcon={<HistoryIcon />}
            onClick={() => handleOpenHistory(params.row)}
          >
            Trace
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Stock Inventory"
        subtitle="Manage jewelry barcodes, serialized stock states, weights, and locations"
        action={
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <IconButton onClick={fetchInventory} color="inherit">
              <RefreshIcon />
            </IconButton>
            <Button
              startIcon={<FilterIcon />}
              variant="outlined"
              color="inherit"
              onClick={() => setIsFilterOpen(true)}
            >
              Filter
            </Button>
            {hasPermission('inventory.create') && (
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                onClick={handleOpenReceiveDialog}
              >
                Receive Stock
              </Button>
            )}
          </Box>
        }
      />

      <Box sx={{ mb: 3 }}>
        <SearchInput
          placeholder="Search by Barcode, SKU, or Location..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </Box>

      <Card sx={{ boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
        <CardContent sx={{ p: 0 }}>
          <DataTable
            rows={items}
            columns={columns}
            loading={loading}
            emptyTitle="Inventory is Empty"
            emptyDescription="Cataloged serialized stock units and retail storage locations will be shown here."
          />
        </CardContent>
      </Card>

      {/* Advanced Filters Drawer */}
      <FilterPanel
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onClear={handleClearFilters}
        onApply={handleApplyFilters}
      >
        <TextField
          select
          fullWidth
          label="Stock Status"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <MenuItem value="">All Statuses</MenuItem>
          <MenuItem value="IN_STOCK">In Stock</MenuItem>
          <MenuItem value="SOLD">Sold</MenuItem>
          <MenuItem value="RESERVED">Reserved</MenuItem>
          <MenuItem value="RETURNED">Returned</MenuItem>
          <MenuItem value="DAMAGED">Damaged</MenuItem>
        </TextField>

        <TextField
          select
          fullWidth
          label="Metal Type"
          value={filterMetal}
          onChange={(e) => setFilterMetal(e.target.value)}
        >
          <MenuItem value="">All Metals</MenuItem>
          <MenuItem value="GOLD">Gold</MenuItem>
          <MenuItem value="SILVER">Silver</MenuItem>
          <MenuItem value="PLATINUM">Platinum</MenuItem>
        </TextField>
      </FilterPanel>

      {/* Receive Stock Dialog */}
      <Dialog open={receiveOpen} onClose={() => !saving && setReceiveOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSaveReceive}>
          <DialogTitle sx={{ fontFamily: '"Playfair Display", serif', fontWeight: 600 }}>
            Receive & Intake Serialized Stock Unit
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid size={{ xs: 12 }}>
                <Autocomplete
                  options={productsList}
                  getOptionLabel={(option) => `${option.name} (${option.barcode}) — SKU: ${option.sku}`}
                  loading={loadingProducts}
                  value={selectedProduct}
                  onChange={(_, val) => handleSelectProductOption(val)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Cataloged Design Product"
                      placeholder="Type barcode or name..."
                      required
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  label="SKU Code"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  disabled
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  label="Barcode Number"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  disabled
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  label="Metal Type"
                  value={metal}
                  disabled
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  label="Purity Value"
                  value={purity}
                  disabled
                />
              </Grid>
              <Grid size={{ xs: 4 }}>
                <TextField
                  fullWidth
                  label="Gross Weight (g)"
                  type="number"
                  value={grossWeight}
                  onChange={(e) => setGrossWeight(e.target.value)}
                  slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                  required
                />
              </Grid>
              <Grid size={{ xs: 4 }}>
                <TextField
                  fullWidth
                  label="Stone Weight (g)"
                  type="number"
                  value={stoneWeight}
                  onChange={(e) => setStoneWeight(e.target.value)}
                  slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                />
              </Grid>
              <Grid size={{ xs: 4 }}>
                <TextField
                  fullWidth
                  label="Other Weight (g)"
                  type="number"
                  value={otherWeight}
                  onChange={(e) => setOtherWeight(e.target.value)}
                  slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  label="Purchase Price (₹)"
                  type="number"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  label="Selling Price Tag (₹)"
                  type="number"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  label="Making Charge (₹/gram)"
                  type="number"
                  value={makingCharge}
                  onChange={(e) => setMakingCharge(e.target.value)}
                  slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  label="Wastage Charge (%)"
                  type="number"
                  value={wastage}
                  onChange={(e) => setWastage(e.target.value)}
                  slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  select
                  fullWidth
                  label="Stock State"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <MenuItem value="IN_STOCK">In Stock</MenuItem>
                  <MenuItem value="RESERVED">Reserved</MenuItem>
                  <MenuItem value="DAMAGED">Damaged</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  label="Storage Location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Safe Box B2"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2.5, gap: 1 }}>
            <Button onClick={() => setReceiveOpen(false)} variant="outlined" color="inherit" disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'Intaking...' : 'Receive Stock'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Adjust / Edit Stock Dialog */}
      <Dialog open={editOpen} onClose={() => !saving && setEditOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSaveEdit}>
          <DialogTitle sx={{ fontFamily: '"Playfair Display", serif', fontWeight: 600 }}>
            Adjust Stock Item Unit details
          </DialogTitle>
          <DialogContent>
            {editingItem && (
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                    Adjusting: {editingItem.productId?.name} ({editingItem.barcode})
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    label="SKU Code"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    label="Barcode"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    select
                    fullWidth
                    label="Metal"
                    value={metal}
                    onChange={(e) => setMetal(e.target.value)}
                    required
                  >
                    <MenuItem value="GOLD">Gold</MenuItem>
                    <MenuItem value="SILVER">Silver</MenuItem>
                    <MenuItem value="PLATINUM">Platinum</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    label="Purity"
                    value={purity}
                    onChange={(e) => setPurity(e.target.value)}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <TextField
                    fullWidth
                    label="Gross Weight (g)"
                    type="number"
                    value={grossWeight}
                    onChange={(e) => setGrossWeight(e.target.value)}
                    slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <TextField
                    fullWidth
                    label="Stone Weight (g)"
                    type="number"
                    value={stoneWeight}
                    onChange={(e) => setStoneWeight(e.target.value)}
                    slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                  />
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <TextField
                    fullWidth
                    label="Other Weight (g)"
                    type="number"
                    value={otherWeight}
                    onChange={(e) => setOtherWeight(e.target.value)}
                    slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    label="Purchase Price (₹)"
                    type="number"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    label="Selling Price (₹)"
                    type="number"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    label="Making Charge (₹/g)"
                    type="number"
                    value={makingCharge}
                    onChange={(e) => setMakingCharge(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    label="Wastage Charge (%)"
                    type="number"
                    value={wastage}
                    onChange={(e) => setWastage(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    select
                    fullWidth
                    label="Stock Status State"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    required
                  >
                    <MenuItem value="IN_STOCK">In Stock</MenuItem>
                    <MenuItem value="SOLD">Sold</MenuItem>
                    <MenuItem value="RESERVED">Reserved</MenuItem>
                    <MenuItem value="RETURNED">Returned</MenuItem>
                    <MenuItem value="DAMAGED">Damaged</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    label="Storage Location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </Grid>

                {editingItem.status !== status && (
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Reason for status update adjustment"
                      value={updateReason}
                      onChange={(e) => setUpdateReason(e.target.value)}
                      placeholder="e.g. Scratched setting, moved to returns drawer"
                      required
                      multiline
                      rows={2}
                      helperText="Required when transitioning stock state statuses"
                    />
                  </Grid>
                )}
              </Grid>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2.5, gap: 1 }}>
            <Button onClick={() => setEditOpen(false)} variant="outlined" color="inherit" disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'Adjusting...' : 'Save Adjustments'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* History timeline movement Drawer */}
      <Drawer
        anchor="right"
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        slotProps={{
          paper: { sx: { width: { xs: '100%', sm: 400 }, p: 3 } },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontFamily: '"Playfair Display", serif', fontWeight: 600 }}>
              Movement History Trace
            </Typography>
            <IconButton onClick={() => setHistoryOpen(false)} size="small">
              &times;
            </IconButton>
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 3 }}>
            Barcode: {historyItemId}
          </Typography>

          {loadingHistory ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
              <CircularProgress size={30} />
            </Box>
          ) : historyLogs.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', p: 2, textAlign: 'center' }}>
              No status logs cataloged for this item.
            </Typography>
          ) : (
            <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1, pl: 2, borderLeft: '2px solid rgba(197, 168, 128, 0.2)', ml: 1, mt: 1 }}>
              {historyLogs.map((log) => (
                <Box key={log._id} sx={{ position: 'relative', mb: 3 }}>
                  {/* Custom timeline bullet dot */}
                  <Box
                    sx={{
                      position: 'absolute',
                      left: -24,
                      top: 4,
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor:
                        log.newStatus === 'IN_STOCK'
                          ? 'success.main'
                          : log.newStatus === 'SOLD'
                          ? 'error.main'
                          : log.newStatus === 'RETURNED'
                          ? 'info.main'
                          : 'warning.main',
                      boxShadow: '0 0 0 4px rgba(255,255,255,1), 0 0 0 6px rgba(197, 168, 128, 0.15)',
                    }}
                  />
                  <Box sx={{ pl: 0.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          px: 1,
                          py: 0.25,
                          borderRadius: 0.5,
                          bgcolor: 'action.hover',
                          color: 'primary.main',
                          fontSize: '0.7rem',
                        }}
                      >
                        {log.previousStatus} &rarr; {log.newStatus}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                        <DateDisplay date={log.createdAt} />
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
                      {log.reason}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                      By: {log.userId?.name || 'System'} ({log.userId?.email || 'N/A'})
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Drawer>
    </Box>
  );
};

export default InventoryPage;
