import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SubmissionsService } from './submissions.service';

@ApiTags('Submissions')
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user submissions' })
  @ApiResponse({ status: 200, description: 'Submissions retrieved' })
  async findByUser(@Param('userId') userId: string) {
    return this.submissionsService.findByUser(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create submission' })
  @ApiResponse({ status: 201, description: 'Submission created' })
  async create(@Body() data: any) {
    return this.submissionsService.create(data);
  }
} 