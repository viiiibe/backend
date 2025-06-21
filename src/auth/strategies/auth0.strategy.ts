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
    console.log(
      'ConfigService auth.auth0.domain:',
      configService.get('auth.auth0.domain'),
    );
    console.log(
      'ConfigService auth.auth0.clientId:',
      configService.get('auth.auth0.clientId'),
    );
    console.log(
      'ConfigService auth.auth0.clientSecret:',
      configService.get('auth.auth0.clientSecret'),
    );
    console.log(
      'ConfigService auth.auth0.callbackUrl:',
      configService.get('auth.auth0.callbackUrl'),
    );
    console.log(
      'ConfigService auth.auth0.audience:',
      configService.get('auth.auth0.audience'),
    );
    console.log(
      'ConfigService auth.auth0.issuer:',
      configService.get('auth.auth0.issuer'),
    );

    super({
      domain: configService.get('auth.auth0.domain'),
      clientID: configService.get('auth.auth0.clientId'),
      clientSecret: configService.get('auth.auth0.clientSecret'),
      callbackURL: configService.get('auth.auth0.callbackUrl'),
      scope: 'openid email profile',
      state: false,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    extraParams: any,
    profile: any,
    done: any,
  ) {
    // Debug logging for profile data
    console.log('Auth0 Profile:', {
      id: profile.id,
      emails: profile.emails,
      email: profile.email,
      displayName: profile.displayName,
      picture: profile.picture,
    });

    // Generate a random email instead of using Auth0 email
    const randomId =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    const email = `user_${randomId}@example.com`;

    console.log('Generated random email:', email);

    const user = await this.authService.validateUser(
      profile.id,
      email,
      profile.displayName,
      profile.picture,
    );

    // Attach the Auth0 access token to the user object
    const userWithToken = {
      ...user,
      auth0AccessToken: accessToken,
    };

    done(null, userWithToken);
  }
}
