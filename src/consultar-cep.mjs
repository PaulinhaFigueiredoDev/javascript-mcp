import * as z from 'zod/v4';
import { enderecoViaCepSchema } from './endereco-viacep.mjs';

export const cepInputSchema = z.object({
  cep: z.string().regex(/^\d{8}$/, 'O CEP deve ter 8 dígitos'),
});

export async function consultarCep({ cep }, fetchImpl = fetch) {
  try {
    const response = await fetchImpl(`https://viacep.com.br/ws/${cep}/json/`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`ViaCEP respondeu com HTTP ${response.status}`);
    }

    const dados = await response.json();

    // O ViaCEP indica um CEP inexistente com o campo "erro" na resposta.
    if (dados?.erro === true || dados?.erro === 'true') {
      return {
        content: [{ type: 'text', text: `CEP ${cep} não encontrado.` }],
        isError: true,
      };
    }

    const endereco = enderecoViaCepSchema.parse(dados);

    return {
      content: [{
        type: 'text',
        text: `CEP: ${endereco.cep}\nLogradouro: ${endereco.logradouro}\nBairro: ${endereco.bairro}\nCidade: ${endereco.localidade}\nUF: ${endereco.uf}`,
      }],
    };
  } catch (error) {
    console.error('Falha ao consultar o ViaCEP:', error);
    return {
      content: [{ type: 'text', text: 'Não foi possível consultar o ViaCEP agora. Tente novamente.' }],
      isError: true,
    };
  }
}
