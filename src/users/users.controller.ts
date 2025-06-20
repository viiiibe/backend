import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  async getMyProfile(@Req() req: any) {
    const userId = req.user.id;
    return this.usersService.findById(userId);
  }

  @Get('me/stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my statistics' })
  @ApiResponse({ status: 200, description: 'User statistics retrieved' })
  async getMyStats(@Req() req: any) {
    const userId = req.user.id;
    return this.usersService.getUserStats(userId);
  }
} 