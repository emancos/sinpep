import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateHealthCenterDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  cnes?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  nurseName?: string;

  @IsBoolean()
  @IsOptional()
  stSolicitante?: boolean;

  @IsBoolean()
  @IsOptional()
  stExecutante?: boolean;

  @IsString()
  @IsOptional()
  coUf?: string;

  @IsString()
  @IsOptional()
  sgUf?: string;

  @IsString()
  @IsOptional()
  coCep?: string;

  @IsString()
  @IsOptional()
  nuCnpj?: string;

  @IsString()
  @IsOptional()
  dsEmail?: string;

  @IsString()
  @IsOptional()
  noBairro?: string;

  @IsString()
  @IsOptional()
  tpGestao?: string;

  @IsString()
  @IsOptional()
  noFantasia?: string;

  @IsString()
  @IsOptional()
  nuEndereco?: string;

  @IsString()
  @IsOptional()
  nuTelefone?: string;

  @IsString()
  @IsOptional()
  noMunicipio?: string;

  @IsString()
  @IsOptional()
  noLogradouro?: string;

  @IsBoolean()
  @IsOptional()
  stCotaTabela?: boolean;

  @IsString()
  @IsOptional()
  noComplemento?: string;

  @IsString()
  @IsOptional()
  noRazaoSocial?: string;

  @IsBoolean()
  @IsOptional()
  stSolicitaFora?: boolean;

  @IsString()
  @IsOptional()
  coMunicipioIbge?: string;

  @IsString()
  @IsOptional()
  coNaturezaJuridica?: string;

  @IsString()
  @IsOptional()
  coNaturezaOrganizacao?: string;
}
