import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import configuration from './config/configuration';
import { AppController } from './app.controller';
import { DatabaseModule } from './db/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProblemsModule } from './problems/problems.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { ChatModule } from './chat/chat.module';
import { LLMModule } from './llm/llm.module';
import { SandboxModule } from './sandbox/sandbox.module';
import { MCPModule } from './mcp/mcp.module';
import { ResourcesModule } from './resources/resources.module';
import { AciModule } from './aci/aci.module';

import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [configuration],
    }),

    // Database
    DatabaseModule,

    // Feature modules
    AuthModule,
    UsersModule,
    ProblemsModule,
    SubmissionsModule,
    ChatModule,
    LLMModule,
    SandboxModule,
    MCPModule,
    ResourcesModule,
    AciModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
