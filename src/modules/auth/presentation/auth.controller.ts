import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import type { JwtUser } from '../../../common/auth/jwt-user';
import { GetMeUseCase } from '../application/usecases/get-me.usecase';
import { LoginUseCase } from '../application/usecases/login.usecase';
import { LogoutUseCase } from '../application/usecases/logout.usecase';
import { RefreshTokenUseCase } from '../application/usecases/refresh-token.usecase';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly getMeUseCase: GetMeUseCase,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.loginUseCase.execute(dto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Renovar access token con refresh token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.refreshTokenUseCase.execute(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar sesión' })
  logout(@CurrentUser() user: JwtUser, @Body() dto: LogoutDto) {
    return this.logoutUseCase.execute(user, dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener usuario autenticado' })
  me(@CurrentUser() user?: JwtUser) {
    return this.getMeUseCase.execute(user);
  }
}
