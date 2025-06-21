import { Module } from '@nestjs/common';
import { MCPService } from './mcp.service';
import { ProblemsModule } from '../problems/problems.module';

@Module({
  imports: [ProblemsModule],
  providers: [MCPService],
  exports: [MCPService],
})
export class MCPModule {}
 