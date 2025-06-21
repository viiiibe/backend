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

    // Safely extract email from profile with multiple fallback strategies
    let email = null;
    
    // Try profile.emails array first (most common)
    if (profile.emails && Array.isArray(profile.emails) && profile.emails.length > 0) {
      email = profile.emails[0].value;
    }
    // Try direct email property
    else if (profile.email) {
      email = profile.email;
    }
    // Try _json.emails (some Auth0 configurations)
    else if (profile._json && profile._json.email) {
      email = profile._json.email;
    }
    // Try _json.emails array
    else if (profile._json && profile._json.emails && Array.isArray(profile._json.emails) && profile._json.emails.length > 0) {
      email = profile._json.emails[0];
    }

    // Check if email is available
    if (!email) {
      console.error('No email found in Auth0 profile. Full profile:', JSON.stringify(profile, null, 2));
      return done(new Error('Email is required but not provided by Auth0. Please ensure your Auth0 application is configured to include email scope.'), null);
    }

    console.log('Extracted email:', email);

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
