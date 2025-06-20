import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '../auth.service';
import { Public } from '../decorators/public.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('login')
  @Public()
  @UseGuards(AuthGuard('auth0'))
  @ApiOperation({ summary: 'Login with Auth0' })
  login() {
    // Auth0 will handle the login
  }

  @Get('callback')
  @Public()
  @UseGuards(AuthGuard('auth0'))
  @ApiOperation({ summary: 'Auth0 callback' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async callback(@Req() req) {
    return this.authService.login(req.user);
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  getProfile(@Req() req) {
    return req.user;
  }
} 