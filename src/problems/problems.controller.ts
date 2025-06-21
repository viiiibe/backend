import { Controller, Get, Param, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProblemsService } from './problems.service';

@ApiTags('Problems')
@Controller('problems')
export class ProblemsController {
  constructor(private readonly problemsService: ProblemsService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all problems' })
  @ApiResponse({ status: 200, description: 'Problems retrieved' })
  async findAll(@Req() req: any) {
    // User must be authenticated to access problems
    return this.problemsService.findAll();
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get problem by ID' })
  @ApiResponse({ status: 200, description: 'Problem found' })
  async findById(@Param('id') id: string, @Req() req: any) {
    // User must be authenticated to access problems
    return this.problemsService.findById(id);
  }
}
