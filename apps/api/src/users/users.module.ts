import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { ProfilesController } from './profiles.controller';
import { PermissionsController } from './permissions.controller';

@Module({
  imports: [],
  providers: [UsersService],
  controllers: [UsersController, ProfilesController, PermissionsController],
  exports: [UsersService],
})
export class UsersModule {}
