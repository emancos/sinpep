import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { RegulationService } from './regulation.service';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('regulation')
export class RegulationController {
  constructor(private readonly regulationService: RegulationService) {}

  // =========================================================================
  // MÓDULO SOLICITANTE (UBS)
  // =========================================================================

  @Post('requests')
  @Permissions('regulation-solicitor:create')
  @UseInterceptors(
    FilesInterceptor('attachments', 10, {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Tipo de anexo inválido. Apenas PDF e imagens (JPEG/PNG) são permitidos.'), false);
        }
      },
    }),
  )
  async createRequest(
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    return this.regulationService.createRequest(body, files, req.user);
  }

  @Get('requests/my-center')
  @Permissions('regulation-solicitor:read')
  async findMyCenterRequests(
    @Query('healthCenterId') queryHealthCenterId: string,
    @Query() query: any,
    @Req() req: any,
  ) {
    const healthCenterId = queryHealthCenterId || req.user.healthCenterId;
    if (!healthCenterId) {
      throw new BadRequestException('ID da unidade de saúde solicitante não informado ou não vinculado ao usuário');
    }
    return this.regulationService.findRequestsByHealthCenter(healthCenterId, query);
  }

  @Get('requests/:id')
  async findOne(@Param('id') id: string) {
    return this.regulationService.findOne(id);
  }

  @Patch('requests/:id/resubmit')
  @Permissions('regulation-solicitor:edit_returned')
  @UseInterceptors(
    FilesInterceptor('attachments', 10, {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Tipo de anexo inválido. Apenas PDF e imagens são permitidos.'), false);
        }
      },
    }),
  )
  async resubmitRequest(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    return this.regulationService.resubmitReturnedRequest(id, body, files, req.user);
  }

  @Patch('requests/:id/cancel-by-solicitor')
  @Permissions('regulation-solicitor:cancel')
  async cancelBySolicitor(
    @Param('id') id: string,
    @Body('justification') justification: string,
    @Req() req: any,
  ) {
    return this.regulationService.cancelBySolicitor(id, justification, req.user);
  }

  // =========================================================================
  // MÓDULO CENTRAL DE REGULAÇÃO MUNICIPAL (REGULADOR)
  // =========================================================================

  @Get('inbox')
  @Permissions('regulation-operator:read')
  async findInbox(@Query() query: any) {
    return this.regulationService.findInbox(query);
  }

  @Post('requests/:id/evaluate')
  @Permissions('regulation-operator:evaluate')
  async evaluateRequest(
    @Param('id') id: string,
    @Body('decision') decision: 'AUTORIZAR' | 'DEVOLVER' | 'NEGAR',
    @Body('justification') justification: string,
    @Body('adjustedPriority') adjustedPriority: any,
    @Req() req: any,
  ) {
    return this.regulationService.evaluateRequest(id, decision, justification, adjustedPriority, req.user);
  }

  @Post('requests/:id/schedule')
  @Permissions('regulation-operator:schedule')
  async scheduleRequest(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.regulationService.scheduleRequest(id, body, req.user);
  }

  @Post('requests/:id/cancel-schedule')
  @Permissions('regulation-operator:cancel')
  async cancelSchedule(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.regulationService.cancelSchedule(id, body, req.user);
  }

  // =========================================================================
  // COTAS DE VAGAS
  // =========================================================================

  @Get('quotas')
  @Permissions('regulation-operator:read')
  async findQuotas(@Query() query: any) {
    return this.regulationService.findQuotas(query);
  }

  @Post('quotas')
  @Permissions('regulation-operator:schedule')
  async createQuota(@Body() body: any) {
    return this.regulationService.createQuota(body);
  }

  // =========================================================================
  // VALIDAÇÃO DA CHAVE NA UNIDADE EXECUTANTE
  // =========================================================================

  @Post('validate-token')
  async validateToken(
    @Body('token') token: string,
    @Body('executingHealthCenterId') executingHealthCenterId: string,
    @Req() req: any,
  ) {
    return this.regulationService.validateToken(
      token,
      executingHealthCenterId || req.user.healthCenterId,
      req.user,
    );
  }
}
