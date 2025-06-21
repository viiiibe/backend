# Auth0 Automatic User Creation

## Overview

The `/users/me` endpoint now automatically creates users in the database if they don't exist when they first access the endpoint with a valid Auth0 JWT token.

## How It Works

### 1. JWT Token Validation
When a user makes a request to `/users/me` with a Bearer token:

1. The `JwtAuthGuard` intercepts the request
2. The `JwtStrategy` validates the Auth0 JWT token
3. The token payload is extracted and includes:
   - `sub` (user ID from Auth0)
   - `email` (user's email)
   - `name` (user's name, if available)
   - `pictureUrl` (user's profile picture, if available)

### 2. User Resolution
The `getMyProfile` method in `UsersController`:

```typescript
async getMyProfile(@Req() req: any) {
  const userId = req.user.id;        // From Auth0 sub claim
  const userEmail = req.user.email;  // From Auth0 email claim
  
  // Automatically find or create user from Auth0 data
  return this.usersService.findOrCreateUser(userId, {
    email: userEmail,
    name: req.user.name,
    pictureUrl: req.user.pictureUrl,
  });
}
```

### 3. Database Operations
The `UsersService.findOrCreateUser` method:

1. First tries to find the user by Auth0 ID
2. If user exists, returns the existing user with all relations
3. If user doesn't exist, creates a new user with Auth0 data
4. Returns the user (either existing or newly created)

## Auth0 Configuration Requirements

### JWT Token Claims
Make sure your Auth0 application is configured to include the necessary claims in the JWT token:

1. **Standard Claims**: `sub`, `email`
2. **Custom Claims**: `name`, `picture` (or use standard `name` and `picture` claims)

### Auth0 Application Settings
In your Auth0 dashboard:

1. **Application Type**: Single Page Application (SPA) or Machine to Machine
2. **Allowed Callback URLs**: Your frontend callback URL
3. **Allowed Logout URLs**: Your frontend logout URL
4. **Allowed Web Origins**: Your frontend domain

### API Configuration
If using Auth0 API:

1. **Identifier**: Your API identifier (used as audience)
2. **Signing Algorithm**: RS256
3. **Token Expiration**: Configure as needed

## Environment Variables

Required environment variables:

```bash
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_AUDIENCE=your-api-identifier
AUTH0_ISSUER=https://your-domain.auth0.com/
```

## Usage Example

### Frontend Request
```javascript
// Get user profile (automatically creates user if needed)
const response = await fetch('/api/users/me', {
  headers: {
    'Authorization': `Bearer ${auth0Token}`,
    'Content-Type': 'application/json'
  }
});

const user = await response.json();
// user will contain the user profile, whether newly created or existing
```

### Response Format
```json
{
  "id": "auth0|123456789",
  "email": "user@example.com",
  "name": "John Doe",
  "pictureUrl": "https://example.com/avatar.jpg",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "submissions": [...],
  "solvedProblems": [...]
}
```

## Benefits

1. **Seamless User Experience**: Users don't need to explicitly register
2. **Automatic Profile Sync**: User data from Auth0 is automatically synced
3. **Consistent Data**: All user interactions use the same user record
4. **No Duplicate Users**: Prevents multiple user records for the same Auth0 user

## Security Considerations

1. **Token Validation**: JWT tokens are cryptographically verified
2. **User ID Consistency**: Uses Auth0's `sub` claim as the primary user ID
3. **Email Verification**: Auth0 handles email verification
4. **Token Expiration**: Tokens have configurable expiration times

## Troubleshooting

### Common Issues

1. **User Not Created**: Check if Auth0 token contains required claims
2. **Invalid Token**: Verify Auth0 configuration (domain, audience, issuer)
3. **Database Errors**: Ensure database is running and accessible
4. **CORS Issues**: Configure CORS properly for your frontend domain

### Debug Steps

1. Check Auth0 token payload at jwt.io
2. Verify environment variables are set correctly
3. Check application logs for authentication errors
4. Ensure database schema matches the User model 