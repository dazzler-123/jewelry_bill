import { API_URL } from '../../config';
import React, { useState, useEffect, useRef } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Divider,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  FormControlLabel,
  Checkbox,
  Paper,
  InputAdornment,
  Autocomplete,
  Alert,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ShoppingBag as ShoppingBagIcon,
  Person as PersonIcon,
  QrCodeScanner as ScannerIcon,
  Payment as PaymentIcon,
  Save as SaveIcon,
  Keyboard as KeyboardIcon,
} from '@mui/icons-material';
import { PageHeader, MoneyDisplay, WeightDisplay } from '../../components/shared';
import { useSnackbar } from '../../context/SnackbarContext';
import { useAuth } from '../../context/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  calculateInvoiceItem,
  calculateInvoiceSummary,
  roundMoney,
} from '../../services/billing/calculation/calculation.engine';
import type {
  ItemCalculationInput,
  MetalType,
  MakingChargeType,
  WastageType,
  StoneChargeType,
  DiscountType,
} from '../../services/billing/calculation/calculation.engine';

// Interfaces matching backend models
interface Customer {
  id: string;
  _id: string;
  customerCode: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  outstandingBalance: number;
}

interface InventoryItem {
  _id: string;
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
  makingCharge?: number;
  wastage?: number;
}

interface ActiveRate {
  metalType: string;
  purity: string;
  ratePerGram: number;
}

interface BillLineItem {
  id: string;
  productName: string;
  sku: string;
  barcode?: string;
  productId?: string;
  input: ItemCalculationInput;
}

