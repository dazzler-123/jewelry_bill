import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InventoryItem } from '../schemas/inventory-item.schema';
import { InventoryHistory } from '../schemas/inventory-history.schema';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';

interface CreateInventoryDto {
  productId: string;
  sku: string;
  barcode: string;
  metal: string;
  purity: string;
  grossWeight: number;
  stoneWeight?: number;
  otherWeight?: number;
  purchasePrice?: number;
  sellingPrice?: number;
  makingCharge?: number;
  wastage?: number;
  status: string;
  location?: string;
}

interface EditInventoryDto {
  sku: string;
  barcode: string;
  metal: string;
  purity: string;
  grossWeight: number;
  stoneWeight?: number;
  otherWeight?: number;
  purchasePrice?: number;
  sellingPrice?: number;
  makingCharge?: number;
  wastage?: number;
  status: string;
  location?: string;
  updateReason?: string;
}

import { AuditLog } from '../schemas/audit-log.schema';

@Controller('inventory')
@UseGuards(AuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(
    @InjectModel(InventoryItem.name) private inventoryItemModel: Model<InventoryItem>,
    @InjectModel(InventoryHistory.name) private historyModel: Model<InventoryHistory>,
    @InjectModel(AuditLog.name) private auditModel: Model<AuditLog>,
  ) {}

  @Get()
  @RequirePermissions('billing.view')
  async getAll(
    @Query('query') query?: string,
    @Query('status') status?: string,
    @Query('metal') metal?: string,
  ) {
    const filter: any = {};

    if (query && query.trim()) {
      const trimmed = query.trim();
      filter.$or = [
        { sku: { $regex: trimmed, $options: 'i' } },
        { barcode: { $regex: trimmed, $options: 'i' } },
        { location: { $regex: trimmed, $options: 'i' } },
      ];
    }

    if (status && status.trim()) {
      filter.status = status.toUpperCase();
    }

    if (metal && metal.trim()) {
      filter.metal = metal.toUpperCase();
    }

    return this.inventoryItemModel
      .find(filter)
      .populate('productId')
      .sort({ createdAt: -1 });
  }

  // Barcode autocomplete endpoint (preserves compatibility with POS sales checkout)
  @Get('search')
  @RequirePermissions('inventory.sell')
  async search(@Query('query') query?: string) {
    if (!query) {
      return this.inventoryItemModel
        .find({ status: 'IN_STOCK' })
        .limit(20)
        .populate('productId');
    }

    const trimmed = query.trim();
    return this.inventoryItemModel
      .find({
        status: 'IN_STOCK',
        $or: [
          { barcode: { $regex: trimmed, $options: 'i' } },
          { sku: { $regex: trimmed, $options: 'i' } },
        ],
      })
      .limit(20)
      .populate('productId');
  }

  @Get(':id')
  @RequirePermissions('billing.view')
  async getOne(@Param('id') id: string) {
    const item = await this.inventoryItemModel.findById(id).populate('productId');
    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }
    return item;
  }

  @Get(':id/history')
  @RequirePermissions('billing.view')
  async getHistory(@Param('id') id: string) {
    return this.historyModel
      .find({ itemId: new Types.ObjectId(id) })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
  }

  @Post()
  @RequirePermissions('inventory.create')
  async create(@Body() body: CreateInventoryDto, @Req() req: any) {
    const creatorId = new Types.ObjectId(req.user?.sub);
    const { productId, sku, barcode, metal, purity, grossWeight } = body;

    if (!productId || !sku || !barcode || !metal || !purity || grossWeight === undefined) {
      throw new BadRequestException('productId, sku, barcode, metal, purity, and grossWeight are required');
    }

    // Check duplicate barcodes in inventory
    const existing = await this.inventoryItemModel.findOne({ barcode: barcode.trim() });
    if (existing) {
      throw new ConflictException(`Inventory item with barcode ${barcode} already exists`);
    }

    const gross = Number(grossWeight) || 0;
    const stone = Number(body.stoneWeight) || 0;
    const other = Number(body.otherWeight) || 0;
    const netWeight = gross - stone - other;

    const newItem = await this.inventoryItemModel.create({
      ...body,
      barcode: barcode.trim(),
      netWeight,
    });

    // Write trace movements log in history
    await this.historyModel.create({
      itemId: newItem._id,
      previousStatus: 'IN_STOCK',
      newStatus: newItem.status || 'IN_STOCK',
      reason: 'Initial stock intake cataloging',
      userId: creatorId,
    });

    // Write audit log trail
    // Write audit log trail
    await this.auditModel.create({
      userId: creatorId,
      action: 'CREATE_INVENTORY',
      entityType: 'InventoryItem',
      entityId: newItem._id,
      after: newItem.toObject ? newItem.toObject() : newItem,
      reason: 'Initial stock intake cataloging',
    });

    return newItem;
  }

  @Put(':id')
  @RequirePermissions('inventory.edit')
  async edit(@Param('id') id: string, @Body() body: EditInventoryDto, @Req() req: any) {
    const editorId = new Types.ObjectId(req.user?.sub);
    const { sku, barcode, metal, purity, grossWeight, status } = body;

    if (!sku || !barcode || !metal || !purity || grossWeight === undefined || !status) {
      throw new BadRequestException('sku, barcode, metal, purity, grossWeight, and status are required');
    }

    const item = await this.inventoryItemModel.findById(id);
    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    const beforeState = item.toObject ? item.toObject() : item;

    // Check barcode duplicates
    if (barcode.trim() !== item.barcode) {
      const existing = await this.inventoryItemModel.findOne({ barcode: barcode.trim() });
      if (existing) {
        throw new ConflictException(`Barcode ${barcode} is already assigned to another item`);
      }
    }

    const oldStatus = item.status;
    const newStatus = status.toUpperCase();

    const gross = Number(grossWeight) || 0;
    const stone = Number(body.stoneWeight) || 0;
    const other = Number(body.otherWeight) || 0;
    const netWeight = gross - stone - other;

    item.sku = sku;
    item.barcode = barcode.trim();
    item.metal = metal;
    item.purity = purity;
    item.grossWeight = gross;
    item.stoneWeight = stone;
    item.otherWeight = other;
    item.netWeight = netWeight;
    item.purchasePrice = body.purchasePrice;
    item.sellingPrice = body.sellingPrice;
    item.makingCharge = body.makingCharge;
    item.wastage = body.wastage;
    item.status = newStatus;
    item.location = body.location;
    await item.save();

    // Log status transitions in InventoryHistory
    if (oldStatus !== newStatus) {
      await this.historyModel.create({
        itemId: item._id,
        previousStatus: oldStatus,
        newStatus: newStatus,
        reason: body.updateReason || 'Manual adjustment update',
        userId: editorId,
      });
    }

    // Write audit log trail
    await this.auditModel.create({
      userId: editorId,
      action: 'UPDATE_INVENTORY',
      entityType: 'InventoryItem',
      entityId: item._id,
      before: beforeState,
      after: item.toObject ? item.toObject() : item,
      reason: body.updateReason || 'Manual adjustment update',
    });

    return item;
  }
}
