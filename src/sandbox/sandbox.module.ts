import { Module } from '@nestjs/common';
import { AciModule } from '../aci/aci.module';
import { SandboxService } from './sandbox.service';

@Module({
  imports: [AciModule],
  providers: [SandboxService],
  exports: [SandboxService],
})
export class SandboxModule {}
