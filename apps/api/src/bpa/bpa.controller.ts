import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Param,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { BpaService } from './bpa.service';
import { BpaPdfService } from './bpa-pdf.service';
import { CreateBpaBatchDto, ExportBpaPdfDto, QueryBpaRecordsDto } from './dto/bpa.dto';

@Controller('bpa')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BpaController {
  constructor(
    private readonly bpaService: BpaService,
    private readonly bpaPdfService: BpaPdfService,
  ) {}

  /**
   * Consulta a lista de atendimentos finalizados para a competência e unidade
   */
  @Get('records')
  @Permissions('bpa:access')
  async getRecords(@Req() req: any, @Query() query: QueryBpaRecordsDto) {
    return this.bpaService.getRecords(
      req.user,
      query.competencia,
      query.unitId,
      query.doctorId,
      query.patientIdType,
    );
  }

  /**
   * Lista unidades de saúde permitidas para o usuário logado
   */
  @Get('units')
  @Permissions('bpa:access')
  async listUnits(@Req() req: any) {
    return this.bpaService.listUnits(req.user);
  }

  /**
   * Gera o conteúdo do arquivo oficial magnético do BPA-I (.TXT)
   */
  @Post('export-txt')
  @Permissions('bpa:access')
  @HttpCode(HttpStatus.OK)
  async exportTxt(
    @Req() req: any,
    @Body() body: { competencia: string; unitId: string; records: any[] },
  ) {
    const fileContent = await this.bpaService.exportTxt(
      req.user,
      body.competencia,
      body.unitId,
      body.records || [],
    );

    const cleanComp = (body.competencia || '').replace(/\D/g, '');
    const filename = `BPA_I_${cleanComp}_${body.unitId || 'SINPEP'}.txt`;

    return {
      filename,
      fileContent,
      totalRecords: body.records?.length || 0,
    };
  }

  /**
   * Gera e transmite diretamente o documento PDF oficial (Formulário BPA-I)
   */
  @Post('export-pdf')
  @Permissions('bpa:access')
  async exportPdf(@Body() body: ExportBpaPdfDto, @Res() res: Response) {
    try {
      const records = body.records || [];
      const competencia = body.competencia;
      const unit = body.unit || 'UNIDADE DE SAUDE';

      const unitInfo = {
        cnes: records[0]?.cnes || '0000000',
        name: records[0]?.nomeEstabelecimento || unit,
      };

      const pdfBuffer = await this.bpaPdfService.generateBpaPdf(records, competencia, unitInfo);

      const filename = `Formulario_BPA_I_${competencia.replace(/[^0-9]/g, '')}.pdf`;

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length,
      });

      res.end(pdfBuffer);
    } catch (error) {
      console.error('Erro ao gerar PDF do BPA:', error);
      res.status(500).json({ message: 'Erro ao gerar o PDF oficial do BPA-I.' });
    }
  }

  /**
   * Arquiva e congela um Lote Oficial no banco de dados com assinatura SHA-256
   */
  @Post('batches')
  @Permissions('bpa:access')
  async createBatch(@Req() req: any, @Body() dto: CreateBpaBatchDto) {
    return this.bpaService.createBatch(req.user, dto);
  }

  /**
   * Lista os lotes oficiais arquivados
   */
  @Get('batches')
  @Permissions('bpa:access')
  async listBatches(
    @Req() req: any,
    @Query('competencia') competencia?: string,
    @Query('unitId') unitId?: string,
  ) {
    return this.bpaService.listBatches(req.user, competencia, unitId);
  }

  /**
   * Baixa o arquivo .TXT congelado do lote oficial
   */
  @Get('batches/:id/download')
  @Permissions('bpa:access')
  async downloadBatch(@Req() req: any, @Param('id') id: string, @Res() res: Response) {
    const batch = await this.bpaService.getBatchById(req.user, id);

    const filename = `BPA_${batch.competencia}_${batch.healthCenter?.cnes || 'OFICIAL'}.txt`;

    res.set({
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    res.send(batch.fileContent);
  }

  /**
   * Remove lote oficial arquivado (Apenas Administrador)
   */
  @Delete('batches/:id')
  @Permissions('bpa:access')
  async deleteBatch(@Req() req: any, @Param('id') id: string) {
    return this.bpaService.deleteBatch(req.user, id);
  }

  /**
   * Regras de exportação (De-Para)
   */
  @Get('export-rules')
  @Permissions('bpa:access')
  async listRules() {
    return this.bpaService.listRules();
  }

  @Post('export-rules')
  @Permissions('bpa:access')
  async createRule(
    @Body() dto: { healthCenterId?: string; procedureCode: string; cboOverride: string; description?: string },
  ) {
    return this.bpaService.createRule(dto);
  }
}
