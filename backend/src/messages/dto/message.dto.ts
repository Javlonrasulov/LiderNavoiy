import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsUUID,
  IsNumber,
  IsIn,
  IsArray,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MessageAttachmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiProperty()
  @IsNumber()
  fileSize: number;

  @ApiProperty({ enum: ['image', 'document'] })
  @IsIn(['image', 'document'])
  messageType: 'image' | 'document';
}

export class SendMessageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  text?: string;

  @ApiPropertyOptional({ type: MessageAttachmentDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MessageAttachmentDto)
  attachment?: MessageAttachmentDto;
}

export class StartConversationDto {
  @ApiProperty()
  @IsUUID()
  userId: string;
}

export class GetMessagesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  before?: string;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  limit?: number;
}

export class DeleteMessagesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  messageIds: string[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  forEveryone?: boolean;
}
