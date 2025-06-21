import { Controller, Get, Post, Body, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

class CreateUserDto {
  id: string;
  email?: string;
  name?: string;
  pictureUrl?: string;
}

class FindOrCreateUserDto {
  id: string;
  email?: string;
  name?: string;
  pictureUrl?: string;
}

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  async getMyProfile(@Req() req: any) {
    // Log the entire request object to see what Auth0 provides
    console.log('=== ENTIRE REQUEST OBJECT ===');
    console.log('req:', JSON.stringify(req, null, 2));
    console.log('req.user:', JSON.stringify(req.user, null, 2));
    console.log('req.headers:', JSON.stringify(req.headers, null, 2));
    console.log('=== END REQUEST OBJECT ===');

    let userId = req.user.id;
    let userEmail = req.user.email;
    let userName = req.user.name;
    let userPictureUrl = req.user.pictureUrl;

    // If email is not available in JWT, fetch from Auth0 userinfo endpoint
    if (!userEmail) {
      try {
        console.log('Email not found in JWT, fetching from Auth0 userinfo endpoint...');
        
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          throw new Error('No Bearer token found in request');
        }

        const accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix
        const auth0Domain = this.configService.get('auth.auth0.domain');
        
        const userinfoResponse = await axios.get(`https://${auth0Domain}/userinfo`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        console.log('Auth0 userinfo response:', JSON.stringify(userinfoResponse.data, null, 2));

        // Update user data from userinfo
        userEmail = userinfoResponse.data.email;
        userName = userinfoResponse.data.name || userName;
        userPictureUrl = userinfoResponse.data.picture || userPictureUrl;

        console.log('Updated user data from userinfo:', {
          email: userEmail,
          name: userName,
          pictureUrl: userPictureUrl,
        });
      } catch (error) {
        console.error('Error fetching userinfo from Auth0:', error);
        throw new Error('Failed to fetch user profile from Auth0');
      }
    }

    console.log('Final user data:', {
      id: userId,
      email: userEmail,
      name: userName,
      pictureUrl: userPictureUrl,
    });

    // Automatically find or create user from Auth0 data
    // Only use Auth0 user data, no request parameters accepted
    return this.usersService.findOrCreateUser(userId, {
      email: userEmail,
      name: userName,
      pictureUrl: userPictureUrl,
    });
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
      pictureUrl: createUserDto.pictureUrl,
    });
  }

  @Post('find-or-create')
  @ApiOperation({ summary: 'Find user by ID or create if not exists' })
  @ApiResponse({
    status: 200,
    description: 'User found or created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async findOrCreateUser(@Body() findOrCreateUserDto: FindOrCreateUserDto) {
    return this.usersService.findOrCreateUser(findOrCreateUserDto.id, {
      email: findOrCreateUserDto.email,
      name: findOrCreateUserDto.name,
      pictureUrl: findOrCreateUserDto.pictureUrl,
    });
  }
}
