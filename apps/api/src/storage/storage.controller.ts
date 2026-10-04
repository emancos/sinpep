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
  MaxFileSizeValidator
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Response } from 'express';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
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
  async getFile(@Param('id') id: string, @Res() res: Response) {
    const { stream, mimeType, name } = await this.storageService.getFileStream(id);
    
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${name}"`,
    });
    
    stream.pipe(res);
  }
}
