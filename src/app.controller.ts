import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from './auth/decorators/public.decorator';
import { MCPService } from './mcp/mcp.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly mcpService: MCPService) {}

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'FAANG Interview AI Backend',
      version: '1.0.0',
    };
  }

  /**
   * Simple playground endpoint to verify MCP get_problem_by_topic works.
   * Example: GET /api/test0?topic=Arrays&complexity=EASY
   */
  @Get('test0')
  @Public()
  @ApiOperation({ summary: 'Test MCP get_problem_by_topic' })
  async testGetProblem(
    @Query('topic') topic = 'Arrays',
    @Query('complexity') complexity = 'EASY',
  ) {
    const result = await this.mcpService.handleMCPCall('get_problem_by_topic', {
      topic,
      complexity,
      excludeIds: [],
    });
    return { topic, complexity, result };
  }
} 