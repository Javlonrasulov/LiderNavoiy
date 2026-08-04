import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsObject,
  IsArray,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../notification.types';

export class RegisterFcmTokenDto {
  @ApiProperty({ description: 'FCM device token from Firebase' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiPropertyOptional({
    description: 'App language: uz | uz_cyr | uz_kril | ru | en',
    enum: ['uz', 'uz_cyr', 'uz_kril', 'ru', 'en'],
  })
  @IsOptional()
  @IsIn(['uz', 'uz_cyr', 'uz_cyrl', 'uz_kril', 'uz_latn', 'ru', 'en'])
  language?: string;
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

  @ApiPropertyOptional({ description: 'Filter by company id (agents only)' })
  @IsOptional()
  @IsString()
  companyId?: string;

  /** agents | clients | admins | all — default: agents */
  @ApiPropertyOptional({
    description: 'Who receives the broadcast',
    enum: ['agents', 'clients', 'admins', 'all'],
  })
  @IsOptional()
  @IsIn(['agents', 'clients', 'admins', 'all'])
  audience?: 'agents' | 'clients' | 'admins' | 'all';
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
