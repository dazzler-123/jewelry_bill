import { API_URL } from '../../config';
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Box,
  Typography,
  Tabs,
  Tab,
  MenuItem,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { PageHeader } from '../../components/shared';
import { useSnackbar } from '../../context/SnackbarContext';
import { useAuth } from '../../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const { token } = useAuth();
  const { showSuccess, showError } = useSnackbar();

  // Active Settings Tab state
  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);

  // SHOP SETTINGS
  const [shopName, setShopName] = useState('Aurum Jewelry House');
  const [address, setAddress] = useState("102, Gold Palace Mansion, Jeweler's Bazar, Mumbai, MH - 400001");
  const [phone, setPhone] = useState('9876543210');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [email, setEmail] = useState('billing@aurum.com');
  const [gstIn, setGstIn] = useState('27AAAAA1111A1Z1');
  const [pan, setPan] = useState('ABCDE1234F');
  const [website, setWebsite] = useState('www.aurumjewelry.com');
  const [logoUrl, setLogoUrl] = useState('');
  const [footerMessage, setFooterMessage] = useState('Thank you for choosing Aurum Fine Jewelry!');
  const [terms, setTerms] = useState('1. Goods once sold will not be taken back or exchanged.\n2. Subject to Mumbai Jurisdiction.');

  // BANK SETTINGS (Nested under Shop)
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [branchName, setBranchName] = useState('');

  // INVOICE SETTINGS
  const [prefix, setPrefix] = useState('INV-2026-');
  const [startingNumber, setStartingNumber] = useState(1001);
  const [invoiceFormat, setInvoiceFormat] = useState('A4');
  const [currency, setCurrency] = useState('INR');
  const [decimalPrecision, setDecimalPrecision] = useState(2);
  const [weightPrecision, setWeightPrecision] = useState(3);

  // TAX SETTINGS
  const [cgstRate, setCgstRate] = useState(1.5);
  const [sgstRate, setSgstRate] = useState(1.5);
  const [igstRate, setIgstRate] = useState(3.0);

  // BILLING SETTINGS
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState('UPI');
  const [defaultDuePeriod, setDefaultDuePeriod] = useState(15);
  const [defaultMakingCharge, setDefaultMakingCharge] = useState(0);
  const [defaultWastage, setDefaultWastage] = useState(0);
  const [roundingRule, setRoundingRule] = useState('HALF_UP');

  // UI SETTINGS
  const [themePreference, setThemePreference] = useState('light');
  const [densityPreference, setDensityPreference] = useState('comfortable');
  const [invoiceTemplate, setInvoiceTemplate] = useState('CLASSIC');
  const [whatsappTemplate, setWhatsappTemplate] = useState('');

  useEffect(() => {
    if (!token) return;
    const fetchSettings = async () => {
      try {
        const res = await fetch(API_URL + '/bills/settings/active', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch configurations');
        const data = await res.json();
        
        // Shop Details
        setShopName(data.name || '');
        setAddress(data.address || '');
        setPhone(data.phone || '');
        setAlternatePhone(data.alternatePhone || '');
        setEmail(data.email || '');
        setGstIn(data.gstin || '');
        setPan(data.pan || '');
        setWebsite(data.website || '');
        setLogoUrl(data.logoUrl || '');
        setFooterMessage(data.footerMessage || '');
        setTerms(data.termsAndConditions || '');
        
        // Bank Details
        setBankName(data.bankName || '');
        setAccountNumber(data.accountNumber || '');
        setIfscCode(data.ifscCode || '');
        setBranchName(data.branchName || '');
        setWhatsappTemplate(data.whatsappMessageTemplate || '');

        // Invoice settings
        setPrefix(data.invoicePrefix || '');
        setStartingNumber(data.startingNumber !== undefined ? data.startingNumber : 1001);
        setInvoiceFormat(data.invoiceFormat || 'A4');
        setCurrency(data.currency || 'INR');
        setDecimalPrecision(data.decimalPrecision !== undefined ? data.decimalPrecision : 2);
        setWeightPrecision(data.weightPrecision !== undefined ? data.weightPrecision : 3);

        // Taxes
        setCgstRate(data.cgstRate !== undefined ? data.cgstRate : 1.5);
        setSgstRate(data.sgstRate !== undefined ? data.sgstRate : 1.5);
        setIgstRate(data.igstRate !== undefined ? data.igstRate : 3.0);

        // Billing
        setDefaultPaymentMethod(data.defaultPaymentMethod || 'UPI');
        setDefaultDuePeriod(data.defaultDuePeriod !== undefined ? data.defaultDuePeriod : 15);
        setDefaultMakingCharge(data.defaultMakingCharge !== undefined ? data.defaultMakingCharge : 0);
        setDefaultWastage(data.defaultWastage !== undefined ? data.defaultWastage : 0);
        setRoundingRule(data.roundingRule || 'HALF_UP');

        // UI
        setThemePreference(data.themePreference || 'light');
        setDensityPreference(data.densityPreference || 'comfortable');
        setInvoiceTemplate(data.invoiceTemplate || 'CLASSIC');
      } catch (err: any) {
        showError(err.message || 'Error loading system preferences');
      }
    };
    fetchSettings();
  }, [token]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(API_URL + '/bills/settings/active', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: shopName,
          address,
          phone,
          alternatePhone,
          email,
          gstin: gstIn,
          pan,
          website,
          logoUrl,
          footerMessage,
          termsAndConditions: terms,
          bankName,
          accountNumber,
          ifscCode,
          branchName,
          whatsappMessageTemplate: whatsappTemplate,
          
          invoicePrefix: prefix,
          startingNumber,
          invoiceFormat,
          currency,
          decimalPrecision,
          weightPrecision,

          cgstRate,
          sgstRate,
          igstRate,

          defaultPaymentMethod,
          defaultDuePeriod,
          defaultMakingCharge,
          defaultWastage,
          roundingRule,

          themePreference,
          densityPreference,
          invoiceTemplate,
        }),
      });

      if (!res.ok) throw new Error('Failed to save configurations');
      showSuccess('System configurations successfully saved and audited!');
    } catch (err: any) {
      showError(err.message || 'Error saving preference modifications');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <PageHeader title="Centralized Configurations Control" subtitle="Configure shop details, taxes ledger rates, invoice formats, default settings, and theme preferences" />

      {/* Tabs list bar */}
      <Card sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)}>
            <Tab label="Shop Profile Details" />
            <Tab label="Invoice Formats Settings" />
            <Tab label="GST Tax Rates Settings" />
            <Tab label="Billing defaults" />
            <Tab label="Theme & UI spacing" />
          </Tabs>
        </Box>
      </Card>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          {/* TAB 0: Shop Profile details */}
          {activeTab === 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Establishment Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Shop Name"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      disabled={saving}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="GSTIN ID"
                      value={gstIn}
                      onChange={(e) => setGstIn(e.target.value)}
                      disabled={saving}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="PAN Card Number"
                      value={pan}
                      onChange={(e) => setPan(e.target.value)}
                      disabled={saving}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Contact Phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={saving}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Alternate Contact Phone"
                      value={alternatePhone}
                      onChange={(e) => setAlternatePhone(e.target.value)}
                      disabled={saving}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={saving}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Website Domain"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      disabled={saving}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Branding Logo Path URL"
                      placeholder="e.g. /assets/logo.png"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      disabled={saving}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Invoice Footer Text Message"
                      placeholder="Thank you for choosing Aurum Fine Jewelry"
                      value={footerMessage}
                      onChange={(e) => setFooterMessage(e.target.value)}
                      disabled={saving}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Establishment Address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      disabled={saving}
                    />
                  </Grid>
                </Grid>

                <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
                  Direct Bank settlement details
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Bank Name"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      disabled={saving}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Account Number"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      disabled={saving}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="IFSC Code"
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value)}
                      disabled={saving}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Branch Name"
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      disabled={saving}
                    />
                  </Grid>
                </Grid>

                <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
                  Invoice Policies & Notifications
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Invoice Terms and Conditions Policy"
                      value={terms}
                      onChange={(e) => setTerms(e.target.value)}
                      disabled={saving}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="WhatsApp Notification template structure"
                      value={whatsappTemplate}
                      onChange={(e) => setWhatsappTemplate(e.target.value)}
                      disabled={saving}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* TAB 1: Invoice settings */}
          {activeTab === 1 && (
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Invoice Formatting preferences
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Invoice Number Prefix"
                      value={prefix}
                      onChange={(e) => setPrefix(e.target.value)}
                      disabled={saving}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Starting Invoice Sequence Number"
                      type="number"
                      value={startingNumber}
                      onChange={(e) => setStartingNumber(parseInt(e.target.value, 10))}
                      disabled={saving}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      select
                      fullWidth
                      label="Invoice Page Format"
                      value={invoiceFormat}
                      onChange={(e) => setInvoiceFormat(e.target.value)}
                      disabled={saving}
                    >
                      <MenuItem value="A4">A4 Portrait Sheet</MenuItem>
                      <MenuItem value="80mm">80mm Thermal Slip</MenuItem>
                      <MenuItem value="58mm">58mm Thermal Slip</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      select
                      fullWidth
                      label="Currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      disabled={saving}
                    >
                      <MenuItem value="INR">INR (₹) Indian Rupee</MenuItem>
                      <MenuItem value="USD">USD ($) US Dollar</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      select
                      fullWidth
                      label="Decimal Price Precision"
                      value={decimalPrecision}
                      onChange={(e) => setDecimalPrecision(parseInt(e.target.value, 10))}
                      disabled={saving}
                    >
                      <MenuItem value={0}>0 Decimals (No cents)</MenuItem>
                      <MenuItem value={2}>2 Decimals (Standard cent)</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      select
                      fullWidth
                      label="Metal Weight Precision"
                      value={weightPrecision}
                      onChange={(e) => setWeightPrecision(parseInt(e.target.value, 10))}
                      disabled={saving}
                    >
                      <MenuItem value={2}>2 Decimals (e.g. 10.25g)</MenuItem>
                      <MenuItem value={3}>3 Decimals (Standard gold 10.250g)</MenuItem>
                    </TextField>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* TAB 2: GST settings */}
          {activeTab === 2 && (
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  GST Tax Settings (Jewelry Rates defaults)
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      fullWidth
                      label="Central GST (CGST %)"
                      type="number"
                      value={cgstRate}
                      onChange={(e) => setCgstRate(parseFloat(e.target.value))}
                      disabled={saving}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      fullWidth
                      label="State GST (SGST %)"
                      type="number"
                      value={sgstRate}
                      onChange={(e) => setSgstRate(parseFloat(e.target.value))}
                      disabled={saving}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      fullWidth
                      label="Integrated GST (IGST %)"
                      type="number"
                      value={igstRate}
                      onChange={(e) => setIgstRate(parseFloat(e.target.value))}
                      disabled={saving}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* TAB 3: Billing defaults */}
          {activeTab === 3 && (
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  POS Billing and Checkout Defaults
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      select
                      fullWidth
                      label="Default Payment Method"
                      value={defaultPaymentMethod}
                      onChange={(e) => setDefaultPaymentMethod(e.target.value)}
                      disabled={saving}
                    >
                      <MenuItem value="UPI">UPI (GPay, PhonePe, Paytm)</MenuItem>
                      <MenuItem value="CASH">CASH Settlement</MenuItem>
                      <MenuItem value="CARD">Debit / Credit Card</MenuItem>
                      <MenuItem value="BANK_TRANSFER">Bank Net-Banking</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Default Invoice Due Period (Days)"
                      type="number"
                      value={defaultDuePeriod}
                      onChange={(e) => setDefaultDuePeriod(parseInt(e.target.value, 10))}
                      disabled={saving}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Default Making Charge (₹/g or %)"
                      type="number"
                      value={defaultMakingCharge}
                      onChange={(e) => setDefaultMakingCharge(parseFloat(e.target.value))}
                      disabled={saving}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Default Wastage (Grams or %)"
                      type="number"
                      value={defaultWastage}
                      onChange={(e) => setDefaultWastage(parseFloat(e.target.value))}
                      disabled={saving}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      select
                      fullWidth
                      label="Billing Rounding Rule"
                      value={roundingRule}
                      onChange={(e) => setRoundingRule(e.target.value)}
                      disabled={saving}
                    >
                      <MenuItem value="HALF_UP">Nearest Integer (e.g. ₹9.50 {"->"} ₹10.00)</MenuItem>
                      <MenuItem value="ROUND_UP">Round Up Always (e.g. ₹9.10 {"->"} ₹10.00)</MenuItem>
                      <MenuItem value="ROUND_DOWN">Round Down Always (e.g. ₹9.90 {"->"} ₹9.00)</MenuItem>
                    </TextField>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* TAB 4: UI & Layout defaults */}
          {activeTab === 4 && (
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Application Skin & Spacing Preferences
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      select
                      fullWidth
                      label="App Theme Mode"
                      value={themePreference}
                      onChange={(e) => setThemePreference(e.target.value)}
                      disabled={saving}
                    >
                      <MenuItem value="light">Aurum Light Elegant Mode</MenuItem>
                      <MenuItem value="dark">Aurum Dark Premium Mode</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      select
                      fullWidth
                      label="UI Density Spacing"
                      value={densityPreference}
                      onChange={(e) => setDensityPreference(e.target.value)}
                      disabled={saving}
                    >
                      <MenuItem value="comfortable">Comfortable Grid Density</MenuItem>
                      <MenuItem value="compact">Compact Grid Density</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      select
                      fullWidth
                      label="Invoice Template Theme style"
                      value={invoiceTemplate}
                      onChange={(e) => setInvoiceTemplate(e.target.value)}
                      disabled={saving}
                    >
                      <MenuItem value="CLASSIC">Classic Corporate Template</MenuItem>
                      <MenuItem value="MODERN">Modern Minimalist Template</MenuItem>
                    </TextField>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            size="large"
            disabled={saving}
          >
            {saving ? 'Saving preferences...' : 'Save and Audit Configuration'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SettingsPage;
