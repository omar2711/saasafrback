import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CommonModule } from '../../common/common.module';
import { DatabaseModule } from '../../database/database.module';
import { GetMeUseCase } from './application/usecases/get-me.usecase';
import { LoginUseCase } from './application/usecases/login.usecase';
import { LogoutUseCase } from './application/usecases/logout.usecase';
import { RefreshTokenUseCase } from './application/usecases/refresh-token.usecase';
import { AuthController } from './presentation/auth.controller';

@Module({
  imports: [DatabaseModule, JwtModule.register({}), CommonModule],
  controllers: [AuthController],
  providers: [LoginUseCase, RefreshTokenUseCase, LogoutUseCase, GetMeUseCase],
})
export class AuthModule {}
