import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MetalRate } from '../schemas/metal-rate.schema';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';

interface CreateMetalRateDto {
  metalType: string;
  purity: string;
  ratePerGram: number;
  effectiveDate?: string;
}

interface UpdateMetalRateDto {
  ratePerGram?: number;
  effectiveDate?: string;
}

import { AuditLog } from '../schemas/audit-log.schema';

@Controller('metal-rates')
@UseGuards(AuthGuard, PermissionsGuard)
export class MetalRatesController {
  constructor(
    @InjectModel(MetalRate.name) private metalRateModel: Model<MetalRate>,
    @InjectModel(AuditLog.name) private auditModel: Model<AuditLog>,
  ) {}

  @Get('current')
  @RequirePermissions('metalRate.view')
  async getCurrentRates() {
    const now = new Date();
    
    // Aggregate to get the latest active rate for each (metalType, purity) combination
    const currentRates = await this.metalRateModel.aggregate([
      { $match: { effectiveDate: { $lte: now } } },
      { $sort: { metalType: 1, purity: 1, effectiveDate: -1 } },
      {
        $group: {
          _id: { metalType: '$metalType', purity: '$purity' },
          id: { $first: '$_id' },
          ratePerGram: { $first: '$ratePerGram' },
          effectiveDate: { $first: '$effectiveDate' },
          updatedBy: { $first: '$updatedBy' },
          createdAt: { $first: '$createdAt' },
          updatedAt: { $first: '$updatedAt' },
        },
      },
      {
        $project: {
          _id: 0,
          id: 1,
          metalType: '$_id.metalType',
          purity: '$_id.purity',
          ratePerGram: 1,
          effectiveDate: 1,
          updatedBy: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    // Populate updatedBy user details for ease of display in frontend
    const populatedRates = await this.metalRateModel.populate(currentRates, {
      path: 'updatedBy',
      select: 'name email',
    });

    return populatedRates;
  }

  @Get('history')
  @RequirePermissions('metalRate.view')
  async getRateHistory(
    @Query('metalType') metalType?: string,
    @Query('purity') purity?: string,
  ) {
    const filter: any = {};
    if (metalType) {
      filter.metalType = metalType.toUpperCase();
    }
    if (purity) {
      filter.purity = purity.trim();
    }

    return this.metalRateModel
      .find(filter)
      .populate('updatedBy', 'name email')
      .sort({ effectiveDate: -1, createdAt: -1 });
  }

  @Post()
  @RequirePermissions('metalRate.edit')
  async create(
    @Body() body: CreateMetalRateDto,
    @Req() req: any,
  ) {
    const { metalType, purity, ratePerGram } = body;
    const effectiveDateStr = body.effectiveDate || new Date().toISOString();
    const effectiveDate = new Date(effectiveDateStr);

    if (!metalType || !purity || ratePerGram === undefined) {
      throw new BadRequestException('metalType, purity, and ratePerGram are required');
    }

    const normalizedMetalType = metalType.toUpperCase();
    const validMetals = ['GOLD', 'SILVER', 'PLATINUM', 'OTHER'];
    if (!validMetals.includes(normalizedMetalType)) {
      throw new BadRequestException(`Invalid metalType. Must be one of ${validMetals.join(', ')}`);
    }

    if (ratePerGram < 0) {
      throw new BadRequestException('Rate per gram cannot be negative');
    }

    if (isNaN(effectiveDate.getTime())) {
      throw new BadRequestException('Invalid effective date format');
    }

    // Check for unique combo
    const existing = await this.metalRateModel.findOne({
      metalType: normalizedMetalType,
      purity: purity.trim(),
      effectiveDate,
    });

    if (existing) {
      throw new ConflictException(
        `A rate is already defined for ${normalizedMetalType} (${purity}) at this exact effective date/time`,
      );
    }

    const newRate = await this.metalRateModel.create({
      metalType: normalizedMetalType,
      purity: purity.trim(),
      ratePerGram,
      effectiveDate,
      updatedBy: new Types.ObjectId(req.user?.sub),
    });

    // Write audit log trail
    const creatorId = new Types.ObjectId(req.user?.sub);
    await this.auditModel.create({
      userId: creatorId,
      action: 'CREATE_METAL_RATE',
      entityType: 'MetalRate',
      entityId: newRate._id,
      after: newRate.toObject(),
      reason: 'Created new metal rate entry',
    });

    return this.metalRateModel
      .findById(newRate._id)
      .populate('updatedBy', 'name email');
  }

  @Put(':id')
  @RequirePermissions('metalRate.edit')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateMetalRateDto,
    @Req() req: any,
  ) {
    const rate = await this.metalRateModel.findById(id);
    if (!rate) {
      throw new NotFoundException('Metal rate entry not found');
    }

    const beforeState = rate.toObject();

    const now = new Date();
    const isPast = rate.effectiveDate.getTime() <= now.getTime();

    if (body.effectiveDate) {
      const newEffectiveDate = new Date(body.effectiveDate);
      if (isNaN(newEffectiveDate.getTime())) {
        throw new BadRequestException('Invalid effective date format');
      }

      if (isPast && newEffectiveDate.getTime() !== rate.effectiveDate.getTime()) {
        throw new BadRequestException(
          'Cannot modify the effective date of an already active rate in the past/present',
        );
      }

      if (!isPast) {
        // Prevent setting a future rate to a past date
        if (newEffectiveDate.getTime() <= now.getTime()) {
          throw new BadRequestException('Cannot set a future rate to a past or current date');
        }
        rate.effectiveDate = newEffectiveDate;
      }
    }

    if (body.ratePerGram !== undefined) {
      if (body.ratePerGram < 0) {
        throw new BadRequestException('Rate per gram cannot be negative');
      }
      rate.ratePerGram = body.ratePerGram;
    }

    rate.updatedBy = new Types.ObjectId(req.user?.sub) as any;
    await rate.save();

    // Write audit log trail
    const editorId = new Types.ObjectId(req.user?.sub);
    await this.auditModel.create({
      userId: editorId,
      action: 'UPDATE_METAL_RATE',
      entityType: 'MetalRate',
      entityId: rate._id,
      before: beforeState,
      after: rate.toObject(),
      reason: 'Modified metal rate price per gram',
    });

    return this.metalRateModel
      .findById(rate._id)
      .populate('updatedBy', 'name email');
  }

  @Delete(':id')
  @RequirePermissions('metalRate.edit')
  async delete(@Param('id') id: string, @Req() req: any) {
    const rate = await this.metalRateModel.findById(id);
    if (!rate) {
      throw new NotFoundException('Metal rate entry not found');
    }

    const beforeState = rate.toObject();
    await this.metalRateModel.findByIdAndDelete(id);

    // Write audit log trail
    const deleterId = new Types.ObjectId(req.user?.sub);
    await this.auditModel.create({
      userId: deleterId,
      action: 'DELETE_METAL_RATE',
      entityType: 'MetalRate',
      entityId: rate._id,
      before: beforeState,
      reason: 'Removed metal rate entry',
    });

    return { success: true, message: 'Metal rate deleted successfully' };
  }
}
