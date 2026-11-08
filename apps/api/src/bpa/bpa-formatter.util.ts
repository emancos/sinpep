import { BpaHeaderDto, BpaRecordDto } from './dto/bpa.dto';

export const padRight = (str: string | undefined | null, length: number): string => {
  const safeStr = (str || '').toString();
  return safeStr.padEnd(length, ' ').substring(0, length);
};

export const padLeft = (str: string | undefined | null, length: number, char: string = '0'): string => {
  const safeStr = (str || '').toString();
  return safeStr.padStart(length, char).substring(0, length);
};

export const removeAccents = (str: string | undefined | null): string => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .toUpperCase();
};

export const LOGRADOURO_MAP: { prefix: string; code: string }[] = [
  { prefix: 'RUA', code: '081' },
  { prefix: 'AVENIDA', code: '006' },
  { prefix: 'AV', code: '006' },
  { prefix: 'TRAVESSA', code: '097' },
  { prefix: 'TRAV', code: '097' },
  { prefix: 'PRACA', code: '071' },
  { prefix: 'PCA', code: '071' },
  { prefix: 'ALAMEDA', code: '003' },
  { prefix: 'RODOVIA', code: '079' },
  { prefix: 'ROD', code: '079' },
  { prefix: 'ESTRADA', code: '028' },
  { prefix: 'EST', code: '028' },
  { prefix: 'SITIO', code: '091' },
  { prefix: 'FAZENDA', code: '031' },
  { prefix: 'CHACARA', code: '015' },
  { prefix: 'VILA', code: '105' },
  { prefix: 'LOTEAMENTO', code: '048' },
];

export const extractLogradouro = (fullAddress: string): { logCode: string; logName: string } => {
  if (!fullAddress) return { logCode: '081', logName: '' };

  const addressClean = removeAccents(fullAddress).trim();
  for (const item of LOGRADOURO_MAP) {
    if (addressClean.startsWith(item.prefix + ' ') || addressClean === item.prefix) {
      const remaining = fullAddress.substring(item.prefix.length).trim().replace(/^[,-\s]+/, '');
      return { logCode: item.code, logName: remaining || fullAddress };
    }
  }

  return { logCode: '081', logName: fullAddress };
};

/**
 * Gera a string do arquivo magnético oficial do BPA-I do DATASUS
 * - Header (Linha tipo '01'): exatamente 130 chars + \r\n (132 bytes)
 * - Registros (Linha tipo '03'): exatamente 351 chars + \r\n (353 bytes)
 * - Checksum algorítmico oficial cbc-smt-vrf
 */
