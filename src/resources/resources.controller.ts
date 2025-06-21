import { Controller, Get, Param, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ResourcesService } from './resources.service';

@ApiTags('Resources')
@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get('topic/:topic')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get resources by topic' })
  @ApiResponse({ status: 200, description: 'Resources retrieved' })
  async findByTopic(@Param('topic') topic: string, @Req() req: any) {
    // User must be authenticated to access learning resources
    const userId = req.user.id;
    return this.resourcesService.findByTopic(topic);
  }
} 