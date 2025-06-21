import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../db/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(
    auth0Id: string,
    email: string,
    name?: string,
    pictureUrl?: string,
  ) {
    let user = await this.prisma.user.findUnique({
      where: { id: auth0Id },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          id: auth0Id,
          email,
          name,
          pictureUrl,
        },
      });
    }

    return user;
  }

  async login(user: any) {
    // Return the Auth0 access token instead of creating a local JWT
    return {
      access_token: user.auth0AccessToken,
      token_type: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        pictureUrl: user.pictureUrl,
      },
    };
  }
}
