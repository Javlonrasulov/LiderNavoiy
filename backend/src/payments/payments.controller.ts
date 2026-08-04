import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/entities/user.entity';
import { PaymentsService } from './payments.service';
import { PaymentPhotoUploadService } from './payment-photo-upload.service';
import {
  CollectPaymentDto,
  DeliverOrderDto,
  UpdateDueAtDto,
} from './dto/payment.dto';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly upload: PaymentPhotoUploadService,
  ) {}

  @Post(['orders/upload-payment-photo', 'payments/upload-photo'])
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload payment proof photo' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  uploadPhoto(@UploadedFile() file: Express.Multer.File) {
    return this.upload.saveFile(file);
  }

  @Patch('orders/:id/deliver')
  @ApiOperation({ summary: 'Courier marks order delivered + payment' })
  deliver(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Body() dto: DeliverOrderDto,
  ) {
    return this.payments.deliver(id, req.user.distributorProfile!.id, dto);
  }

  @Post('orders/:id/payments')
  @ApiOperation({ summary: 'Collect partial / follow-up payment' })
  collect(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Body() dto: CollectPaymentDto,
  ) {
    return this.payments.collectMore(id, req.user.distributorProfile!.id, dto);
  }

  @Patch('orders/:id/payments/due')
  @ApiOperation({ summary: 'Change deferred payment dueAt' })
  updateDue(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Body() dto: UpdateDueAtDto,
  ) {
    return this.payments.updateDueAt(id, req.user.distributorProfile!.id, dto);
  }
}
