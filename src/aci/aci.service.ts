import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ACI } from '@aci-sdk/aci';

@Injectable()
export class AciService implements OnModuleInit {
  /**
   * Shared ACI client instance for the entire NestJS application.
   */
  public client: ACI;

  /**
   * We use a single synthetic owner-id for all Daytona linked accounts that our
   * backend controls.  In a multi-tenant setup you would likely map this to the
   * user id instead.
   */
  public static readonly LINKED_ACCOUNT_OWNER_ID = 'VibeUser';

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('ACI_API_KEY');
    if (!apiKey) {
      throw new Error(
        'Missing ACI_API_KEY environment variable – please add it to your .env file',
      );
    }

    this.client = new ACI({
      apiKey,
    });
  }
}
