/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable */
import {
  Body,
  Controller,
  ExecutionContext,
  Get,
  INestApplication,
  Logger,
  Module,
  Post,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DecodeJWT } from '../src/decode-jwt.decorator';
import { User } from '../src/user.decorator';
import { Allow } from 'class-validator';
import { Transform } from 'class-transformer';

import { APP_GUARD } from '@nestjs/core';

const fakeJWT: string =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IddsqkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

/**
 * Mock of the AuthGuard class
 */
class AuthGuardMock {
  /**
   * Check token
   */
  public canActivate(context: ExecutionContext): boolean {
    const request: { user: { someId: string }; accessTokenJWT: string } = context.switchToHttp().getRequest();
    request.user = {
      someId: 'id',
    };
    request.accessTokenJWT = fakeJWT;

    return true;
  }
}

export const EnumFallback = (args: { type: unknown; fallback: (value: unknown) => unknown }) => {
  return Transform((params) => {
    const newValue = args.fallback(params.value);

    return newValue;
  });
};

export enum UserRole {
  ADMIN = 'ADMIN',
  READER = 'READER',
}

class UserDto {
  private static readonly logger: Logger = new Logger(UserDto.name);

  @EnumFallback({
    type: UserRole,
    fallback: (value: UserRole) => {
      UserDto.logger.error(`Invalid user role ${value}`);
      return UserRole.ADMIN;
    },
  })
  @Allow()
  public role?: UserRole;
}

/**
 * Controller
 */
@Controller()
/**
 * Controller returning a lot of documents
 */
class FakeAppController {
  /**
   * Fake route that returns the custom param
   */
  @Get('/user')
  public getUser(@User() user: unknown): unknown {
    return user;
  }

  @Post('/user')
  public createUser(@Body() user: UserDto): unknown {
    console.log('[AL] user', user);
    return user;
  }

  @Get('/decode-jwt')
  public getDecodedJWT(@DecodeJWT() decodedJwt: unknown): unknown {
    return decodedJwt;
  }
}

/**
 * Fake app module
 */
/* eslint-disable */
@Module({
  controllers: [FakeAppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuardMock,
    },
  ],
})
class AppModule {}
/* eslint-enable */

export async function createTestAppModule(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication({});

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    }),
  );

  return app;
}
