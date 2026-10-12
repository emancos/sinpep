import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { AllocateRoomDto, DeallocateRoomDto } from './dto/allocate-room.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NonDoctorGuard } from '../auth/guards/non-doctor.guard';

@UseGuards(JwtAuthGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  async findAll(@Query() query: { search?: string; date?: string; activeOnly?: string }) {
    return this.roomsService.findAll(query);
  }

  @Get('allocations')
  async getAllocations(@Query('date') date: string) {
    return this.roomsService.getAllocations(date);
  }

  @Get('allocation-for-specialty')
  async getAllocationForSpecialty(
    @Query('specialtyName') specialtyName: string,
    @Query('date') date: string
  ) {
    return this.roomsService.getAllocationForSpecialty(specialtyName, date);
  }

  @Post('allocate')
  async allocateRoom(@Body() dto: AllocateRoomDto, @Req() req: any) {
    return this.roomsService.allocateRoom(dto.roomId, dto.specialtyName, dto.date, req.user?.id);
  }

  @Post('deallocate')
  async deallocateRoom(@Body() dto: DeallocateRoomDto) {
    return this.roomsService.deallocateRoom(dto.specialtyName, dto.date);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.roomsService.findOne(id);
  }

  // Endpoints administrativos de cadastro de ambulatórios/salas: proibidos para Médicos
  @UseGuards(NonDoctorGuard)
  @Post()
  async create(@Body() dto: CreateRoomDto) {
    return this.roomsService.create(dto);
  }

  @UseGuards(NonDoctorGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateRoomDto) {
    return this.roomsService.update(id, dto);
  }

  @UseGuards(NonDoctorGuard)
  @Patch(':id/toggle-active')
  async toggleActive(@Param('id') id: string) {
    return this.roomsService.toggleActive(id);
  }

  @UseGuards(NonDoctorGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.roomsService.remove(id);
  }
}
