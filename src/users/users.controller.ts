import { Controller, Get, Post, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';

class CreateUserDto {
  id: string;
  email?: string;
  name?: string;
}

class FindOrCreateUserDto {
  id: string;
  email?: string;
  name?: string;
}

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

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto.id, {
      email: createUserDto.email,
      name: createUserDto.name,
    });
  }

  @Post('find-or-create')
  @ApiOperation({ summary: 'Find user by ID or create if not exists' })
  @ApiResponse({ status: 200, description: 'User found or created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async findOrCreateUser(@Body() findOrCreateUserDto: FindOrCreateUserDto) {
    return this.usersService.findOrCreateUser(findOrCreateUserDto.id, {
      email: findOrCreateUserDto.email,
      name: findOrCreateUserDto.name,
    });
  }
} 