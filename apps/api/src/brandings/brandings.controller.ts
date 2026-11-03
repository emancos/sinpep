import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { BrandingsService } from './brandings.service';
import { CreateBrandingDto } from './dto/create-branding.dto';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

const uploadDir = path.join(process.cwd(), 'uploads', 'brandings');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

@Controller()
export class BrandingsController {
  constructor(private readonly brandingsService: BrandingsService) {}

  /**
   * Rota Pública: Retorna o branding do município pelo slug (?m=palmares) ou o padrão
   */
  @Get('public/branding')
  async getPublicBranding(@Query('m') slug?: string, @Query('municipio') municipioSlug?: string) {
    const effectiveSlug = slug || municipioSlug;
    return this.brandingsService.getPublicBranding(effectiveSlug);
  }

  /**
   * Rota Pública: Lista resumida de municípios ativos
   */
  @Get('public/brandings/list')
  async getPublicList() {
    return this.brandingsService.getPublicList();
  }

  /**
   * Rota Administrativa: Lista completa de municípios
   */
  @Get('admin/brandings')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admin:access')
  async findAll(@Query('search') search?: string) {
    return this.brandingsService.findAll(search);
  }

  /**
   * Rota Administrativa: Detalhes de um município
   */
  @Get('admin/brandings/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admin:access')
  async findOne(@Param('id') id: string) {
    return this.brandingsService.findOne(id);
  }

  /**
   * Rota Administrativa: Cadastro de novo município
   */
  @Post('admin/brandings')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admin:access')
  async create(@Body() dto: CreateBrandingDto) {
    return this.brandingsService.create(dto);
  }

  /**
   * Rota Administrativa: Edição de dados do município
   */
  @Put('admin/brandings/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admin:access')
  async update(@Param('id') id: string, @Body() dto: UpdateBrandingDto) {
    return this.brandingsService.update(id, dto);
  }

  /**
   * Rota Administrativa: Upload do brasão oficial do município
   */
  @Post('admin/brandings/:id/coat-of-arms')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admin:access')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const id = req.params?.id || 'branding';
          const ext = path.extname(file.originalname).toLowerCase();
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
          cb(null, `brasao-${id}-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp|svg\+xml)$/)) {
          return cb(new BadRequestException('Apenas imagens (PNG, JPG, JPEG, WebP, SVG) são permitidas.'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadCoatOfArms(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo de imagem foi enviado.');
    }

    const publicUrl = `/uploads/brandings/${file.filename}`;
    return this.brandingsService.updateCoatOfArms(id, publicUrl);
  }

  /**
   * Rota Administrativa: Remoção de município
   */
  @Delete('admin/brandings/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admin:access')
  async delete(@Param('id') id: string) {
    return this.brandingsService.delete(id);
  }
}
