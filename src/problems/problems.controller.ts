import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProblemsService } from './problems.service';

@ApiTags('Problems')
@Controller('problems')
export class ProblemsController {
  constructor(private readonly problemsService: ProblemsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all problems' })
  @ApiResponse({ status: 200, description: 'Problems retrieved' })
  async findAll() {
    return this.problemsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get problem by ID' })
  @ApiResponse({ status: 200, description: 'Problem found' })
  async findById(@Param('id') id: string) {
    return this.problemsService.findById(id);
  }
} 