import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ResourcesService } from './resources.service';

@ApiTags('Resources')
@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get('topic/:topicId')
  @ApiOperation({ summary: 'Get resources by topic' })
  @ApiResponse({ status: 200, description: 'Resources retrieved' })
  async findByTopic(@Param('topicId') topicId: string) {
    return this.resourcesService.findByTopic(parseInt(topicId, 10));
  }
} 