import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsObject,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../notification.types';

export class RegisterFcmTokenDto {
  @ApiProperty({ description: 'FCM device token from Firebase' })
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class SendNotificationDto {
  @ApiPropertyOptional({ description: 'Target user UUID' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Target distributor profile UUID' })
  @IsOptional()
  @IsUUID()
  distributorId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({ enum: NotificationType })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({ description: 'Extra payload for mobile app' })
  @IsOptional()
  @IsObject()
  data?: Record<string, string>;
}

export class BroadcastNotificationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({ enum: NotificationType })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  data?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Filter by company id' })
  @IsOptional()
  @IsString()
  companyId?: string;
}

export class SendToUsersDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  userIds: string[];

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  body: string;

  @ApiPropertyOptional({ enum: NotificationType })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  data?: Record<string, string>;
}
