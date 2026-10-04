import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';
import { PatientsService } from '../patients/patients.service';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private drive: drive_v3.Drive;

  constructor(private readonly patientsService: PatientsService) {
    this.initDrive();
  }

  private initDrive() {
    try {
      if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
        this.logger.warn('Google Drive credentials not configured. Uploads will fail.');
        return;
      }

      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/drive'],
      });

      this.drive = google.drive({ version: 'v3', auth });
      this.logger.log('Google Drive initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Google Drive', error);
    }
  }

  private async getPatientFolderId(patientId: string): Promise<string> {
    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
    if (!rootFolderId) {
      throw new InternalServerErrorException('GOOGLE_DRIVE_ROOT_FOLDER_ID is not set');
    }

    const patient = await this.patientsService.findOne(patientId);
    if (!patient) {
      throw new NotFoundException('Paciente não encontrado');
    }

    const identifier = patient.cpf || patient.cns || patient.id.split('-')[0];
    const folderName = `${patient.name} - ${identifier}`;

    // Buscar pasta existente
    const res = await this.drive.files.list({
      q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${rootFolderId}' in parents and trashed=false`,
      fields: 'files(id, name)',
    });

    if (res.data.files && res.data.files.length > 0) {
      return res.data.files[0].id!;
    }

    // Criar se não existir
    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [rootFolderId],
    };

    const folder = await this.drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
    });

    return folder.data.id!;
  }

  async uploadFile(file: Express.Multer.File, patientId: string): Promise<string> {
    if (!this.drive) {
      throw new InternalServerErrorException('Google Drive integration not configured');
    }

    try {
      const folderId = await this.getPatientFolderId(patientId);

      const fileMetadata = {
        name: file.originalname,
        parents: [folderId],
      };

      const media = {
        mimeType: file.mimetype,
        body: Readable.from(file.buffer),
      };

      const uploaded = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id',
      });

      return uploaded.data.id!;
    } catch (error) {
      this.logger.error('Error uploading file to Drive', error);
      throw new InternalServerErrorException('Failed to upload file');
    }
  }

  async getFileStream(fileId: string) {
    if (!this.drive) {
      throw new InternalServerErrorException('Google Drive integration not configured');
    }

    try {
      const metadata = await this.drive.files.get({ fileId, fields: 'mimeType, name' });
      const stream = await this.drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
      );
      
      return {
        stream: stream.data,
        mimeType: metadata.data.mimeType,
        name: metadata.data.name
      };
    } catch (error) {
      this.logger.error(`Error downloading file ${fileId} from Drive`, error);
      throw new NotFoundException('Arquivo não encontrado no Google Drive');
    }
  }
}
