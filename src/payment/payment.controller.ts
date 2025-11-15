import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { ClickService } from './services/click.service';
import { PaymeService } from './services/payme.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ClickPrepareDto } from './dto/click-prepare.dto';
import { ClickCompleteDto } from './dto/click-complete.dto';
import { PaymeRequestDto } from './dto/payme-request.dto';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly clickService: ClickService,
    private readonly paymeService: PaymeService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new payment' })
  @ApiResponse({ status: 201, description: 'Payment created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid payment data' })
  async createPayment(
    @Body() createPaymentDto: CreatePaymentDto,
    @CurrentUser() user: any,
  ) {
    return this.paymentService.createPayment(createPaymentDto, user.id);
  }

  @Get(':orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment status' })
  @ApiResponse({ status: 200, description: 'Payment status retrieved' })
  async getPaymentStatus(@Param('orderId') orderId: string) {
    return this.paymentService.getPaymentStatus(orderId);
  }

  @Post(':orderId/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a payment' })
  @ApiResponse({ status: 200, description: 'Payment cancelled' })
  async cancelPayment(
    @Param('orderId') orderId: string,
    @CurrentUser() user: any,
  ) {
    return this.paymentService.cancelPayment(orderId, user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user payments' })
  @ApiResponse({ status: 200, description: 'User payments retrieved' })
  async getUserPayments(@CurrentUser() user: any) {
    return this.paymentService.getUserPayments(user.id);
  }

  // ==================== WEBHOOKS ====================

  @Post('click/prepare')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Click prepare webhook' })
  @ApiResponse({ status: 200, description: 'Prepare response' })
  async clickPrepare(@Body() dto: ClickPrepareDto) {
    return this.clickService.prepare(dto);
  }

  @Post('click/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Click complete webhook' })
  @ApiResponse({ status: 200, description: 'Complete response' })
  async clickComplete(@Body() dto: ClickCompleteDto) {
    return this.clickService.complete(dto);
  }

  @Post('payme')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Payme JSON-RPC webhook' })
  @ApiResponse({ status: 200, description: 'Payme response' })
  async paymeWebhook(
    @Body() dto: PaymeRequestDto,
    @Headers('authorization') authHeader: string,
  ) {
    return this.paymeService.handleRequest(dto, authHeader);
  }
}
