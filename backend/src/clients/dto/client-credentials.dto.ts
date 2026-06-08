import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class SetClientCredentialsDto {
  @ApiProperty({ example: 'client29072' })
  @IsString()
  @MinLength(3)
  username: string;

  @ApiProperty({ example: 'client123456' })
  @IsString()
  @MinLength(6)
  password: string;
}
