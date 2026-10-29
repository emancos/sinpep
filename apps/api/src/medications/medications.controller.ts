import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { MedicationsService } from './medications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';

@Controller('medications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MedicationsController {
  constructor(private readonly medicationsService: MedicationsService) {}

  @Get()
  @Permissions('admin:access')
  findAll(@Query() query: PaginationQueryDto) {
    return this.medicationsService.findAll(query);
  }

  @Get('stats')
  @Permissions('admin:access')
  getStats() {
    return this.medicationsService.getStats();
  }

  @Get('search')
  search(
    @Query('q') q: string,
    @Query('activeOnly') activeOnly?: string,
    @Query('limit') limit?: string,
  ) {
    const isActiveOnly = activeOnly !== 'false';
    const limitNum = limit ? Math.min(parseInt(limit, 10) || 30, 100) : 30;
    return this.medicationsService.search(q || '', isActiveOnly, limitNum);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.medicationsService.findById(id);
  }

  @Post()
  @Permissions('admin:access')
  create(@Body() dto: CreateMedicationDto) {
    return this.medicationsService.create(dto);
  }

  @Put(':id')
  @Permissions('admin:access')
  update(@Param('id') id: string, @Body() dto: UpdateMedicationDto) {
    return this.medicationsService.update(id, dto);
  }

  @Patch(':id/toggle-active')
  @Permissions('admin:access')
  toggleActive(@Param('id') id: string) {
    return this.medicationsService.toggleActive(id);
  }

  @Delete(':id')
  @Permissions('admin:access')
  delete(@Param('id') id: string) {
    return this.medicationsService.delete(id);
  }

  @Post('import-csv')
  @Permissions('admin:access')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: os.tmpdir(),
        filename: (_req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `anvisa-${uniqueSuffix}${path.extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 300 * 1024 * 1024, // 300 MB
      },
    }),
  )
  async importCsv(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo CSV foi enviado.');
    }

    try {
      return await this.medicationsService.importCsvFile(file.path);
    } finally {
      // Clean up temporary file
      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (e) {
        console.error('Erro ao remover arquivo temporário:', e);
      }
    }
  }

  @Post('sync-local-csv')
  @Permissions('admin:access')
  async syncLocalCsv() {
    return this.medicationsService.syncLocalCsv();
  }
}
