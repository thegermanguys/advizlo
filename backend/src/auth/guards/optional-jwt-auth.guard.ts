import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Public routes that can personalize a response when a token is present
// (fee quotes) without requiring login. A missing Authorization header is
// anonymous. A present but invalid token still fails, so a returning
// customer is never quoted as if they were new.
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ headers?: { authorization?: string } }>();
    if (!request.headers?.authorization) {
      return true;
    }
    return super.canActivate(context);
  }
}
