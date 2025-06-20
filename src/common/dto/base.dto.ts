import { IsString, IsOptional, IsUUID, IsEnum, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProblemComplexity, SubmissionStatus, ResourceType } from '@prisma/client';

export class PaginationDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  limit?: number = 10;
}

export class ProblemComplexityDto {
  @ApiProperty({ enum: ProblemComplexity })
  @IsEnum(ProblemComplexity)
  complexity: ProblemComplexity;
}

export class SubmissionStatusDto {
  @ApiProperty({ enum: SubmissionStatus })
  @IsEnum(SubmissionStatus)
  status: SubmissionStatus;
}

export class ResourceTypeDto {
  @ApiProperty({ enum: ResourceType })
  @IsEnum(ResourceType)
  type: ResourceType;
}

export class TestCaseDto {
  @ApiProperty()
  @IsString()
  input: string;

  @ApiProperty()
  @IsString()
  expectedOutput: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;
}

export class CreateProblemDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ enum: ProblemComplexity })
  @IsEnum(ProblemComplexity)
  complexity: ProblemComplexity;

  @ApiProperty()
  @IsString()
  topic: string;

  @ApiProperty({ type: [TestCaseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestCaseDto)
  testCases: TestCaseDto[];
}

export class SubmitSolutionDto {
  @ApiProperty()
  @IsUUID()
  problemId: string;

  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty()
  @IsString()
  language: string;
}

export class ChatRequestDto {
  @ApiProperty()
  @IsString()
  message: string;

  @ApiPropertyOptional()
  @IsOptional()
  context?: Record<string, any>;
}

export class BulkUploadSolutionDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsUUID()
  problemId: string;

  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty()
  @IsString()
  language: string;

  @ApiProperty({ enum: ['passed', 'failed'] })
  @IsEnum(['passed', 'failed'])
  result: 'passed' | 'failed';

  @ApiProperty()
  @IsString()
  timestamp: string;
} 