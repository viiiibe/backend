import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-auth0';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class Auth0Strategy extends PassportStrategy(Strategy, 'auth0') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    // Print all relevant environment variables
    console.log('ENV AUTH0_DOMAIN:', process.env.AUTH0_DOMAIN);
    console.log('ENV AUTH0_CLIENT_ID:', process.env.AUTH0_CLIENT_ID);
    console.log('ENV AUTH0_CLIENT_SECRET:', process.env.AUTH0_CLIENT_SECRET);
    console.log('ENV AUTH0_CALLBACK_URL:', process.env.AUTH0_CALLBACK_URL);
    console.log('ENV AUTH0_AUDIENCE:', process.env.AUTH0_AUDIENCE);
    console.log('ENV AUTH0_ISSUER:', process.env.AUTH0_ISSUER);

    // Print config values as seen by ConfigService
    console.log('ConfigService auth.auth0.domain:', configService.get('auth.auth0.domain'));
    console.log('ConfigService auth.auth0.clientId:', configService.get('auth.auth0.clientId'));
    console.log('ConfigService auth.auth0.clientSecret:', configService.get('auth.auth0.clientSecret'));
    console.log('ConfigService auth.auth0.callbackUrl:', configService.get('auth.auth0.callbackUrl'));
    console.log('ConfigService auth.auth0.audience:', configService.get('auth.auth0.audience'));
    console.log('ConfigService auth.auth0.issuer:', configService.get('auth.auth0.issuer'));

    super({
      domain: configService.get('auth.auth0.domain'),
      clientID: configService.get('auth.auth0.clientId'),
      clientSecret: configService.get('auth.auth0.clientSecret'),
      callbackURL: configService.get('auth.auth0.callbackUrl'),
      scope: 'openid email profile',
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    extraParams: any,
    profile: any,
    done: any,
  ) {
    const user = await this.authService.validateUser(
      profile.id,
      profile.emails[0].value,
      profile.displayName,
      profile.picture,
    );
    done(null, user);
  }
} 