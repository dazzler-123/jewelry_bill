import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from '../schemas/product.schema';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';

interface CreateProductDto {
  sku: string;
  barcode: string;
  name: string;
  category: string;
  metal: string;
  purity: string;
  description?: string;
  defaultMakingCharge?: number;
  defaultWastage?: number;
  stoneDetails?: string;
}

interface EditProductDto {
  name: string;
  category: string;
  metal: string;
  purity: string;
  description?: string;
  defaultMakingCharge?: number;
  defaultWastage?: number;
  stoneDetails?: string;
  active: boolean;
}

@Controller('products')
@UseGuards(AuthGuard, PermissionsGuard)
export class ProductsController {
  constructor(@InjectModel(Product.name) private productModel: Model<Product>) {}

  @Get()
  @RequirePermissions('billing.view')
  async getAll(
    @Query('query') query?: string,
    @Query('metal') metal?: string,
    @Query('active') active?: string,
  ) {
    const filter: any = {};

    if (query && query.trim()) {
      const trimmed = query.trim();
      filter.$or = [
        { name: { $regex: trimmed, $options: 'i' } },
        { sku: { $regex: trimmed, $options: 'i' } },
        { barcode: { $regex: trimmed, $options: 'i' } },
      ];
    }

    if (metal && metal.trim()) {
      filter.metal = metal.toUpperCase();
    }

    if (active !== undefined && active !== '') {
      filter.active = active === 'true';
    }

    return this.productModel.find(filter).sort({ name: 1 });
  }

  @Get(':id')
  @RequirePermissions('billing.view')
  async getOne(@Param('id') id: string) {
    const product = await this.productModel.findById(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  @Post()
  @RequirePermissions('inventory.create')
  async create(@Body() body: CreateProductDto) {
    const { sku, barcode, name, category, metal, purity } = body;

    if (!sku || !barcode || !name || !category || !metal || !purity) {
      throw new BadRequestException('sku, barcode, name, category, metal, and purity are required');
    }

    // Check unique constraints
    const existingSku = await this.productModel.findOne({ sku: sku.trim().toUpperCase() });
    if (existingSku) {
      throw new ConflictException(`SKU ${sku} already exists`);
    }

    const existingBarcode = await this.productModel.findOne({ barcode: barcode.trim() });
    if (existingBarcode) {
      throw new ConflictException(`Barcode ${barcode} already exists`);
    }

    return this.productModel.create({
      ...body,
      sku: sku.trim().toUpperCase(),
      barcode: barcode.trim(),
    });
  }

  @Put(':id')
  @RequirePermissions('inventory.edit')
  async edit(@Param('id') id: string, @Body() body: EditProductDto) {
    const { name, category, metal, purity } = body;

    if (!name || !category || !metal || !purity) {
      throw new BadRequestException('name, category, metal, and purity are required');
    }

    const product = await this.productModel.findById(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    product.name = name;
    product.category = category;
    product.metal = metal.toUpperCase();
    product.purity = purity;
    product.description = body.description;
    product.defaultMakingCharge = body.defaultMakingCharge || 0;
    product.defaultWastage = body.defaultWastage || 0;
    product.stoneDetails = body.stoneDetails;
    product.active = body.active !== undefined ? body.active : true;

    return product.save();
  }
}
