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
  Switch,
  FormControlLabel,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from '../../context/SnackbarContext';
import {
  PageHeader,
  DataTable,
  SearchInput,
  FilterPanel,
  DateDisplay,
} from '../../components/shared';
import type { GridColDef } from '@mui/x-data-grid';

interface ProductRow {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  metal: string;
  purity: string;
  description?: string;
  defaultMakingCharge: number;
  defaultWastage: number;
  stoneDetails?: string;
  active: boolean;
  createdAt: string;
}

export const ProductsPage: React.FC = () => {
  const { token, hasPermission } = useAuth();
  const { showSuccess, showError } = useSnackbar();

  // Data states
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMetal, setFilterMetal] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Applied filter copies for fetching
  const [appliedMetal, setAppliedMetal] = useState('');
  const [appliedActive, setAppliedActive] = useState('');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);

  // Form Field States
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [metal, setMetal] = useState('GOLD');
  const [purity, setPurity] = useState('22K');
  const [description, setDescription] = useState('');
  const [defaultMakingCharge, setDefaultMakingCharge] = useState('0');
  const [defaultWastage, setDefaultWastage] = useState('0');
  const [stoneDetails, setStoneDetails] = useState('');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (searchQuery.trim()) queryParams.append('query', searchQuery.trim());
      if (appliedMetal) queryParams.append('metal', appliedMetal);
      if (appliedActive) queryParams.append('active', appliedActive);

      const res = await fetch(`${API_URL}/products?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('Failed to fetch products');
      const data = await res.json();
      setProducts(
        data.map((p: any) => ({
          id: p._id || p.id,
          sku: p.sku,
          barcode: p.barcode,
          name: p.name,
          category: p.category,
          metal: p.metal,
          purity: p.purity,
          description: p.description,
          defaultMakingCharge: p.defaultMakingCharge || 0,
          defaultWastage: p.defaultWastage || 0,
          stoneDetails: p.stoneDetails,
          active: p.active !== undefined ? p.active : true,
          createdAt: p.createdAt,
        }))
      );
    } catch (err: any) {
      showError(err.message || 'Error fetching products list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      void fetchProducts();
    }
  }, [token, searchQuery, appliedMetal, appliedActive]);

  // Handle open create/edit dialog
  const handleOpenDialog = (prod: ProductRow | null = null) => {
    if (prod) {
      setEditingProduct(prod);
      setSku(prod.sku);
      setBarcode(prod.barcode);
      setName(prod.name);
      setCategory(prod.category);
      setMetal(prod.metal);
      setPurity(prod.purity);
      setDescription(prod.description || '');
      setDefaultMakingCharge(prod.defaultMakingCharge.toString());
      setDefaultWastage(prod.defaultWastage.toString());
      setStoneDetails(prod.stoneDetails || '');
      setActive(prod.active);
    } else {
      setEditingProduct(null);
      setSku('');
      setBarcode('');
      setName('');
      setCategory('');
      setMetal('GOLD');
      setPurity('22K');
      setDescription('');
      setDefaultMakingCharge('0');
      setDefaultWastage('0');
      setStoneDetails('');
      setActive(true);
    }
    setDialogOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category.trim() || !purity.trim()) {
      showError('Name, Category, and Purity are required.');
      return;
    }

    if (!editingProduct && (!sku.trim() || !barcode.trim())) {
      showError('SKU and Barcode are required for new products.');
      return;
    }

    setSaving(true);
    try {
      const url = editingProduct
        ? `${API_URL}/products/${editingProduct.id}`
        : API_URL + '/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const payload = {
        name: name.trim(),
        category: category.trim(),
        metal: metal.toUpperCase(),
        purity: purity.trim(),
        description: description.trim() || undefined,
        defaultMakingCharge: Number(defaultMakingCharge) || 0,
        defaultWastage: Number(defaultWastage) || 0,
        stoneDetails: stoneDetails.trim() || undefined,
        active,
        ...(editingProduct ? {} : { sku: sku.trim().toUpperCase(), barcode: barcode.trim() }),
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save product');
      }

      showSuccess(editingProduct ? 'Product updated successfully' : 'Product cataloged successfully');
      setDialogOpen(false);
      void fetchProducts();
    } catch (err: any) {
      showError(err.message || 'Error saving product configurations');
    } finally {
      setSaving(false);
    }
  };

  // Toggle active status directly
  const handleToggleActive = async (row: ProductRow) => {
    try {
      const res = await fetch(`${API_URL}/products/${row.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: row.name,
          category: row.category,
          metal: row.metal,
          purity: row.purity,
          description: row.description,
          defaultMakingCharge: row.defaultMakingCharge,
          defaultWastage: row.defaultWastage,
          stoneDetails: row.stoneDetails,
          active: !row.active,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to update status');
      }

      showSuccess(`Product ${!row.active ? 'activated' : 'deactivated'} successfully`);
      void fetchProducts();
    } catch (err: any) {
      showError(err.message || 'Error updating product status');
    }
  };

  // Filter handlers
  const handleApplyFilters = () => {
    setAppliedMetal(filterMetal);
    setAppliedActive(filterActive);
    setIsFilterOpen(false);
  };

  const handleClearFilters = () => {
    setFilterMetal('');
    setFilterActive('');
    setAppliedMetal('');
    setAppliedActive('');
    setIsFilterOpen(false);
  };

  const columns: GridColDef<ProductRow>[] = [
    { field: 'sku', headerName: 'SKU Code', width: 140, sortable: true },
    { field: 'barcode', headerName: 'Barcode', width: 140, sortable: true },
    { field: 'name', headerName: 'Product Name', width: 220, sortable: true },
    { field: 'category', headerName: 'Category', width: 120, sortable: true },
    { field: 'metal', headerName: 'Metal', width: 100, sortable: true },
    { field: 'purity', headerName: 'Purity', width: 90, sortable: true },
    {
      field: 'defaultMakingCharge',
      headerName: 'Making Charge',
      width: 140,
      valueFormatter: (value) => `₹${Number(value || 0).toLocaleString('en-IN')}/g`,
    },
    {
      field: 'defaultWastage',
      headerName: 'Wastage',
      width: 110,
      valueFormatter: (value) => `${value || 0}%`,
    },
    {
      field: 'active',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => (
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={params.value as boolean}
              onChange={() => handleToggleActive(params.row)}
              disabled={!hasPermission('inventory.edit')}
            />
          }
          label={params.value ? 'Active' : 'Deactivated'}
          slotProps={{
            typography: { sx: { fontSize: '0.75rem', fontWeight: 600 } },
          }}
        />
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Configured On',
      width: 150,
      renderCell: (params) => <DateDisplay date={params.value as string} />,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 110,
      sortable: false,
      renderCell: (params) => (
        <Button
          size="small"
          startIcon={<EditIcon />}
          color="primary"
          onClick={() => handleOpenDialog(params.row)}
          disabled={!hasPermission('inventory.edit')}
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Products Catalog"
        subtitle="Manage jewelry designs, codes, wastage configurations and categories"
        action={
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <IconButton onClick={fetchProducts} color="inherit">
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
                onClick={() => handleOpenDialog(null)}
              >
                Catalog Product
              </Button>
            )}
          </Box>
        }
      />

      <Box sx={{ mb: 3 }}>
        <SearchInput
          placeholder="Search by SKU, Barcode, or Product Name..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </Box>

      <Card sx={{ boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
        <CardContent sx={{ p: 0 }}>
          <DataTable
            rows={products}
            columns={columns}
            loading={loading}
            emptyTitle="No Products Configured"
            emptyDescription="Registered catalog products details and configurations will be shown here."
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
          label="Metal Type"
          value={filterMetal}
          onChange={(e) => setFilterMetal(e.target.value)}
        >
          <MenuItem value="">All Metals</MenuItem>
          <MenuItem value="GOLD">Gold</MenuItem>
          <MenuItem value="SILVER">Silver</MenuItem>
          <MenuItem value="PLATINUM">Platinum</MenuItem>
        </TextField>

        <TextField
          select
          fullWidth
          label="Status"
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value)}
        >
          <MenuItem value="">All Statuses</MenuItem>
          <MenuItem value="true">Active Only</MenuItem>
          <MenuItem value="false">Deactivated Only</MenuItem>
        </TextField>
      </FilterPanel>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSaveProduct}>
          <DialogTitle sx={{ fontFamily: '"Playfair Display", serif', fontWeight: 600 }}>
            {editingProduct ? 'Modify Catalog Product' : 'Catalog New Design Product'}
          </DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  label="SKU Code"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  disabled={saving || !!editingProduct}
                  placeholder="e.g. RING-GOLD-01"
                  required
                  slotProps={{ htmlInput: { style: { textTransform: 'uppercase' } } }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  label="Barcode"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  disabled={saving || !!editingProduct}
                  placeholder="e.g. BAR-RING-01"
                  required
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Product Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={saving}
                  placeholder="e.g. Solitaire Diamond Ring"
                  required
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  label="Category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={saving}
                  placeholder="e.g. Rings, Necklaces"
                  required
                />
              </Grid>
              <Grid size={{ xs: 3 }}>
                <TextField
                  select
                  fullWidth
                  label="Metal"
                  value={metal}
                  onChange={(e) => setMetal(e.target.value)}
                  disabled={saving}
                  required
                >
                  <MenuItem value="GOLD">Gold</MenuItem>
                  <MenuItem value="SILVER">Silver</MenuItem>
                  <MenuItem value="PLATINUM">Platinum</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 3 }}>
                <TextField
                  fullWidth
                  label="Purity"
                  value={purity}
                  onChange={(e) => setPurity(e.target.value)}
                  disabled={saving}
                  placeholder="e.g. 22K, 950"
                  required
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  label="Default Making Charge (₹/gram)"
                  type="number"
                  value={defaultMakingCharge}
                  onChange={(e) => setDefaultMakingCharge(e.target.value)}
                  disabled={saving}
                  slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  label="Default Wastage (%)"
                  type="number"
                  value={defaultWastage}
                  onChange={(e) => setDefaultWastage(e.target.value)}
                  disabled={saving}
                  slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Stone Details"
                  value={stoneDetails}
                  onChange={(e) => setStoneDetails(e.target.value)}
                  disabled={saving}
                  placeholder="e.g. Diamonds 0.25ct, VVS1"
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Description / Design notes"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={saving}
                  placeholder="Design details and notes"
                  multiline
                  rows={2}
                />
              </Grid>
              {editingProduct && (
                <Grid size={{ xs: 12 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={active}
                        onChange={(e) => setActive(e.target.checked)}
                        disabled={saving}
                      />
                    }
                    label="Status Active"
                  />
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2.5, gap: 1 }}>
            <Button onClick={() => setDialogOpen(false)} variant="outlined" color="inherit" disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'Saving...' : 'Save Product'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default ProductsPage;