export const generateBpaITxt = (header: BpaHeaderDto, records: BpaRecordDto[]): string => {
  const totalLines = records.length;
  const totalSheets = Math.ceil(totalLines / 99) || 1;

  let recordsOutput = '';
  let sum = 0;

  records.forEach((r, index) => {
    const folha = Math.floor(index / 99) + 1;
    const linha = (index % 99) + 1;

    let line = '03'; // 001-002: Tipo de Registro BPA-I
    line += padLeft(r.cnes.replace(/\D/g, ''), 7); // 003-009: CNES Executante
    line += padLeft(r.competencia.replace(/\D/g, ''), 6); // 010-015: Competência AAAAMM
    line += padLeft(r.cnsProfissional.replace(/\D/g, ''), 15); // 016-030: CNS Profissional
    line += padLeft(r.cboProfissional.replace(/\D/g, ''), 6); // 031-036: CBO Profissional
    line += padLeft(r.dataAtendimento.replace(/\D/g, ''), 8); // 037-044: Data Atendimento AAAAMMDD
    line += padLeft(folha.toString(), 3); // 045-047: Número da Folha
    line += padLeft(linha.toString(), 2); // 048-049: Linha da Folha
    line += padLeft(r.procedimento.replace(/\D/g, ''), 10); // 050-059: Procedimento SIGTAP (10 dígitos)

    const cns = r.cnsPaciente ? r.cnsPaciente.replace(/\D/g, '') : '';
    const cpf = r.cpfPaciente ? r.cpfPaciente.replace(/\D/g, '') : '';

    if (cpf) {
      line += padRight('', 15); // 060-074: 15 espaços caso tenha CPF
    } else {
      line += padLeft(cns, 15); // 060-074: CNS do paciente
    }

    line += padRight((r.sexo || 'M').toUpperCase(), 1); // 075-075: Sexo
    line += padLeft(r.ibge.replace(/\D/g, ''), 6); // 076-081: Código IBGE Município
    line += padRight(removeAccents(r.cid).substring(0, 4), 4); // 082-085: CID-10 Principal
    line += padLeft(r.idade, 3); // 086-088: Idade
    line += padLeft(r.quantidade || '000001', 6); // 089-094: Quantidade
    line += padLeft(r.caraterAtendimento || '01', 2); // 095-096: Caráter de Atendimento
    line += padRight(r.numeroAutorizacao, 13); // 097-109: Nº da Autorização / APAC
    line += padRight(r.origem || 'BPA', 3); // 110-112: Origem
    line += padRight(removeAccents(r.nomePaciente), 30); // 113-142: Nome do Paciente
    line += padLeft(r.dataNascimento.replace(/\D/g, ''), 8); // 143-150: Data de Nascimento AAAAMMDD

    const racaCorFinal = (!r.racaCor || r.racaCor.trim() === '99') ? '03' : r.racaCor.trim();
    line += padLeft(racaCorFinal, 2); // 151-152: Raça/Cor
    line += padRight(r.etnia, 4); // 153-156: Etnia
    line += padLeft(r.nacionalidade || '010', 3); // 157-159: Nacionalidade
    line += padRight('   ', 3); // 160-162: Código Serviço
    line += padRight('   ', 3); // 163-165: Código Classificação
    line += padRight('        ', 8); // 166-173: Sequência Equipe
    line += padRight('    ', 4); // 174-177: Área Equipe
    line += padRight('              ', 14); // 178-191: CNPJ OPM
    line += padLeft(r.cep.replace(/\D/g, ''), 8); // 192-199: CEP
    line += padLeft(r.logradouro || '081', 3); // 200-202: Tipo Logradouro

    const endereco = r.endereco?.trim() ? r.endereco : 'NAO INFORMADO';
    line += padRight(removeAccents(endereco), 30); // 203-232: Endereço
    line += padRight(removeAccents(r.complemento), 10); // 233-242: Complemento
    line += padRight(removeAccents(r.numero?.trim() ? r.numero : 'SN'), 5); // 243-247: Número
    line += padRight(removeAccents(r.bairro), 30); // 248-277: Bairro
    line += padRight(r.telefone ? r.telefone.replace(/\D/g, '') : '', 11); // 278-288: Telefone com DDD
    line += padRight(r.email, 40); // 289-328: E-mail
    line += r.ine ? padLeft(r.ine.replace(/\D/g, ''), 10) : '          '; // 329-338: Código INE

    if (cns && !cpf) {
      line += padRight('', 11); // 339-349: 11 espaços se for CNS sem CPF
    } else {
      line += padLeft(cpf, 11); // 339-349: CPF do paciente
    }

    // Posições finais oficiais
    line += r.situacaoRua ? 'S' : (r.situacaoRua === false ? 'N' : ' '); // 350: Situação de rua
    line += r.semCpf ? 'S' : (r.semCpf === false ? 'N' : ' '); // 351: Sem CPF
    line += '\r\n'; // 352-353

    // Acumula checksum
    const procStr = line.substring(49, 59);
    const qtStr = line.substring(88, 94);
    sum += Number(procStr) + Number(qtStr);

    recordsOutput += line;
  });

  const modulo = sum % 1111;
  const controle = (modulo + 1111).toString();

  // Cabeçalho (Linha tipo '01' - 130 chars + \r\n = 132 bytes)
  let headerOutput = '';
  headerOutput += '01'; // 001-002: Header
  headerOutput += '#BPA#'; // 003-007: Identificador constante
  headerOutput += padLeft(header.competencia.replace(/\D/g, ''), 6); // 008-013: Competência AAAAMM
  headerOutput += padLeft(totalLines.toString(), 6); // 014-019: Quantidade de Registros
  headerOutput += padLeft(totalSheets.toString(), 6); // 020-025: Quantidade de Folhas
  headerOutput += padLeft(controle, 4); // 026-029: Código de Controle
  headerOutput += padRight(removeAccents(header.orgaoNome), 30); // 030-059: Nome do Órgão
  headerOutput += padRight(removeAccents(header.orgaoSigla), 6); // 060-065: Sigla do Órgão
  headerOutput += padLeft(header.orgaoCnpj.replace(/\D/g, ''), 14); // 066-079: CNPJ
  headerOutput += padRight(removeAccents(header.orgaoDestinoNome), 40); // 080-119: Destino
  headerOutput += padRight(header.indicadorDestino || 'M', 1); // 120-120: Destino M ou E
  headerOutput += padRight(header.versaoSistema || 'SINPEP1.40', 10); // 121-130: Versão Sistema
  headerOutput += '\r\n'; // 131-132

  return headerOutput + recordsOutput;
};
