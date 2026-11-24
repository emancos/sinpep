import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  Get,
  Param,
  Res,
  UseGuards,
  ParseFilePipe,
  MaxFileSizeValidator,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Response } from 'express';

const ALLOWED_STORAGE_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

@Controller('storage')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @Permissions('patients:write')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_STORAGE_MIMES.has(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Tipo de arquivo não permitido. Apenas PDF e imagens (JPEG, PNG, WEBP) são aceitos.',
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB limit
        ],
      }),
    )
    file: Express.Multer.File,
    @Body('patientId') patientId: string,
  ) {
    const fileId = await this.storageService.uploadFile(file, patientId);
    return { fileId, name: file.originalname };
  }

  @Get('file/:id')
  @Permissions('patients:read')
  async getFile(@Param('id') id: string, @Res() res: Response) {
    const { stream, mimeType, name } = await this.storageService.getFileStream(id);

    const safeName = (name || 'arquivo').replace(/[\r\n"]/g, '_');
    const asciiFallback = safeName.replace(/[^\x20-\x7E]/g, '_') || 'arquivo';
    const resolvedMime = mimeType || 'application/octet-stream';
    const dangerousInlineMimes = new Set([
      'text/html',
      'application/xhtml+xml',
      'image/svg+xml',
      'application/javascript',
      'text/javascript',
    ]);
    const disposition = dangerousInlineMimes.has(resolvedMime.toLowerCase()) ? 'attachment' : 'inline';

    res.set({
      'Content-Type': resolvedMime,
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': `${disposition}; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
    });

    stream.pipe(res);
  }
}
