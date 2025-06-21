import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AciService } from './aci.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [AciService],
  exports: [AciService],
})
export class AciModule {} 