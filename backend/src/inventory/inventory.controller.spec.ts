import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ProductsController } from '../products/products.controller';
import { InventoryController } from './inventory.controller';
import { Product } from '../schemas/product.schema';
import { InventoryItem } from '../schemas/inventory-item.schema';
import { InventoryHistory } from '../schemas/inventory-history.schema';
import { AuditLog } from '../schemas/audit-log.schema';

describe('Products and Inventory Controllers Integration', () => {
  let productsController: ProductsController;
  let inventoryController: InventoryController;

  // Mock models
  let productModelMock: any;
  let inventoryModelMock: any;
  let historyModelMock: any;

  const mockUserRequest = {
    user: {
      sub: '507f1f77bcf86cd799439011',
      email: 'manager@aurum.com',
      role: 'MANAGER',
    },
  };

  beforeEach(async () => {
    productModelMock = {
      find: jest.fn().mockReturnThis(),
      findById: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      sort: jest.fn().mockResolvedValue([]),
    };

    inventoryModelMock = {
      find: jest.fn().mockReturnThis(),
      findById: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    };

    historyModelMock = {
      find: jest.fn().mockReturnThis(),
      create: jest.fn(),
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController, InventoryController],
      providers: [
        {
          provide: JwtService,
          useValue: { verifyAsync: jest.fn() },
        },
        {
          provide: getModelToken(Product.name),
          useValue: productModelMock,
        },
        {
          provide: getModelToken(InventoryItem.name),
          useValue: inventoryModelMock,
        },
        {
          provide: getModelToken(InventoryHistory.name),
          useValue: historyModelMock,
        },
        {
          provide: getModelToken(AuditLog.name),
          useValue: { create: jest.fn().mockResolvedValue({}) },
        },
      ],
    }).compile();

    productsController = module.get<ProductsController>(ProductsController);
    inventoryController = module.get<InventoryController>(InventoryController);
  });

  describe('Products Catalog Management', () => {
    it('should create a new catalog product metadata', async () => {
      const dto = {
        sku: 'SKU-RING-01',
        barcode: 'BAR-RING-01',
        name: 'Solitaire Gold Ring',
        category: 'Rings',
        metal: 'GOLD',
        purity: '22K',
        defaultMakingCharge: 1200,
        defaultWastage: 5,
      };

      productModelMock.findOne.mockResolvedValue(null); // No duplicates
      productModelMock.create.mockImplementation((data) => ({
        ...data,
        _id: new Types.ObjectId('507f1f77bcf86cd799439022'),
      }));

      const result = await productsController.create(dto);
      expect(result).toBeDefined();
      expect(productModelMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Solitaire Gold Ring' })
      );
    });

    it('should throw ConflictException if product SKU already exists', async () => {
      const dto = {
        sku: 'SKU-RING-01',
        barcode: 'BAR-RING-01',
        name: 'Solitaire Gold Ring',
        category: 'Rings',
        metal: 'GOLD',
        purity: '22K',
      };

      productModelMock.findOne.mockResolvedValue({ sku: 'SKU-RING-01' }); // Duplicate SKU

      await expect(productsController.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('Inventory Stock Management', () => {
    it('should catalog a new stock item unit and write initial IN_STOCK history', async () => {
      const dto = {
        productId: '507f1f77bcf86cd799439022',
        sku: 'SKU-RING-01',
        barcode: 'BAR-RING-01-UNIT1',
        metal: 'GOLD',
        purity: '22K',
        grossWeight: 10,
        stoneWeight: 1,
        otherWeight: 0.5,
        status: 'IN_STOCK',
        location: 'Drawer A1',
      };

      inventoryModelMock.findOne.mockResolvedValue(null); // No duplicate barcode
      inventoryModelMock.create.mockImplementation((data) => ({
        ...data,
        _id: new Types.ObjectId('507f1f77bcf86cd799439033'),
        toJSON: () => data,
      }));

      const result = await inventoryController.create(dto, mockUserRequest);
      expect(result).toBeDefined();
      expect(inventoryModelMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          netWeight: 8.5, // 10 - 1 - 0.5 = 8.5
          barcode: 'BAR-RING-01-UNIT1',
        })
      );
      // Verify stock history logged
      expect(historyModelMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          newStatus: 'IN_STOCK',
          reason: 'Initial stock intake cataloging',
        })
      );
    });

    it('should edit stock details and write history if status changes to DAMAGED', async () => {
      const mockItem = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439033'),
        sku: 'SKU-RING-01',
        barcode: 'BAR-RING-01-UNIT1',
        metal: 'GOLD',
        purity: '22K',
        grossWeight: 10,
        status: 'IN_STOCK',
        save: jest.fn().mockResolvedValue(true),
      };
      inventoryModelMock.findById.mockResolvedValue(mockItem);

      const dto = {
        sku: 'SKU-RING-01',
        barcode: 'BAR-RING-01-UNIT1',
        metal: 'GOLD',
        purity: '22K',
        grossWeight: 10,
        status: 'DAMAGED', // status changed!
        updateReason: 'Accidental scratch on bezel',
      };

      await inventoryController.edit('507f1f77bcf86cd799439033', dto, mockUserRequest);
      expect(mockItem.status).toBe('DAMAGED');
      expect(mockItem.save).toHaveBeenCalled();
      expect(historyModelMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          previousStatus: 'IN_STOCK',
          newStatus: 'DAMAGED',
          reason: 'Accidental scratch on bezel',
        })
      );
    });

    it('should throw ConflictException if duplicate barcode is saved on edit', async () => {
      const mockItem = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439033'),
        sku: 'SKU-RING-01',
        barcode: 'BAR-RING-01-UNIT1',
        metal: 'GOLD',
        purity: '22K',
        grossWeight: 10,
        status: 'IN_STOCK',
      };
      inventoryModelMock.findById.mockResolvedValue(mockItem);
      // Mock barcode clash lookup
      inventoryModelMock.findOne.mockResolvedValue({ barcode: 'BAR-CLASH' });

      const dto = {
        sku: 'SKU-RING-01',
        barcode: 'BAR-CLASH',
        metal: 'GOLD',
        purity: '22K',
        grossWeight: 10,
        status: 'IN_STOCK',
      };

      await expect(inventoryController.edit('507f1f77bcf86cd799439033', dto, mockUserRequest))
        .rejects.toThrow(ConflictException);
    });
  });
});
