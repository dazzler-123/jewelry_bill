import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User } from '../schemas/user.schema';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';

interface CreateUserDto {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
  isActive?: boolean;
}

interface UpdateUserDto {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
  isActive?: boolean;
}

import { AuditLog } from '../schemas/audit-log.schema';

@Controller('users')
@UseGuards(AuthGuard, PermissionsGuard)
export class UsersController {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(AuditLog.name) private auditModel: Model<AuditLog>,
  ) {}

  @Get()
  @RequirePermissions('users.view')
  async getAll() {
    return this.userModel.find({}, '-passwordHash').sort({ createdAt: -1 });
  }

  @Get(':id')
  @RequirePermissions('users.view')
  async getOne(@Param('id') id: string) {
    const user = await this.userModel.findById(id, '-passwordHash');
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  @Post()
  @RequirePermissions('users.create')
  async create(@Body() body: CreateUserDto, @Req() req: any) {
    const name = body.name;
    const email = body.email;
    const password = body.password;
    const role = body.role;
    const isActive = body.isActive;

    if (!name || !email) {
      throw new BadRequestException('Name and email are required');
    }

    const existingUser = await this.userModel.findOne({
      email: email.toLowerCase(),
    });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password || 'Cashier@1234', 10);
    const user = await this.userModel.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: role || 'CASHIER',
      isActive: isActive !== undefined ? isActive : true,
    });

    // Write audit log trail (sanitized)
    const creatorId = req.user?.sub ? new Types.ObjectId(req.user.sub) : undefined;
    await this.auditModel.create({
      userId: creatorId,
      action: 'CREATE_USER',
      entityType: 'User',
      entityId: user._id,
      after: { id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive },
      reason: 'Create system user account',
    });

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    };
  }

  @Put(':id')
  @RequirePermissions('users.edit')
  async update(@Param('id') id: string, @Body() body: UpdateUserDto, @Req() req: any) {
    const name = body.name;
    const email = body.email;
    const password = body.password;
    const role = body.role;
    const isActive = body.isActive;

    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const beforeState = { id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive };

    if (email && email.toLowerCase() !== user.email) {
      const existingUser = await this.userModel.findOne({
        email: email.toLowerCase(),
      });
      if (existingUser) {
        throw new ConflictException('Email already registered');
      }
      user.email = email.toLowerCase();
    }

    if (name) user.name = name;
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (password) {
      user.passwordHash = await bcrypt.hash(password, 10);
    }

    await user.save();

    // Write audit log trail (sanitized)
    const editorId = req.user?.sub ? new Types.ObjectId(req.user.sub) : undefined;
    await this.auditModel.create({
      userId: editorId,
      action: 'UPDATE_USER',
      entityType: 'User',
      entityId: user._id,
      before: beforeState,
      after: { id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive },
      reason: 'Update user profile metadata',
    });

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    };
  }

  @Delete(':id')
  @RequirePermissions('users.edit')
  async delete(@Param('id') id: string, @Req() req: any) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const beforeState = { id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive };
    await this.userModel.findByIdAndDelete(id);

    // Write audit log trail (sanitized)
    const deleterId = req.user?.sub ? new Types.ObjectId(req.user.sub) : undefined;
    await this.auditModel.create({
      userId: deleterId,
      action: 'DELETE_USER',
      entityType: 'User',
      entityId: user._id,
      before: beforeState,
      reason: 'User account deletion',
    });

    return { success: true, message: 'User deleted successfully' };
  }
}
