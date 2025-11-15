import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymeRequestDto } from '../dto/payme-request.dto';
import { PaymeErrorCode, TransactionState } from '../enums/payment-status.enum';

interface PaymeTransaction {
  id: string;
  time: number;
  amount: number;
  account: Record<string, any>;
  state: TransactionState;
  create_time: number;
  perform_time?: number;
  cancel_time?: number;
  reason?: number;
}

@Injectable()
export class PaymeService {
  private readonly logger = new Logger(PaymeService.name);
  private readonly merchantId: string;
  private readonly secretKey: string;

  // In-memory transaction storage (should be replaced with database)
  private transactions: Map<string, PaymeTransaction> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.merchantId = this.configService.get('PAYME_MERCHANT_ID');
    this.secretKey = this.configService.get('PAYME_SECRET_KEY');
  }

  /**
   * Verify Payme authorization header
   */
  verifyAuthorization(authHeader: string): boolean {
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return false;
    }

    const base64Credentials = authHeader.substring(6);
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    return username === 'Paycom' && password === this.secretKey;
  }

  /**
   * Handle Payme JSON-RPC request
   */
  async handleRequest(dto: PaymeRequestDto, authHeader: string): Promise<any> {
    // Verify authorization
    if (!this.verifyAuthorization(authHeader)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    try {
      let result: any;

      switch (dto.method) {
        case 'CheckPerformTransaction':
          result = await this.checkPerformTransaction(dto.params);
          break;
        case 'CreateTransaction':
          result = await this.createTransaction(dto.params);
          break;
        case 'PerformTransaction':
          result = await this.performTransaction(dto.params);
          break;
        case 'CancelTransaction':
          result = await this.cancelTransaction(dto.params);
          break;
        case 'CheckTransaction':
          result = await this.checkTransaction(dto.params);
          break;
        case 'GetStatement':
          result = await this.getStatement(dto.params);
          break;
        default:
          return this.errorResponse(dto.id, -32601, 'Method not found');
      }

      return {
        jsonrpc: '2.0',
        id: dto.id,
        result,
      };
    } catch (error) {
      this.logger.error(`Payme error: ${error.message}`, error);
      return this.errorResponse(dto.id, error.code || -32400, error.message);
    }
  }

  /**
   * CheckPerformTransaction - Check if transaction can be performed
   */
  private async checkPerformTransaction(params: any): Promise<any> {
    const { amount, account } = params;

    // TODO: Validate order exists and amount matches
    // For now, we'll accept all valid amounts
    if (!account.order_id) {
      throw { code: PaymeErrorCode.INVALID_ACCOUNT, message: 'Invalid account' };
    }

    this.logger.log(`CheckPerformTransaction for order ${account.order_id}`);

    return {
      allow: true,
    };
  }

  /**
   * CreateTransaction - Create a new transaction
   */
  private async createTransaction(params: any): Promise<any> {
    const { id, time, amount, account } = params;

    // Check if transaction already exists
    const existingTx = this.transactions.get(id);
    if (existingTx) {
      if (existingTx.state !== TransactionState.STATE_CREATED) {
        throw { code: PaymeErrorCode.UNABLE_TO_PERFORM, message: 'Transaction already processed' };
      }
      return this.formatTransaction(existingTx);
    }

    // TODO: Validate order and amount
    if (!account.order_id) {
      throw { code: PaymeErrorCode.INVALID_ACCOUNT, message: 'Invalid account' };
    }

    // Create transaction
    const transaction: PaymeTransaction = {
      id,
      time,
      amount,
      account,
      state: TransactionState.STATE_CREATED,
      create_time: Date.now(),
    };

    this.transactions.set(id, transaction);
    this.logger.log(`Transaction created: ${id}`);

    return this.formatTransaction(transaction);
  }

  /**
   * PerformTransaction - Perform (complete) a transaction
   */
  private async performTransaction(params: any): Promise<any> {
    const { id } = params;

    const transaction = this.transactions.get(id);
    if (!transaction) {
      throw { code: PaymeErrorCode.TRANSACTION_NOT_FOUND, message: 'Transaction not found' };
    }

    if (transaction.state === TransactionState.STATE_COMPLETED) {
      return this.formatTransaction(transaction);
    }

    if (transaction.state !== TransactionState.STATE_CREATED) {
      throw { code: PaymeErrorCode.UNABLE_TO_PERFORM, message: 'Transaction cannot be performed' };
    }

    // TODO: Mark payment as completed in database
    // TODO: Grant access to course/event/subscription
    transaction.state = TransactionState.STATE_COMPLETED;
    transaction.perform_time = Date.now();

    this.logger.log(`Transaction performed: ${id}`);

    return this.formatTransaction(transaction);
  }

  /**
   * CancelTransaction - Cancel a transaction
   */
  private async cancelTransaction(params: any): Promise<any> {
    const { id, reason } = params;

    const transaction = this.transactions.get(id);
    if (!transaction) {
      throw { code: PaymeErrorCode.TRANSACTION_NOT_FOUND, message: 'Transaction not found' };
    }

    if (transaction.state === TransactionState.STATE_CREATED) {
      transaction.state = TransactionState.STATE_CANCELLED;
    } else if (transaction.state === TransactionState.STATE_COMPLETED) {
      // TODO: Implement refund logic
      transaction.state = TransactionState.STATE_CANCELLED_AFTER_COMPLETE;
    }

    transaction.cancel_time = Date.now();
    transaction.reason = reason;

    this.logger.log(`Transaction cancelled: ${id}`);

    return this.formatTransaction(transaction);
  }

  /**
   * CheckTransaction - Check transaction status
   */
  private async checkTransaction(params: any): Promise<any> {
    const { id } = params;

    const transaction = this.transactions.get(id);
    if (!transaction) {
      throw { code: PaymeErrorCode.TRANSACTION_NOT_FOUND, message: 'Transaction not found' };
    }

    return this.formatTransaction(transaction);
  }

  /**
   * GetStatement - Get transactions statement for a period
   */
  private async getStatement(params: any): Promise<any> {
    const { from, to } = params;

    const transactions = Array.from(this.transactions.values()).filter(
      (tx) => tx.create_time >= from && tx.create_time <= to,
    );

    return {
      transactions: transactions.map((tx) => this.formatTransaction(tx)),
    };
  }

  /**
   * Format transaction for response
   */
  private formatTransaction(tx: PaymeTransaction): any {
    return {
      id: tx.id,
      time: tx.time,
      amount: tx.amount,
      account: tx.account,
      create_time: tx.create_time,
      perform_time: tx.perform_time || 0,
      cancel_time: tx.cancel_time || 0,
      transaction: tx.id,
      state: tx.state,
      reason: tx.reason || null,
    };
  }

  /**
   * Create error response
   */
  private errorResponse(id: number, code: number, message: string): any {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
      },
    };
  }

  /**
   * Generate Payme payment URL
   */
  generatePaymentUrl(orderId: string, amount: number): string {
    const amountInTiyin = amount * 100; // Convert sum to tiyin
    const params = {
      m: this.merchantId,
      ac: { order_id: orderId },
      a: amountInTiyin,
      c: this.configService.get('FRONTEND_URL'),
    };

    const encodedParams = Buffer.from(JSON.stringify(params)).toString('base64');
    return `https://checkout.paycom.uz/${encodedParams}`;
  }
}
