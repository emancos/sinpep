import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export interface BpaHeaderDto {
  competencia: string; // AAAAMM
  orgaoNome: string;
  orgaoSigla: string;
  orgaoCnpj: string;
  orgaoDestinoNome: string;
  indicadorDestino: 'M' | 'E';
  versaoSistema: string;
}

export interface BpaRecordDto {
  id?: string;
  cnes: string;
  competencia: string; // AAAAMM
  cnsProfissional: string;
  cboProfissional: string;
  nomeProfissional?: string;
  nomeEstabelecimento?: string;
  dataAtendimento: string; // AAAAMMDD
  procedimento: string; // 10 dígitos SIGTAP
  procedimentoNome?: string;
  cpfPaciente: string;
  cnsPaciente: string;
  sexo: string; // M ou F
  ibge: string;
  cid: string;
  idade: string;
  quantidade: string; // 6 dígitos
  caraterAtendimento: string; // 2 dígitos
  numeroAutorizacao: string; // 13 chars
  origem: string; // BPA
  nomePaciente: string;
  dataNascimento: string; // AAAAMMDD
  racaCor: string; // 2 dígitos
  etnia: string;
  nacionalidade: string; // 3 dígitos
  cep: string;
  logradouro: string; // 3 dígitos
  endereco: string;
  complemento: string;
  numero: string;
  bairro: string;
  telefone: string;
  email: string;
  ine: string;
  situacaoRua?: boolean;
  semCpf?: boolean;
}

export class QueryBpaRecordsDto {
  @IsNotEmpty()
  @IsString()
  competencia: string; // AAAA-MM

  @IsOptional()
  @IsString()
  unitId?: string;

  @IsOptional()
  @IsString()
  doctorId?: string;

  @IsOptional()
  @IsString()
  patientIdType?: 'CPF' | 'CNS';
}

export class CreateBpaBatchDto {
  @IsNotEmpty()
  @IsString()
  competencia: string;

  @IsNotEmpty()
  @IsString()
  unitId: string;

  @IsNotEmpty()
  totalRecords: number;

  @IsNotEmpty()
  @IsString()
  fileContent: string;

  @IsOptional()
  metadata?: any;
}

export class ExportBpaPdfDto {
  @IsNotEmpty()
  records: BpaRecordDto[];

  @IsNotEmpty()
  @IsString()
  competencia: string;

  @IsNotEmpty()
  @IsString()
  unit: string; // CNES ou Nome da Unidade
}
