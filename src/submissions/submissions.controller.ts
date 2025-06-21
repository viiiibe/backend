import { Controller, Get, Post, Body, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SubmissionsService } from './submissions.service';
import { SubmitSolutionDto } from '../common/dto/base.dto';

@ApiTags('Submissions')
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get('my')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my submissions' })
  @ApiResponse({ status: 200, description: 'Submissions retrieved' })
  async getMySubmissions(@Req() req: any) {
    const userId = req.user.id;
    return this.submissionsService.findByUser(userId);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create submission' })
  @ApiResponse({ status: 201, description: 'Submission created' })
  async create(@Body() data: SubmitSolutionDto, @Req() req: any) {
    const userId = req.user.id;
    const submissionData = {
      ...data,
      userId,
    };
    return this.submissionsService.create(submissionData);
  }
}