export const BillingPage: React.FC = () => {
  const { token } = useAuth();
  const { showSuccess, showError } = useSnackbar();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Mode state: SEARCH or CREATE for customer
  const [customerMode, setCustomerMode] = useState<'search' | 'create'>('search');

  // Customer states
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // New Customer Form States
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustCity, setNewCustCity] = useState('');
  const [newCustState, setNewCustState] = useState('');
  const [newCustPincode, setNewCustPincode] = useState('');
  const [newCustGstin, setNewCustGstin] = useState('');

  // Inventory Search states
  const [barcodeSearchQuery, setBarcodeSearchQuery] = useState('');
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [searchingInventory, setSearchingInventory] = useState(false);

  // Active Spot Rates
  const [activeRates, setActiveRates] = useState<ActiveRate[]>([]);

  // Bill parameters
  const [isInterState, setIsInterState] = useState(false);
  const [billItems, setBillItems] = useState<BillLineItem[]>([]);
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    // Default due date to 30 days from now
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });

  // Split Payment states
  const [payCash, setPayCash] = useState('0');
  const [payUpi, setPayUpi] = useState('0');
  const [payCard, setPayCard] = useState('0');
  const [payBank, setPayBank] = useState('0');
  const [payCheque, setPayCheque] = useState('0');
  const [payOther, setPayOther] = useState('0');

  // Add Item form states
  const [productName, setProductName] = useState('');
  const [sku, setSku] = useState('');
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [scannedProductId, setScannedProductId] = useState('');
  const [metalType, setMetalType] = useState<MetalType>('GOLD');
  const [purity, setPurity] = useState('18K');
  const [customPurity, setCustomPurity] = useState('');
  const [grossWeight, setGrossWeight] = useState('');
  const [stoneWeight, setStoneWeight] = useState('0');
  const [otherWeight, setOtherWeight] = useState('0');
  const [manualMetalRate, setManualMetalRate] = useState('');

  // Making Charges
  const [makingChargeType, setMakingChargeType] = useState<MakingChargeType>('PERCENTAGE');
  const [makingChargeRate, setMakingChargeRate] = useState('15');

  // Wastage
  const [wastageType, setWastageType] = useState<WastageType>('NONE');
  const [wastageRate, setWastageRate] = useState('0');

  // Stone Charges
  const [stoneChargeType, setStoneChargeType] = useState<StoneChargeType>('FIXED');
  const [stoneRate, setStoneRate] = useState('0');
  const [stonePieces, setStonePieces] = useState('0');
  const [stoneWeightCarats, setStoneWeightCarats] = useState('0');

  // Other Charges
  const [otherCharge, setOtherCharge] = useState('0');

  // Discount
  const [discountType, setDiscountType] = useState<DiscountType>('PERCENTAGE');
  const [discountRate, setDiscountRate] = useState('0');

  // Input Refs for fast keyboard shortcuts / navigation focus
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const productNameRef = useRef<HTMLInputElement>(null);

  // Fetch current active spot rates
  const fetchActiveRates = async () => {
    try {
      if (!navigator.onLine) {
        const cached = JSON.parse(localStorage.getItem('cached_metal_rates') || '[]');
        if (cached.length > 0) {
          setActiveRates(cached);
        }
        return;
      }

      const res = await fetch(API_URL + '/metal-rates/current', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch active metal rates');
      const data = await res.json();
      setActiveRates(data);
      localStorage.setItem('cached_metal_rates', JSON.stringify(data));
    } catch (err: any) {
      console.error('Error fetching rates:', err.message);
      const cached = JSON.parse(localStorage.getItem('cached_metal_rates') || '[]');
      if (cached.length > 0) {
        setActiveRates(cached);
      }
    }
  };

  useEffect(() => {
    if (token) {
      fetchActiveRates();
    }
  }, [token]);

  // Pre-select customer if customerId query param is provided
  useEffect(() => {
    const customerId = searchParams.get('customerId');
    if (token && customerId) {
      const fetchAndSelectCustomer = async () => {
        try {
          if (!navigator.onLine) {
            const cache = JSON.parse(localStorage.getItem('cached_customers_list') || '[]');
            const cachedCust = cache.find((c: any) => c._id === customerId);
            if (cachedCust) {
              setSelectedCustomer(cachedCust);
              setCustomerMode('search');
              showSuccess(`Selected customer (Offline): ${cachedCust.name}`);
            }
            return;
          }

          const res = await fetch(`${API_URL}/customers/${customerId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error('Customer not found');
          const data = await res.json();
          setSelectedCustomer(data);
          setCustomerMode('search');
          showSuccess(`Selected customer: ${data.name}`);
        } catch (err: any) {
          console.error('Error pre-selecting customer:', err.message);
          const cache = JSON.parse(localStorage.getItem('cached_customers_list') || '[]');
          const cachedCust = cache.find((c: any) => c._id === customerId);
          if (cachedCust) {
            setSelectedCustomer(cachedCust);
            setCustomerMode('search');
          }
        }
      };
      fetchAndSelectCustomer();
    }
  }, [token, searchParams]);

  // Autocomplete customer searching
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (customerSearchQuery.trim().length >= 2) {
        setSearchingCustomer(true);
        try {
          if (!navigator.onLine) {
            const cache = JSON.parse(localStorage.getItem('cached_customers_list') || '[]');
            const query = customerSearchQuery.toLowerCase();
            const filtered = cache.filter((c: any) =>
              c.name.toLowerCase().includes(query) ||
              c.phone.includes(query) ||
              (c.customerCode && c.customerCode.toLowerCase().includes(query))
            );
            setCustomersList(filtered);
            setSearchingCustomer(false);
            return;
          }

          const res = await fetch(
            `${API_URL}/customers/search?query=${encodeURIComponent(customerSearchQuery)}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (!res.ok) throw new Error('Failed to search customers');
          const data = await res.json();
          setCustomersList(data);

          // Save to cache backup list
          const cache = JSON.parse(localStorage.getItem('cached_customers_list') || '[]');
          const merged = [...cache];
          data.forEach((newCust: any) => {
            if (!merged.some((c: any) => c._id === newCust._id)) {
              merged.push(newCust);
            }
          });
          localStorage.setItem('cached_customers_list', JSON.stringify(merged.slice(-200)));
        } catch (err: any) {
          showError(err.message || 'Error searching customers');
        } finally {
          setSearchingCustomer(false);
        }
      } else {
        setCustomersList([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [customerSearchQuery, token]);

  // Autocomplete inventory item barcode/SKU searching
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (barcodeSearchQuery.trim().length >= 2) {
        setSearchingInventory(true);
        try {
          if (!navigator.onLine) {
            const cache = JSON.parse(localStorage.getItem('cached_inventory_list') || '[]');
            const query = barcodeSearchQuery.toLowerCase();
            const filtered = cache.filter((item: any) =>
              item.sku.toLowerCase().includes(query) ||
              item.barcode.toLowerCase().includes(query) ||
              item.productId.name.toLowerCase().includes(query)
            );
            setInventoryList(filtered);
            setSearchingInventory(false);
            return;
          }

          const res = await fetch(
            `${API_URL}/inventory/search?query=${encodeURIComponent(barcodeSearchQuery)}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (!res.ok) throw new Error('Failed to search inventory');
          const data = await res.json();
          setInventoryList(data);

          // Save to cache backup list
          const cache = JSON.parse(localStorage.getItem('cached_inventory_list') || '[]');
          const merged = [...cache];
          data.forEach((newItem: any) => {
            if (!merged.some((i: any) => i._id === newItem._id)) {
              merged.push(newItem);
            }
          });
          localStorage.setItem('cached_inventory_list', JSON.stringify(merged.slice(-200)));
        } catch (err: any) {
          console.error(err.message);
        } finally {
          setSearchingInventory(false);
        }
      } else {
        setInventoryList([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [barcodeSearchQuery, token]);

  // Handle key shortcuts: Ctrl+Enter (F9) to Add Item, Ctrl+Shift+Enter (F10) to Post Invoice
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F9' || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault();
        handleAddLineItem();
      } else if (e.key === 'F10' || (e.ctrlKey && e.shiftKey && e.key === 'Enter')) {
        e.preventDefault();
        handleGenerateInvoice();
      } else if (e.key === 'Escape') {
        // Clear forms or focus back to scanner
        barcodeInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    productName,
    grossWeight,
    stoneWeight,
    otherWeight,
    manualMetalRate,
    makingChargeType,
    makingChargeRate,
    wastageType,
    wastageRate,
    stoneChargeType,
    stoneRate,
    stonePieces,
    stoneWeightCarats,
    otherCharge,
    discountType,
    discountRate,
    billItems,
    selectedCustomer,
    newCustName,
    newCustPhone,
    payCash,
    payUpi,
    payCard,
    payBank,
    payCheque,
    payOther,
    dueDate,
  ]);

  // Autofill rate when metal type/purity changes
  useEffect(() => {
    const activePurity = purity === 'CUSTOM' ? customPurity : purity;
    const rateMatch = activeRates.find(
      (r) => r.metalType === metalType && r.purity.toUpperCase() === activePurity.toUpperCase()
    );
    if (rateMatch) {
      setManualMetalRate(rateMatch.ratePerGram.toString());
    } else {
      if (metalType === 'GOLD') {
        if (purity === '24K') setManualMetalRate('7850');
        else if (purity === '22K') setManualMetalRate('7195');
        else if (purity === '18K') setManualMetalRate('5890');
        else setManualMetalRate('7000');
      } else if (metalType === 'SILVER') {
        setManualMetalRate('92.5');
      } else if (metalType === 'PLATINUM') {
        setManualMetalRate('3650');
      } else {
        setManualMetalRate('0');
      }
    }
  }, [metalType, purity, customPurity, activeRates]);

  // Purity pre-selected values
  const getPurityOptions = (metal: MetalType) => {
    switch (metal) {
      case 'GOLD':
        return ['24K', '22K', '20K', '18K', '14K', 'CUSTOM'];
      case 'SILVER':
        return ['999', 'Sterling 925', 'CUSTOM'];
      case 'PLATINUM':
        return ['950', '990', 'CUSTOM'];
      default:
        return ['CUSTOM'];
    }
  };

  // Pre-fill fields from selected barcode/SKU scanner autocomplete result
  const handleSelectInventoryItem = (item: InventoryItem) => {
    setProductName(item.productId.name || 'Jewelry Product');
    setSku(item.sku);
    setScannedBarcode(item.barcode);
    setScannedProductId(item.productId._id);
    setMetalType(item.metal as MetalType);

    const purities = getPurityOptions(item.metal as MetalType);
    if (purities.includes(item.purity)) {
      setPurity(item.purity);
      setCustomPurity('');
    } else {
      setPurity('CUSTOM');
      setCustomPurity(item.purity);
    }

    setGrossWeight(item.grossWeight.toString());
    setStoneWeight(item.stoneWeight.toString());
    setOtherWeight(item.otherWeight.toString());

    if (item.makingCharge !== undefined) {
      setMakingChargeType('PER_GRAM');
      setMakingChargeRate(item.makingCharge.toString());
    }
    if (item.wastage !== undefined) {
      setWastageType('PERCENTAGE');
      setWastageRate(item.wastage.toString());
    }

    showSuccess(`Autofilled details for: ${item.productId.name} (${item.barcode})`);

    // Clear search query
    setBarcodeSearchQuery('');

    // Focus product name for rapid flow
    productNameRef.current?.focus();
  };

  const handleDirectBarcodeScan = async (query: string) => {
    if (!query) return;
    setSearchingInventory(true);
    try {
      let data = [];
      if (!navigator.onLine) {
        const cache = JSON.parse(localStorage.getItem('cached_inventory_list') || '[]');
        const q = query.toLowerCase();
        data = cache.filter((item: any) =>
          item.sku.toLowerCase() === q || item.barcode.toLowerCase() === q
        );
      } else {
        const res = await fetch(
          `${API_URL}/inventory/search?query=${encodeURIComponent(query)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error('Failed to query barcode item');
        data = await res.json();

        // Add to cache list
        const cache = JSON.parse(localStorage.getItem('cached_inventory_list') || '[]');
        const merged = [...cache];
        data.forEach((newItem: any) => {
          if (!merged.some((i: any) => i._id === newItem._id)) {
            merged.push(newItem);
          }
        });
        localStorage.setItem('cached_inventory_list', JSON.stringify(merged.slice(-200)));
      }

      if (data && data.length > 0) {
        // Find exact match on barcode or sku
        let match = data.find((item: any) => item.barcode.toLowerCase() === query.toLowerCase());
        if (!match) {
          match = data.find((item: any) => item.sku.toLowerCase() === query.toLowerCase()) || data[0];
        }

        const item = match as InventoryItem;

        // Check duplicate barcode in current bill items
        if (billItems.some((bItem) => bItem.barcode === item.barcode)) {
          showError(`Item with barcode ${item.barcode} is already added to this bill`);
          setBarcodeSearchQuery('');
          return;
        }

        // Resolve metal rate
        const activePurity = item.purity;
        const rateMatch = activeRates.find(
          (r) => r.metalType === item.metal && r.purity.toUpperCase() === activePurity.toUpperCase()
        );
        let metalRate = 0;
        if (rateMatch) {
          metalRate = rateMatch.ratePerGram;
        } else {
          // fallback rates matching the component's fallback
          if (item.metal === 'GOLD') {
            if (activePurity === '24K') metalRate = 7850;
            else if (activePurity === '22K') metalRate = 7195;
            else if (activePurity === '18K') metalRate = 5890;
            else metalRate = 7000;
          } else if (item.metal === 'SILVER') {
            metalRate = 92.5;
          } else if (item.metal === 'PLATINUM') {
            metalRate = 3650;
          }
        }

        // Build item input details
        const itemInput: ItemCalculationInput = {
          metal: item.metal as MetalType,
          purity: item.purity,
          grossWeight: item.grossWeight || 0,
          stoneWeight: item.stoneWeight || 0,
          otherWeight: item.otherWeight || 0,
          metalRate,
          makingChargeType: item.makingCharge !== undefined ? 'PER_GRAM' : 'FIXED',
          makingChargeRate: item.makingCharge || 0,
          wastageType: item.wastage !== undefined ? 'PERCENTAGE' : 'NONE',
          wastageRate: item.wastage || 0,
          stoneChargeType: 'FIXED',
          stoneRate: 0,
          stonePieces: 0,
          stoneWeightCarats: 0,
          otherCharge: 0,
          discountType: 'PERCENTAGE',
          discountRate: 0,
        };

        const newItem: BillLineItem = {
          id: Math.random().toString(36).substr(2, 9),
          productName: item.productId.name || 'Jewelry Product',
          sku: item.sku,
          barcode: item.barcode,
          productId: item.productId._id,
          input: itemInput,
        };

        setBillItems((prev) => [...prev, newItem]);
        showSuccess(`Added to Bill: ${item.productId.name} (${item.barcode})`);

        // Clear search query
        setBarcodeSearchQuery('');
      } else {
        showError(`No in-stock item found for barcode "${query}"`);
      }
    } catch (err: any) {
      showError(err.message || 'Error processing barcode scan');
    } finally {
      setSearchingInventory(false);
      // Keep input focused for next scan
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 50);
    }
  };

  // Compile calculations preview of the active form inputs
  const getFormInput = (): ItemCalculationInput => {
    const finalPurity = purity === 'CUSTOM' ? customPurity.trim() || 'Custom' : purity;
    return {
      metal: metalType,
      purity: finalPurity,
      grossWeight: Number(grossWeight) || 0,
      stoneWeight: Number(stoneWeight) || 0,
      otherWeight: Number(otherWeight) || 0,
      metalRate: Number(manualMetalRate) || 0,
      makingChargeType,
      makingChargeRate: Number(makingChargeRate) || 0,
      wastageType,
      wastageRate: Number(wastageRate) || 0,
      stoneChargeType,
      stoneRate: Number(stoneRate) || 0,
      stonePieces: Number(stonePieces) || 0,
      stoneWeightCarats: Number(stoneWeightCarats) || 0,
      otherCharge: Number(otherCharge) || 0,
      discountType,
      discountRate: Number(discountRate) || 0,
    };
  };

  const currentItemPreview = calculateInvoiceItem(getFormInput(), isInterState);

  // Sum up all added items
  const invoiceSummary = calculateInvoiceSummary({
    items: billItems.map((item) => item.input),
    isInterState,
  });

  // Calculate split payment totals
  const totalPaid =
    (Number(payCash) || 0) +
    (Number(payUpi) || 0) +
    (Number(payCard) || 0) +
    (Number(payBank) || 0) +
    (Number(payCheque) || 0) +
    (Number(payOther) || 0);

  const remainingDue = Math.max(0, roundMoney(invoiceSummary.finalAmount - totalPaid));

  // Add Item to Line items list
  const handleAddLineItem = () => {
    if (!productName.trim()) {
      showError('Please enter a product name/description');
      productNameRef.current?.focus();
      return;
    }
    if (!grossWeight || Number(grossWeight) <= 0) {
      showError('Gross weight must be greater than 0');
      return;
    }
    if (currentItemPreview.netWeight <= 0) {
      showError('Net weight must be greater than 0');
      return;
    }

    const itemInput = getFormInput();
    const newItem: BillLineItem = {
      id: Math.random().toString(36).substr(2, 9),
      productName: productName.trim(),
      sku: sku.trim() || 'N/A',
      barcode: scannedBarcode || undefined,
      productId: scannedProductId || undefined,
      input: itemInput,
    };

    setBillItems([...billItems, newItem]);

    // Clear item fields but preserve rates and settings for fast repeat entry
    setProductName('');
    setSku('');
    setScannedBarcode('');
    setScannedProductId('');
    setGrossWeight('');
    setStoneWeight('0');
    setOtherWeight('0');
    setStonePieces('0');
    setStoneWeightCarats('0');
    setOtherCharge('0');
    setDiscountRate('0');

    showSuccess('Line item added');
    barcodeInputRef.current?.focus();
  };

  // Remove line item
  const handleRemoveItem = (id: string) => {
    setBillItems(billItems.filter((item) => item.id !== id));
  };

  // Post invoice to the backend
  const handleGenerateInvoice = async () => {
    if (billItems.length === 0) {
      showError('Invoice must contain at least one jewelry item');
      return;
    }

    // Customer Validation
    let customerId: string | undefined;
    let newCustomer: any | undefined;

    if (customerMode === 'search') {
      if (!selectedCustomer) {
        showError('Please select or search an existing customer');
        return;
      }
      customerId = selectedCustomer._id || selectedCustomer.id;
    } else {
      if (!newCustName.trim() || !newCustPhone.trim()) {
        showError('New customer Name and Phone are required');
        return;
      }
      newCustomer = {
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        email: newCustEmail.trim() || undefined,
        address: newCustAddress.trim() || undefined,
        city: newCustCity.trim() || undefined,
        state: newCustState.trim() || undefined,
        pincode: newCustPincode.trim() || undefined,
        gstin: newCustGstin.trim() || undefined,
      };
    }

    // Build Payments split array
    const payments = [];
    if (Number(payCash) > 0) payments.push({ method: 'CASH', amount: Number(payCash) });
    if (Number(payUpi) > 0) payments.push({ method: 'UPI', amount: Number(payUpi) });
    if (Number(payCard) > 0) payments.push({ method: 'CARD', amount: Number(payCard) });
    if (Number(payBank) > 0) payments.push({ method: 'BANK_TRANSFER', amount: Number(payBank) });
    if (Number(payCheque) > 0) payments.push({ method: 'CHEQUE', amount: Number(payCheque) });
    if (Number(payOther) > 0) payments.push({ method: 'OTHER', amount: Number(payOther) });

    const payload = {
      customerId,
      newCustomer,
      items: billItems.map((item) => ({
        productId: item.productId,
        barcode: item.barcode,
        productName: item.productName,
        sku: item.sku,
        metal: item.input.metal,
        purity: item.input.purity,
        grossWeight: item.input.grossWeight,
        stoneWeight: item.input.stoneWeight,
        otherWeight: item.input.otherWeight,
        metalRate: item.input.metalRate,
        makingChargeType: item.input.makingChargeType,
        makingChargeRate: item.input.makingChargeRate,
        wastageType: item.input.wastageType,
        wastageRate: item.input.wastageRate,
        stoneChargeType: item.input.stoneChargeType,
        stoneRate: item.input.stoneRate,
        stonePieces: item.input.stonePieces,
        stoneWeightCarats: item.input.stoneWeightCarats,
        otherCharge: item.input.otherCharge,
        discountType: item.input.discountType,
        discountRate: item.input.discountRate,
      })),
      isInterState,
      payments,
      dueDate,
      notes,
    };

    try {
      if (!navigator.onLine) {
        // Queue draft offline with clientTxId
        const clientTxId = 'offline-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
        const offlinePayload = { ...payload, clientTxId, createdAt: new Date().toISOString() };

        const queue = JSON.parse(localStorage.getItem('pending_offline_bills') || '[]');
        queue.push(offlinePayload);
        localStorage.setItem('pending_offline_bills', JSON.stringify(queue));

        showSuccess('Saved locally as a draft (Offline Mode). Synchronization will complete when connection is restored!');

        // Reset states
        resetBillingStates();
        return;
      }

      const res = await fetch(API_URL + '/bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to post bill');
      }

      const createdBill = await res.json();
      showSuccess(
        `Invoice ${createdBill.invoiceNumber} posted successfully! Grand Total: ₹${createdBill.pricingSnapshot.finalAmount.toLocaleString('en-IN')}`
      );

      resetBillingStates();
      navigate(`/bills/${createdBill._id}/preview`);
    } catch (err: any) {
      showError(err.message || 'Error creating invoice transaction');
    }
  };

  const resetBillingStates = () => {
    setBillItems([]);
    setSelectedCustomer(null);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustEmail('');
    setNewCustAddress('');
    setNewCustCity('');
    setNewCustState('');
    setNewCustPincode('');
    setNewCustGstin('');
    setNotes('');

    // Reset Payments
    setPayCash('0');
    setPayUpi('0');
    setPayCard('0');
    setPayBank('0');
    setPayCheque('0');
    setPayOther('0');

    barcodeInputRef.current?.focus();
  };

  // Synchronization manager
  const syncOfflineBills = async () => {
    const queue = JSON.parse(localStorage.getItem('pending_offline_bills') || '[]');
    if (queue.length === 0 || !navigator.onLine) return;

    showSuccess(`Syncing ${queue.length} offline invoice drafts...`);
    const remainingQueue = [];

    for (const billPayload of queue) {
      try {
        const res = await fetch(API_URL + '/bills', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(billPayload),
        });
        if (!res.ok) {
          throw new Error('Sync failed');
        }
      } catch (err) {
        remainingQueue.push(billPayload);
      }
    }

    localStorage.setItem('pending_offline_bills', JSON.stringify(remainingQueue));
    const syncedCount = queue.length - remainingQueue.length;
    if (syncedCount > 0) {
      showSuccess(`${syncedCount} offline invoice drafts synchronized successfully!`);
    }
  };

  useEffect(() => {
    if (!token) return;

    // Sync drafts on mount
    syncOfflineBills();

    const handleOnlineStatus = () => {
      syncOfflineBills();
    };

    window.addEventListener('online', handleOnlineStatus);
    return () => {
      window.removeEventListener('online', handleOnlineStatus);
    };
  }, [token]);

  return (
    <Box>
      <PageHeader
        title="Boutique POS Invoice Console"
        subtitle="Perform quick jewelry checkout and split payment recording"
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'action.hover', px: 1.5, py: 0.75, borderRadius: 1.5 }}>
            <KeyboardIcon color="primary" fontSize="small" />
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              Shortcuts: <kbd style={{ padding: '2px 4px', background: '#ccc', borderRadius: 3 }}>Ctrl+Enter</kbd> Add item | <kbd style={{ padding: '2px 4px', background: '#ccc', borderRadius: 3 }}>Ctrl+Shift+Enter</kbd> Post Bill
            </Typography>
          </Box>
        }
      />

      <Grid container spacing={3}>
        {/* Checkout Forms (Left) */}
        <Grid size={{ xs: 12, lg: 8 }}>

          {/* Customer Selection Block */}
          <Card sx={{ mb: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon color="primary" /> Customer Profile
                </Typography>
                <ToggleButtonGroup
                  value={customerMode}
                  exclusive
                  size="small"
                  onChange={(_, val) => val && setCustomerMode(val)}
                >
                  <ToggleButton value="search">Search Existing</ToggleButton>
                  <ToggleButton value="create">New Profile</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {customerMode === 'search' ? (
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <Autocomplete
                      options={customersList}
                      getOptionLabel={(option) => `${option.name} (${option.phone}) — Code: ${option.customerCode}`}
                      loading={searchingCustomer}
                      value={selectedCustomer}
                      onChange={(_, val) => setSelectedCustomer(val)}
                      inputValue={customerSearchQuery}
                      onInputChange={(_, val) => setCustomerSearchQuery(val)}
                      renderInput={(params: any) => (
                        <TextField
                          {...params}
                          label="Search Name, Phone, or Code"
                          placeholder="Type at least 2 characters..."
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {searchingCustomer ? <CircularProgress color="inherit" size={20} /> : null}
                                {params.InputProps?.endAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>
                  {selectedCustomer && (
                    <Grid size={{ xs: 12 }}>
                      <Alert severity={selectedCustomer.outstandingBalance > 0 ? "warning" : "info"} sx={{ py: 0.5 }}>
                        Outstanding Account Balance: <strong>₹{selectedCustomer.outstandingBalance.toLocaleString('en-IN')}</strong>
                      </Alert>
                    </Grid>
                  )}
                </Grid>
              ) : (
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Customer Name"
                      value={newCustName}
                      onChange={(e) => setNewCustName(e.target.value)}
                      placeholder="Full Name"
                      required
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Phone Number"
                      value={newCustPhone}
                      onChange={(e) => setNewCustPhone(e.target.value)}
                      placeholder="10-digit Mobile"
                      required
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      fullWidth
                      label="Email Address"
                      value={newCustEmail}
                      onChange={(e) => setNewCustEmail(e.target.value)}
                      placeholder="optional"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      fullWidth
                      label="GSTIN No"
                      value={newCustGstin}
                      onChange={(e) => setNewCustGstin(e.target.value)}
                      placeholder="e.g. 27AAAAA1111A1Z1"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      fullWidth
                      label="Address Details"
                      value={newCustAddress}
                      onChange={(e) => setNewCustAddress(e.target.value)}
                      placeholder="Building, Street"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      fullWidth
                      label="City"
                      value={newCustCity}
                      onChange={(e) => setNewCustCity(e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      fullWidth
                      label="State"
                      value={newCustState}
                      onChange={(e) => setNewCustState(e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      fullWidth
                      label="Zip Code"
                      value={newCustPincode}
                      onChange={(e) => setNewCustPincode(e.target.value)}
                    />
                  </Grid>
                </Grid>
              )}
            </CardContent>
          </Card>

          {/* Add Jewelry form */}
          <Card sx={{ mb: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 3 }}>

              {/* Barcode Search / Keyboard Scanner Autocomplete */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <ScannerIcon color="primary" />
                <Autocomplete
                  sx={{ flexGrow: 1 }}
                  options={inventoryList}
                  getOptionLabel={(option) => `${option.productId.name} (${option.barcode}) — SKU: ${option.sku} | Wt: ${option.grossWeight}g`}
                  loading={searchingInventory}
                  inputValue={barcodeSearchQuery}
                  onInputChange={(_, val) => setBarcodeSearchQuery(val)}
                  onChange={(_, val) => val && handleSelectInventoryItem(val)}
                  renderInput={(params: any) => (
                    <TextField
                      {...params}
                      inputRef={barcodeInputRef}
                      label="Scan Barcode or Search SKU Autocomplete"
                      placeholder="Scan or type barcode (e.g. BAR-...)"
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                          const val = barcodeSearchQuery.trim();
                          if (val) {
                            await handleDirectBarcodeScan(val);
                          }
                        }
                      }}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {searchingInventory ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps?.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <ShoppingBagIcon color="primary" /> Line Item Details
              </Typography>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 8 }}>
                  <TextField
                    fullWidth
                    inputRef={productNameRef}
                    label="Product Name / Description"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g. Gold Kada, Silver Payal"
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="SKU Tag"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="e.g. SKU-1203"
                  />
                </Grid>
              </Grid>

              {/* Metal Specs */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    select
                    label="Metal"
                    value={metalType}
                    onChange={(e) => {
                      const m = e.target.value as MetalType;
                      setMetalType(m);
                      setPurity(getPurityOptions(m)[0]);
                      setCustomPurity('');
                    }}
                  >
                    <MenuItem value="GOLD">Gold</MenuItem>
                    <MenuItem value="SILVER">Silver</MenuItem>
                    <MenuItem value="PLATINUM">Platinum</MenuItem>
                    <MenuItem value="OTHER">Other</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    select
                    label="Purity"
                    value={purity}
                    onChange={(e) => setPurity(e.target.value)}
                  >
                    {getPurityOptions(metalType).map((p) => (
                      <MenuItem key={p} value={p}>
                        {p === 'CUSTOM' ? 'Custom...' : p}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                {purity === 'CUSTOM' && (
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      fullWidth
                      label="Custom Purity"
                      value={customPurity}
                      onChange={(e) => setCustomPurity(e.target.value)}
                      placeholder="e.g. 20K or 925"
                    />
                  </Grid>
                )}
                <Grid size={{ xs: 12, sm: purity === 'CUSTOM' ? 6 : 4 }}>
                  <TextField
                    fullWidth
                    label="Spot Rate per Gram"
                    type="number"
                    value={manualMetalRate}
                    onChange={(e) => setManualMetalRate(e.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                      },
                    }}
                  />
                </Grid>
              </Grid>

              {/* Weight Grid */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField
                    fullWidth
                    label="Gross Weight"
                    type="number"
                    value={grossWeight}
                    onChange={(e) => setGrossWeight(e.target.value)}
                    placeholder="Grams"
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField
                    fullWidth
                    label="Stone Weight"
                    type="number"
                    value={stoneWeight}
                    onChange={(e) => setStoneWeight(e.target.value)}
                    placeholder="Grams"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField
                    fullWidth
                    label="Other Weight"
                    type="number"
                    value={otherWeight}
                    onChange={(e) => setOtherWeight(e.target.value)}
                    placeholder="Grams"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField
                    fullWidth
                    label="Calculated Net Weight"
                    disabled
                    value={currentItemPreview.netWeight}
                    slotProps={{
                      input: {
                        endAdornment: <InputAdornment position="end">g</InputAdornment>,
                      },
                    }}
                  />
                </Grid>
              </Grid>

              {/* Charges */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5, color: 'text.secondary' }}>
                      Making Charges
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <TextField
                        select
                        label="Type"
                        size="small"
                        sx={{ width: '45%' }}
                        value={makingChargeType}
                        onChange={(e) => setMakingChargeType(e.target.value as MakingChargeType)}
                      >
                        <MenuItem value="PERCENTAGE">% of Metal Value</MenuItem>
                        <MenuItem value="PER_GRAM">₹ per Net Gram</MenuItem>
                        <MenuItem value="FIXED">₹ Fixed Amt</MenuItem>
                      </TextField>
                      <TextField
                        label="Rate/Amt"
                        size="small"
                        type="number"
                        sx={{ flexGrow: 1 }}
                        value={makingChargeRate}
                        onChange={(e) => setMakingChargeRate(e.target.value)}
                      />
                    </Box>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5, color: 'text.secondary' }}>
                      Wastage Charges
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <TextField
                        select
                        label="Type"
                        size="small"
                        sx={{ width: '45%' }}
                        value={wastageType}
                        onChange={(e) => setWastageType(e.target.value as WastageType)}
                      >
                        <MenuItem value="NONE">None</MenuItem>
                        <MenuItem value="PERCENTAGE">% of Net Weight</MenuItem>
                        <MenuItem value="WEIGHT">Grams Weight</MenuItem>
                        <MenuItem value="FIXED">₹ Fixed Amt</MenuItem>
                      </TextField>
                      <TextField
                        label="Rate/Amt"
                        size="small"
                        type="number"
                        disabled={wastageType === 'NONE'}
                        sx={{ flexGrow: 1 }}
                        value={wastageRate}
                        onChange={(e) => setWastageRate(e.target.value)}
                      />
                    </Box>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5, color: 'text.secondary' }}>
                      Stone Charges
                    </Typography>
                    <Grid container spacing={1} sx={{ mb: 1 }}>
                      <Grid size={{ xs: 6 }}>
                        <TextField
                          select
                          fullWidth
                          label="Type"
                          size="small"
                          value={stoneChargeType}
                          onChange={(e) => setStoneChargeType(e.target.value as StoneChargeType)}
                        >
                          <MenuItem value="FIXED">Fixed Amt</MenuItem>
                          <MenuItem value="PER_CARAT">per Carat</MenuItem>
                          <MenuItem value="PER_PIECE">per Piece</MenuItem>
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <TextField
                          fullWidth
                          label="Rate"
                          size="small"
                          type="number"
                          value={stoneRate}
                          onChange={(e) => setStoneRate(e.target.value)}
                        />
                      </Grid>
                    </Grid>
                    {stoneChargeType === 'PER_CARAT' && (
                      <TextField
                        fullWidth
                        label="Carats (wt)"
                        size="small"
                        type="number"
                        value={stoneWeightCarats}
                        onChange={(e) => setStoneWeightCarats(e.target.value)}
                      />
                    )}
                    {stoneChargeType === 'PER_PIECE' && (
                      <TextField
                        fullWidth
                        label="Pieces (qty)"
                        size="small"
                        type="number"
                        value={stonePieces}
                        onChange={(e) => setStonePieces(e.target.value)}
                      />
                    )}
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5, color: 'text.secondary' }}>
                      Item-level Discount & Extras
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid size={{ xs: 6 }}>
                        <TextField
                          select
                          fullWidth
                          label="Discount Type"
                          size="small"
                          value={discountType}
                          onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                        >
                          <MenuItem value="PERCENTAGE">% Percentage</MenuItem>
                          <MenuItem value="FIXED">₹ Fixed Amt</MenuItem>
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <TextField
                          fullWidth
                          label="Disc Rate"
                          size="small"
                          type="number"
                          value={discountRate}
                          onChange={(e) => setDiscountRate(e.target.value)}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }} sx={{ mt: 1 }}>
                        <TextField
                          fullWidth
                          label="Other Charges (Fixed)"
                          size="small"
                          type="number"
                          value={otherCharge}
                          onChange={(e) => setOtherCharge(e.target.value)}
                        />
                      </Grid>
                    </Grid>
                  </Card>
                </Grid>
              </Grid>

              {/* Dynamic live preview */}
              <Box sx={{ p: 2, bgcolor: 'rgba(197, 168, 128, 0.06)', border: '1px solid', borderColor: 'primary.light', borderRadius: 1.5, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Active Item Preview Calculations</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    <MoneyDisplay amount={currentItemPreview.finalAmount} />
                  </Typography>
                </Box>
                <Grid container spacing={1} sx={{ mt: 0.5 }}>
                  <Grid size={{ xs: 4 }}>
                    <Typography variant="caption" color="text.secondary">Metal Val: </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}><MoneyDisplay amount={currentItemPreview.metalValue} /></Typography>
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <Typography variant="caption" color="text.secondary">Making: </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}><MoneyDisplay amount={currentItemPreview.makingChargeAmount} /></Typography>
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <Typography variant="caption" color="text.secondary">Wastage: </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}><MoneyDisplay amount={currentItemPreview.wastageAmount} /></Typography>
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <Typography variant="caption" color="text.secondary">Stone: </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}><MoneyDisplay amount={currentItemPreview.stoneCharge} /></Typography>
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <Typography variant="caption" color="text.secondary">Discount: </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'error.main' }}>-<MoneyDisplay amount={currentItemPreview.discountAmount} /></Typography>
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <Typography variant="caption" color="text.secondary">Tax (GST): </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}><MoneyDisplay amount={currentItemPreview.taxAmount} /></Typography>
                  </Grid>
                </Grid>
              </Box>

              <Button
                startIcon={<AddIcon />}
                variant="contained"
                color="primary"
                onClick={handleAddLineItem}
              >
                Add Item (F9)
              </Button>
            </CardContent>
          </Card>

          {/* Table of items added */}
          {billItems.length > 0 && (
            <Card sx={{ mb: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
              <CardContent sx={{ p: 0 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, p: 3, pb: 1 }}>
                  Line Items in Invoice
                </Typography>
                <TableContainer component={Paper} elevation={0}>
                  <Table>
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell>Item Description</TableCell>
                        <TableCell>Metal/Purity</TableCell>
                        <TableCell align="right">Gross/Net Wt</TableCell>
                        <TableCell align="right">Base Metal Val</TableCell>
                        <TableCell align="right">Charges</TableCell>
                        <TableCell align="right">Disc</TableCell>
                        <TableCell align="right">Tax</TableCell>
                        <TableCell align="right">Total</TableCell>
                        <TableCell align="center">Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {billItems.map((item) => {
                        const calc = calculateInvoiceItem(item.input, isInterState);
                        const chargesSum = calc.makingChargeAmount + calc.wastageAmount + calc.stoneCharge + calc.otherCharge;
                        return (
                          <TableRow key={item.id} hover>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.productName}</Typography>
                              {item.barcode && <Typography variant="caption" color="text.secondary">Barcode: {item.barcode}</Typography>}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{item.input.metal}</Typography>
                              <Typography variant="caption" color="text.secondary">{item.input.purity}</Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2"><WeightDisplay weight={item.input.grossWeight} /></Typography>
                              <Typography variant="caption" color="text.secondary">Net: <WeightDisplay weight={calc.netWeight} /></Typography>
                            </TableCell>
                            <TableCell align="right">
                              <MoneyDisplay amount={calc.metalValue} />
                            </TableCell>
                            <TableCell align="right">
                              <MoneyDisplay amount={chargesSum} />
                            </TableCell>
                            <TableCell align="right">
                              <MoneyDisplay amount={calc.discountAmount} />
                            </TableCell>
                            <TableCell align="right">
                              <MoneyDisplay amount={calc.taxAmount} />
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600 }}>
                              <MoneyDisplay amount={calc.finalAmount} />
                            </TableCell>
                            <TableCell align="center">
                              <IconButton color="error" size="small" onClick={() => handleRemoveItem(item.id)}>
                                <DeleteIcon fontSize="inherit" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}

          {/* Payment Split recording widget */}
          <Card sx={{ boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PaymentIcon color="primary" /> Split Payments Recording
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="Cash Payment"
                    type="number"
                    value={payCash}
                    onChange={(e) => setPayCash(e.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="UPI Payment"
                    type="number"
                    value={payUpi}
                    onChange={(e) => setPayUpi(e.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="Card Payment"
                    type="number"
                    value={payCard}
                    onChange={(e) => setPayCard(e.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="Bank Transfer"
                    type="number"
                    value={payBank}
                    onChange={(e) => setPayBank(e.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="Cheque Payment"
                    type="number"
                    value={payCheque}
                    onChange={(e) => setPayCheque(e.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="Other Mode"
                    type="number"
                    value={payOther}
                    onChange={(e) => setPayOther(e.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                      },
                    }}
                  />
                </Grid>
              </Grid>

              {remainingDue > 0 && (
                <Box sx={{ mt: 3, p: 2, bgcolor: 'error.lighter', border: '1px solid', borderColor: 'error.light', borderRadius: 1.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.dark', mb: 1 }}>
                    Unpaid Balance: ₹{remainingDue.toLocaleString('en-IN')}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Outstanding Due Date"
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        required
                        helperText="Provide a due date to track payment collection schedules."
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}

              <Box sx={{ mt: 2.5 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Transaction Terms or Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Special anniversary customer discount, custom sizing request..."
                />
              </Box>
            </CardContent>
          </Card>

        </Grid>

        {/* Invoice Summary (Right Panel - Sticky) */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ position: 'sticky', top: 88, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Invoice Summary
              </Typography>

              {/* Interstate jurisdiction toggle */}
              <Box sx={{ mb: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isInterState}
                      onChange={(e) => setIsInterState(e.target.checked)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>Inter-State Transaction</Typography>
                      <Typography variant="caption" color="text.secondary">Applies IGST (3%) instead of CGST+SGST (1.5% each)</Typography>
                    </Box>
                  }
                />
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Metal Value Subtotal</Typography>
                  <MoneyDisplay amount={invoiceSummary.subtotal} variant="body2" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Making Charges</Typography>
                  <MoneyDisplay amount={invoiceSummary.makingChargesTotal} variant="body2" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Wastage Charges</Typography>
                  <MoneyDisplay amount={invoiceSummary.wastageChargesTotal} variant="body2" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Stone Charges</Typography>
                  <MoneyDisplay amount={invoiceSummary.stoneChargesTotal} variant="body2" />
                </Box>
                {invoiceSummary.otherChargesTotal > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Other Charges</Typography>
                    <MoneyDisplay amount={invoiceSummary.otherChargesTotal} variant="body2" />
                  </Box>
                )}
                {invoiceSummary.discountAmount > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="error">Total Discount</Typography>
                    <Typography color="error" variant="body2">
                      - ₹{invoiceSummary.discountAmount.toFixed(2)}
                    </Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Taxable Amount</Typography>
                  <MoneyDisplay amount={invoiceSummary.taxableAmount} variant="body2" sx={{ fontWeight: 600 }} />
                </Box>

                <Divider sx={{ my: 0.5 }} />

                {isInterState ? (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">IGST (3.0%)</Typography>
                    <MoneyDisplay amount={invoiceSummary.igstTotal} variant="body2" />
                  </Box>
                ) : (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">CGST (1.5%)</Typography>
                      <MoneyDisplay amount={invoiceSummary.cgstTotal} variant="body2" />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">SGST (1.5%)</Typography>
                      <MoneyDisplay amount={invoiceSummary.sgstTotal} variant="body2" />
                    </Box>
                  </>
                )}

                <Divider sx={{ my: 1 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Grand Total</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    <MoneyDisplay amount={invoiceSummary.finalAmount} />
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Total Paid</Typography>
                  <MoneyDisplay amount={totalPaid} variant="body2" sx={{ fontWeight: 600 }} />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="error.dark">Remaining Due</Typography>
                  <Typography color="error.dark" variant="body2" sx={{ fontWeight: 700 }}>
                    ₹{remainingDue.toLocaleString('en-IN')}
                  </Typography>
                </Box>
              </Box>

              <Button
                fullWidth
                variant="contained"
                size="large"
                disabled={billItems.length === 0}
                startIcon={<SaveIcon />}
                onClick={handleGenerateInvoice}
              >
                Post Invoice (F10)
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BillingPage;
