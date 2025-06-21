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

  // --- Test playground endpoints for each MCP function ---

  /** Example: /api/test1?userId=auth0|123 */
  @Get('test1')
  @Public()
  @ApiOperation({
    summary:
      'Test MCP fetch_user_history (example curl: curl http://localhost:1337/api/test1?userId=user123)',
  })
  async testUserHistory(@Query('userId') userId: string) {
    const result = await this.mcpService.handleMCPCall('fetch_user_history', {
      userId,
    });
    return result;
  }

  /** Example: /api/test2?topic=Graphs */
  @Get('test2')
  @Public()
  @ApiOperation({
    summary:
      'Test MCP fetch_learning_resources (example: curl http://localhost:1337/api/test2?topic=Graphs)',
  })
  async testResources(@Query('topic') topic: string) {
    const result = await this.mcpService.handleMCPCall(
      'fetch_learning_resources',
      { topic },
    );
    return result;
  }

  /** Example: /api/test3?userId=auth0|123 */
  @Get('test3')
  @Public()
  @ApiOperation({
    summary:
      'Test MCP check_solution_history (example: curl http://localhost:1337/api/test3?userId=user123)',
  })
  async testSolutionHistory(@Query('userId') userId: string) {
    const result = await this.mcpService.handleMCPCall(
      'check_solution_history',
      { userId },
    );
    return result;
  }

  /** Example POST body: { "code": "print(1)", "language": "python", "problemId": "uuid" } */
  @Get('test4')
  @Public()
  @ApiOperation({
    summary:
      'Test MCP execute_code (curl example omitted, should be POST in real implementation)',
  })
  async testExecuteCodeDemo() {
    // simple demo runs placeholder execution
    const result = await this.mcpService.handleMCPCall('execute_code', {
      code: 'print(1)',
      language: 'python',
      problemId: '42f5d1bb-32fb-4e12-a436-2afd68d24044',
    });
    return result;
  }
}
