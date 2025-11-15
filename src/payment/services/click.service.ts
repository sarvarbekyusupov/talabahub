import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { ClickPrepareDto } from '../dto/click-prepare.dto';
import { ClickCompleteDto } from '../dto/click-complete.dto';
import { ClickErrorCode } from '../enums/payment-status.enum';

@Injectable()
export class ClickService {
  private readonly logger = new Logger(ClickService.name);
  private readonly serviceId: string;
  private readonly secretKey: string;

  constructor(private readonly configService: ConfigService) {
    this.serviceId = this.configService.get('CLICK_SERVICE_ID');
    this.secretKey = this.configService.get('CLICK_SECRET_KEY');
  }

  /**
   * Verify Click signature
   */
  verifySignature(
    clickTransId: number,
    serviceId: number,
    secretKey: string,
    merchantTransId: string,
    merchantPrepareId: string,
    amount: number,
    action: number,
    signTime: string,
    signString: string,
  ): boolean {
    const expectedSign = createHash('md5')
      .update(
        `${clickTransId}${serviceId}${secretKey}${merchantTransId}${merchantPrepareId}${amount}${action}${signTime}`,
      )
      .digest('hex');

    return expectedSign === signString;
  }

  /**
   * Handle Click prepare request
   */
  async prepare(dto: ClickPrepareDto): Promise<any> {
    try {
      // Verify signature
      const isValidSign = this.verifySignature(
        dto.click_trans_id,
        dto.service_id,
        this.secretKey,
        dto.merchant_trans_id,
        '', // No prepare ID on prepare action
        dto.amount,
        dto.action,
        dto.sign_time,
        dto.sign_string,
      );

      if (!isValidSign) {
        this.logger.error('Click signature verification failed');
        return {
          click_trans_id: dto.click_trans_id,
          merchant_trans_id: dto.merchant_trans_id,
          merchant_prepare_id: 0,
          error: ClickErrorCode.SIGN_CHECK_FAILED,
          error_note: 'Invalid signature',
        };
      }

      // TODO: Validate order exists and amount matches
      // For now, we'll accept all valid signatures
      const merchantPrepareId = Date.now(); // Generate unique prepare ID

      this.logger.log(`Click prepare successful for order ${dto.merchant_trans_id}`);

      return {
        click_trans_id: dto.click_trans_id,
        merchant_trans_id: dto.merchant_trans_id,
        merchant_prepare_id: merchantPrepareId,
        error: ClickErrorCode.SUCCESS,
        error_note: 'Success',
      };
    } catch (error) {
      this.logger.error('Click prepare error', error);
      return {
        click_trans_id: dto.click_trans_id,
        merchant_trans_id: dto.merchant_trans_id,
        merchant_prepare_id: 0,
        error: ClickErrorCode.UNKNOWN_ERROR,
        error_note: 'Unknown error',
      };
    }
  }

  /**
   * Handle Click complete request
   */
  async complete(dto: ClickCompleteDto): Promise<any> {
    try {
      // Verify signature
      const isValidSign = this.verifySignature(
        dto.click_trans_id,
        dto.service_id,
        this.secretKey,
        dto.merchant_trans_id,
        dto.merchant_prepare_id,
        dto.amount,
        dto.action,
        dto.sign_time,
        dto.sign_string,
      );

      if (!isValidSign) {
        this.logger.error('Click signature verification failed on complete');
        return {
          click_trans_id: dto.click_trans_id,
          merchant_trans_id: dto.merchant_trans_id,
          merchant_confirm_id: 0,
          error: ClickErrorCode.SIGN_CHECK_FAILED,
          error_note: 'Invalid signature',
        };
      }

      // TODO: Mark payment as completed in database
      // TODO: Grant access to course/event/subscription
      const merchantConfirmId = Date.now(); // Generate unique confirm ID

      this.logger.log(`Click payment completed for order ${dto.merchant_trans_id}`);

      return {
        click_trans_id: dto.click_trans_id,
        merchant_trans_id: dto.merchant_trans_id,
        merchant_confirm_id: merchantConfirmId,
        error: ClickErrorCode.SUCCESS,
        error_note: 'Success',
      };
    } catch (error) {
      this.logger.error('Click complete error', error);
      return {
        click_trans_id: dto.click_trans_id,
        merchant_trans_id: dto.merchant_trans_id,
        merchant_confirm_id: 0,
        error: ClickErrorCode.UNKNOWN_ERROR,
        error_note: 'Unknown error',
      };
    }
  }

  /**
   * Generate Click payment URL
   */
  generatePaymentUrl(orderId: string, amount: number, returnUrl?: string): string {
    const baseUrl = 'https://my.click.uz/services/pay';
    const params = new URLSearchParams({
      service_id: this.serviceId,
      merchant_id: this.configService.get('CLICK_MERCHANT_ID'),
      amount: amount.toString(),
      transaction_param: orderId,
      return_url: returnUrl || this.configService.get('FRONTEND_URL'),
    });

    return `${baseUrl}?${params.toString()}`;
  }
}
