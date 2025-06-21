import { Module } from '@nestjs/common';
import { MCPService } from './mcp.service';
import { MCPServer } from './mcp-server';
import { MCPClient } from './mcp-client';
import { ProblemsModule } from '../problems/problems.module';
import { UsersModule } from '../users/users.module';
import { SubmissionsModule } from '../submissions/submissions.module';
import { ResourcesModule } from '../resources/resources.module';
import { SandboxModule } from '../sandbox/sandbox.module';

@Module({
  imports: [
    ProblemsModule,
    UsersModule,
    SubmissionsModule,
    ResourcesModule,
    SandboxModule,
  ],
  providers: [MCPService, MCPServer, MCPClient],
  exports: [MCPService, MCPServer, MCPClient],
})
export class MCPModule {}
