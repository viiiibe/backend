import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../db/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(auth0Id: string, email: string, name?: string, pictureUrl?: string) {
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
    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }
} 