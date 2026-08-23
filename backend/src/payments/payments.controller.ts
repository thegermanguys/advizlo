import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CONSULTANT)
  @Post('connect/onboard')
  startOnboarding(@CurrentUser() user: { id: string }) {
    return this.paymentsService.startConnectOnboarding(user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CONSULTANT)
  @Get('connect/status')
  getStatus(@CurrentUser() user: { id: string }) {
    return this.paymentsService.getConnectStatus(user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT)
  @Post('checkout/:bookingId')
  createCheckoutSession(
    @CurrentUser() user: { id: string },
    @Param('bookingId') bookingId: string,
  ) {
    return this.paymentsService.createCheckoutSession(user.id, bookingId);
  }

  // Stripe calls this directly - no JWT, verified instead by the signed
  // payload (see main.ts for how req.rawBody is captured for this to work).
  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Req() req: any,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!req.rawBody) {
      throw new BadRequestException('Missing raw body for webhook verification');
    }
    const event = this.paymentsService.constructWebhookEvent(req.rawBody, signature);
    await this.paymentsService.handleWebhookEvent(event);
    return { received: true };
  }
}
