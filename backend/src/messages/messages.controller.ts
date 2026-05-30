import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { MessagesGateway } from './messages.gateway';
import { MessagesUploadService } from './messages-upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SendMessageDto, StartConversationDto, DeleteMessagesDto } from './dto/message.dto';
import { User } from '../auth/entities/user.entity';

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(
    private readonly service: MessagesService,
    private readonly gateway: MessagesGateway,
    private readonly uploadService: MessagesUploadService,
  ) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload chat attachment (image or document)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is required');
    return this.uploadService.saveFile(file);
  }

  @Get('contacts')
  @ApiOperation({ summary: 'List users available for chat' })
  getContacts(
    @Request() req: { user: User },
    @Query('companyId') companyId?: string,
  ) {
    return this.service.getContacts(req.user.id, companyId);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List my conversations' })
  getConversations(@Request() req: { user: User }) {
    return this.service.getConversations(req.user.id);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Start or get conversation with user' })
  startConversation(
    @Request() req: { user: User },
    @Body() dto: StartConversationDto,
  ) {
    return this.service.findOrCreateConversation(req.user.id, dto.userId);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get messages in conversation' })
  getMessages(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    return this.service.getMessages(
      id,
      req.user.id,
      limit ? parseInt(limit, 10) : 50,
      before,
    );
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send message in conversation' })
  async sendMessage(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    const msg = await this.service.sendMessage(
      id,
      req.user.id,
      dto.text,
      dto.attachment,
    );
    await this.gateway.broadcastNewMessage(msg, req.user.id);
    return msg;
  }

  @Patch('conversations/:id/read')
  @ApiOperation({ summary: 'Mark conversation messages as read' })
  markRead(@Request() req: { user: User }, @Param('id') id: string) {
    return this.service.markRead(id, req.user.id);
  }

  @Post('conversations/:id/messages/delete')
  @ApiOperation({ summary: 'Delete messages (for me or for everyone)' })
  async deleteMessages(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Body() dto: DeleteMessagesDto,
  ) {
    const forEveryone = dto.forEveryone ?? false;
    const result = await this.service.deleteMessages(
      id,
      req.user.id,
      dto.messageIds,
      forEveryone,
    );
    await this.gateway.broadcastMessageDeleted(
      id,
      req.user.id,
      result.deleted,
      forEveryone,
    );
    return result;
  }
}
