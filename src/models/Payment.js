import { DataTypes, Model } from 'sequelize';
import { PAYMENT_METHODS, PAYMENT_RECORD_STATUSES, PAYMENT_TYPES } from '../domain/enums.js';
import { sequelize } from '../lib/db.js';
import { enumColumn, foreignKeyColumn, idColumn, moneyColumn, timestampColumns } from './columns.js';

export class Payment extends Model {}

Payment.init(
  {
    id: idColumn(),
    bookingId: foreignKeyColumn(),
    paymentType: enumColumn(PAYMENT_TYPES),
    method: enumColumn(PAYMENT_METHODS),
    // Paise.
    amount: moneyColumn(),
    status: enumColumn(PAYMENT_RECORD_STATUSES),
    razorpayOrderId: { type: DataTypes.STRING(64), allowNull: true, unique: true },
    razorpayPaymentId: { type: DataTypes.STRING(64), allowNull: true, unique: true },
    reference: { type: DataTypes.STRING(120), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    failureReason: { type: DataTypes.TEXT, allowNull: true },
    rawPayload: { type: DataTypes.JSONB, allowNull: true },
    paidAt: { type: DataTypes.DATE, allowNull: true },
    ...timestampColumns,
  },
  { sequelize, tableName: 'payments' },
);
