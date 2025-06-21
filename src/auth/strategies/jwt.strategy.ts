import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${configService.get('auth.auth0.domain')}/.well-known/jwks.json`,
      }),

      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      audience: configService.get('auth.auth0.audience'),
      issuer: configService.get('auth.auth0.issuer'),
      algorithms: ['RS256'],
    });
  }

  validate(payload: any) {
    // Debug: Log the entire payload to see what Auth0 is providing
    console.log('Auth0 JWT Payload:', JSON.stringify(payload, null, 2));

    // Auth0 JWT payload structure:
    // - sub: user ID (e.g., "auth0|123456789")
    // - email: user email (might be in different locations)
    // - name: user name (standard claim)
    // - nickname: alternative name field
    // - picture: profile picture URL
    // - Custom namespace claims: https://your-namespace/name, https://your-namespace/picture

    // Try multiple possible locations for email
    const email =
      payload.email ||
      payload['https://your-namespace/email'] ||
      payload['https://your-domain.auth0.com/email'] ||
      payload['https://your-domain.auth0.com/user_email'];

    console.log('Extracted email:', email);

    return {
      id: payload.sub,
      email: email,
      name:
        payload.name ||
        payload.nickname ||
        payload['https://your-namespace/name'],
      pictureUrl: payload.picture || payload['https://your-namespace/picture'],
    };
  }
}
