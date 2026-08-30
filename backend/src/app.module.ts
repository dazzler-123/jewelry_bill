import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Import Mongoose Schemas
import { User, UserSchema } from './schemas/user.schema';
import { Customer, CustomerSchema } from './schemas/customer.schema';
import { Product, ProductSchema } from './schemas/product.schema';
import {
  InventoryItem,
  InventoryItemSchema,
} from './schemas/inventory-item.schema';
import { Bill, BillSchema } from './schemas/bill.schema';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import {
  BillRevision,
  BillRevisionSchema,
} from './schemas/bill-revision.schema';
import { Refund, RefundSchema } from './schemas/refund.schema';
import { Return, ReturnSchema } from './schemas/return.schema';
import { MetalRate, MetalRateSchema } from './schemas/metal-rate.schema';
import {
  ShopSettings,
  ShopSettingsSchema,
} from './schemas/shop-settings.schema';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';
import {
  Notification,
  NotificationSchema,
} from './schemas/notification.schema';
import {
  InventoryHistory,
  InventoryHistorySchema,
} from './schemas/inventory-history.schema';

// Import Controllers
import { AuthController } from './auth/auth.controller';
import { UsersController } from './users/users.controller';
import { MetalRatesController } from './metal-rates/metal-rates.controller';
import { BillsController } from './bills/bills.controller';
import { CustomersController } from './customers/customers.controller';
import { InventoryController } from './inventory/inventory.controller';
import { PaymentsController } from './payments/payments.controller';
import { ProductsController } from './products/products.controller';
import { ReportsController } from './reports/reports.controller';

const mongoUri =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jewelry_billing';

@Module({
  imports: [
    MongooseModule.forRoot(mongoUri),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'jwt_super_secret_key_12345',
      signOptions: { expiresIn: '8h' },
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Product.name, schema: ProductSchema },
      { name: InventoryItem.name, schema: InventoryItemSchema },
      { name: Bill.name, schema: BillSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: BillRevision.name, schema: BillRevisionSchema },
      { name: Refund.name, schema: RefundSchema },
      { name: Return.name, schema: ReturnSchema },
      { name: MetalRate.name, schema: MetalRateSchema },
      { name: ShopSettings.name, schema: ShopSettingsSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: InventoryHistory.name, schema: InventoryHistorySchema },
    ]),
  ],
  controllers: [
    AppController,
    AuthController,
    UsersController,
    MetalRatesController,
    BillsController,
    CustomersController,
    InventoryController,
    PaymentsController,
    ProductsController,
    ReportsController,
  ],
  providers: [AppService],
})
export class AppModule {}
