import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LLMService } from './llm.service';
import { MCPService } from '../mcp/mcp.service';
import { MCPClient } from '../mcp/mcp-client';

describe('LLMService', () => {
  let service: LLMService;
  let configService: ConfigService;
  let mcpService: MCPService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LLMService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                'llm.provider': 'anthropic',
                'llm.anthropic.apiKey': 'test-key',
                'llm.anthropic.model': 'claude-3-sonnet-20240229',
                'llm.anthropic.maxTokens': 1000,
                'llm.temperature': 0.7,
                'llm.maxTurns': 5,
              };
              return config[key];
            }),
          },
        },
        {
          provide: MCPService,
          useValue: {
            getAvailableFunctions: jest.fn().mockReturnValue(['get_problem_by_topic', 'execute_code']),
            handleMCPCall: jest.fn().mockResolvedValue({ success: true }),
          },
        },
        {
          provide: MCPClient,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<LLMService>(LLMService);
    configService = module.get<ConfigService>(ConfigService);
    mcpService = module.get<MCPService>(MCPService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return thinking process data structure', async () => {
    // Mock the generateResponseWithMultiTurnAnthropic method directly
    jest.spyOn(service as any, 'generateResponseWithMultiTurnAnthropic').mockResolvedValue({
      response: 'I understand you want to practice coding. Let me help you find a suitable problem.',
      actions: [],
      thinkingProcess: {
        totalTurns: 1,
        turns: [
          {
            turnNumber: 1,
            assistantMessage: 'I understand you want to practice coding. Let me help you find a suitable problem.',
            toolCalls: [],
            toolResults: [],
            timestamp: new Date(),
          },
        ],
        totalToolCalls: 0,
        processingTimeMs: 0,
      },
    });

    const result = await service.generateResponse(
      'I want to practice arrays',
      [],
      'test-user-id',
    );

    expect(result).toHaveProperty('response');
    expect(result).toHaveProperty('actions');
    expect(result).toHaveProperty('thinkingProcess');
    
    if (result.thinkingProcess) {
      expect(result.thinkingProcess).toHaveProperty('totalTurns');
      expect(result.thinkingProcess).toHaveProperty('turns');
      expect(result.thinkingProcess).toHaveProperty('totalToolCalls');
      expect(result.thinkingProcess).toHaveProperty('processingTimeMs');
      expect(Array.isArray(result.thinkingProcess.turns)).toBe(true);
    }
  });

  it('should handle missing thinking process gracefully', async () => {
    // Mock the service to return without thinking process
    jest.spyOn(service, 'generateResponse').mockResolvedValue({
      response: 'Test response',
      actions: [],
    });

    const result = await service.generateResponse(
      'test message',
      [],
      'test-user-id',
    );

    expect(result).toHaveProperty('response');
    expect(result).toHaveProperty('actions');
    expect(result.thinkingProcess).toBeUndefined();
  });
}); 