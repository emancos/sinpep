import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { EsusImportService, CreateImportJobDto, ProcessBatchDto } from './esus-import.service';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('regulation/esus-import')
export class EsusImportController {
  constructor(private readonly esusImportService: EsusImportService) {}

  /**
   * 1. Obtém as credenciais e parâmetros de conexão com o e-SUS Regulação OpenSearch
   */
  @Get('config')
  @Permissions('regulation-operator:read')
  getConfig() {
    return this.esusImportService.getConfig();
  }

  /**
   * 2. Lista os jobs de importação anteriores com métricas e auditoria
   */
  @Get('jobs')
  @Permissions('regulation-operator:read')
  getJobs() {
    return this.esusImportService.getJobs();
  }

  /**
   * 3. Registra início de um novo job de importação
   */
  @Post('jobs')
  @Permissions('regulation-operator:read')
  createJob(@Body() dto: CreateImportJobDto, @Req() req: any) {
    const userId = req.user?.id;
    return this.esusImportService.createJob(dto, userId);
  }

  /**
   * 4. Processa em lote as requisições e pacientes transmitidos pelo navegador
   */
  @Post('process-batch')
  @Permissions('regulation-operator:read')
  processBatch(@Body() dto: ProcessBatchDto, @Req() req: any) {
    const userId = req.user?.id;
    return this.esusImportService.processBatch(dto, userId);
  }

  /**
   * 5. Finaliza o job como concluído
   */
  @Post('jobs/:id/complete')
  @Permissions('regulation-operator:read')
  completeJob(@Param('id') id: string, @Body() body: any) {
    return this.esusImportService.completeJob(id, body);
  }

  /**
   * 6. Marca o job como falho com mensagem de erro
   */
  @Post('jobs/:id/fail')
  @Permissions('regulation-operator:read')
  failJob(@Param('id') id: string, @Body('errorMessage') errorMessage: string) {
    return this.esusImportService.failJob(id, errorMessage || 'Erro desconhecido durante a importação.');
  }
}
