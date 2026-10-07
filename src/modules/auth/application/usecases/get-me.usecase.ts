import { Injectable } from '@nestjs/common';
import { JwtUser } from '../../../../common/auth/jwt-user';

@Injectable()
export class GetMeUseCase {
  execute(user?: JwtUser): JwtUser | { anonymous: true } {
    if (!user) {
      return { anonymous: true } as const;
    }

    return user;
  }
}
