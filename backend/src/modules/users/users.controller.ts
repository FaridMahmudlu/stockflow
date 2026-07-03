import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import { AssignProductsDto } from './dto/assign-products.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('ADMIN')
  create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser('sub') adminId: string,
  ) {
    return this.usersService.create(createUserDto, adminId);
  }

  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.usersService.findAll(page, limit);
  }

  @Get('me')
  findMe(@CurrentUser('sub') userId: string) {
    return this.usersService.findOne(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser('sub') adminId: string,
  ) {
    return this.usersService.update(id, updateUserDto, adminId);
  }

  @Patch(':id/role')
  @Roles('ADMIN')
  changeRole(
    @Param('id') id: string,
    @Body() changeRoleDto: ChangeRoleDto,
    @CurrentUser('sub') adminId: string,
  ) {
    return this.usersService.changeRole(id, changeRoleDto, adminId);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string, @CurrentUser('sub') adminId: string) {
    return this.usersService.remove(id, adminId);
  }

  @Post(':id/assignments')
  @Roles('ADMIN', 'MANAGER')
  assignProducts(
    @Param('id') id: string,
    @Body() assignDto: AssignProductsDto,
    @CurrentUser('sub') adminId: string,
  ) {
    return this.usersService.assignProducts(id, assignDto, adminId);
  }

  @Delete(':id/assignments/:productId')
  @Roles('ADMIN', 'MANAGER')
  removeAssignment(
    @Param('id') id: string,
    @Param('productId') productId: string,
    @CurrentUser('sub') adminId: string,
  ) {
    return this.usersService.removeAssignment(id, productId, adminId);
  }
}
