import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { RequirePage } from '../common/guards/permissions.guard';
import { User } from '../auth/entities/user.entity';
import { RecordingsService } from './recordings.service';
import {
  CompleteVisitDto,
  FinishRecordingDto,
  OpenRecordingSessionDto,
  StartVisitDto,
} from './dto/recording.dto';

@ApiTags('Recordings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class RecordingsController {
  constructor(private readonly service: RecordingsService) {}

  // ── Visit lifecycle (agent) ──────────────────────────────────────────────

  @Post('visits/start')
  @ApiOperation({ summary: 'Start an in-progress visit' })
  startVisit(@Request() req: { user: User }, @Body() dto: StartVisitDto) {
    return this.service.startVisit(req.user.distributorProfile!.id, dto);
  }

  @Post('visits/:id/complete')
  @ApiOperation({ summary: 'Complete or cancel an in-progress visit' })
  completeVisit(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Body() dto: CompleteVisitDto,
  ) {
    return this.service.completeVisit(req.user.distributorProfile!.id, id, dto);
  }

  // ── Recording sessions (agent) ───────────────────────────────────────────

  @Post('recordings/sessions')
  @ApiOperation({ summary: 'Open recording session for a visit (requires agent switch + consent)' })
  openSession(@Request() req: { user: User }, @Body() dto: OpenRecordingSessionDto) {
    return this.service.openSession(req.user.distributorProfile!.id, dto);
  }

  @Post('recordings/:id/finish')
  @ApiOperation({ summary: 'Mark recording finished / interrupted' })
  finish(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Body() dto: FinishRecordingDto,
  ) {
    return this.service.finishSession(req.user.distributorProfile!.id, id, dto);
  }

  @Post('recordings/:id/upload')
  @ApiOperation({ summary: 'Upload visit audio (m4a/mp3/ogg/webm/aac)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  upload(
    @Request() req: { user: User },
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadAudio(req.user.distributorProfile!.id, id, file);
  }

  @Post('recordings/:id/link-order')
  @ApiOperation({ summary: 'Link order to recording after submit' })
  linkOrder(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Body() body: { orderId: string },
  ) {
    return this.service.linkOrder(
      req.user.distributorProfile!.id,
      id,
      body.orderId,
    );
  }

  @Get('recordings/mine')
  @ApiOperation({ summary: 'Agent: today/yesterday recordings (Tashkent time)' })
  listMine(
    @Request() req: { user: User },
    @Query('day') day?: 'today' | 'yesterday',
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.listMine(req.user.distributorProfile!.id, {
      day: day === 'yesterday' ? 'yesterday' : 'today',
      q,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
  }

  @Get('recordings/mine/:id')
  getMine(@Request() req: { user: User }, @Param('id') id: string) {
    return this.service.getOneForAgent(req.user.distributorProfile!.id, id);
  }

  @Get('recordings/mine/:id/audio')
  @ApiOperation({ summary: 'Stream own recording audio' })
  async streamMine(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const recording = await this.service.resolvePlayableForAgent(
      req.user.distributorProfile!.id,
      id,
    );
    const { stream, size, mimeType } = await this.service.openAudioStream(recording);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', String(size));
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Disposition', 'inline');
    stream.pipe(res);
  }

  // ── Admin ────────────────────────────────────────────────────────────────

  @Get('recordings/admin')
  @UseGuards(AdminGuard)
  @RequirePage('zapislar')
  @ApiOperation({ summary: 'Admin list recordings for company scope' })
  listAdmin(
    @Request() req: { user: User },
    @Query('companyId') companyId?: string,
    @Query('distributorId') distributorId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.listAdmin(req.user, {
      companyId,
      distributorId,
      from,
      to,
      q,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
  }

  @Get('recordings/admin/:id')
  @UseGuards(AdminGuard)
  @RequirePage('zapislar')
  getAdmin(@Request() req: { user: User }, @Param('id') id: string) {
    return this.service.getOneForAdmin(req.user, id);
  }

  @Get('recordings/admin/:id/audio')
  @UseGuards(AdminGuard)
  @RequirePage('zapislar')
  @ApiOperation({ summary: 'Admin stream recording audio' })
  async streamAdmin(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const recording = await this.service.resolvePlayableForAdmin(req.user, id);
    const { stream, size, mimeType } = await this.service.openAudioStream(recording);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', String(size));
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Disposition', 'inline');
    stream.pipe(res);
  }
}
