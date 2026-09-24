export interface ViaCepAddress {
 logradouro: string;
 bairro: string;
 localidade: string;
 uf: string;
 ibge: string;
}

/**
 * Fetches address details from ViaCEP API using a given CEP.
 * Removes non-numeric characters and validates that the clean CEP has exactly 8 digits.
 * Throws an error if the API returns an error or if the request fails.
 */
export async function fetchAddressByCep(cep: string): Promise<ViaCepAddress> {
 const cleanCep = cep.replace(/\D/g, '');

 if (!/^[0-9]{8}$/.test(cleanCep)) {
 throw new Error('Formato de CEP inválido');
 }

 const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
 
 if (!response.ok) {
 throw new Error('Falha na requisição de CEP');
 }

 const data = await response.json();

 if (data.erro === true || data.erro === 'true') {
 throw new Error('CEP não encontrado');
 }

 return {
 logradouro: data.logradouro || '',
 bairro: data.bairro || '',
 localidade: data.localidade || '',
 uf: data.uf || '',
 ibge: data.ibge || '',
 };
}
