import * as z from 'zod/v4';

export const enderecoInputSchema = z.object({
  uf: z.string().regex(/^[A-Za-z]{2}$/, 'A UF deve ter 2 letras'),
  cidade: z.string().trim().min(3, 'A cidade deve ter pelo menos 3 caracteres'),
  logradouro: z.string().trim().min(3, 'O logradouro deve ter pelo menos 3 caracteres'),
});

const LIMITE_RESULTADOS = 10;

export async function buscarCepsPorEndereco({ uf, cidade, logradouro }, fetchImpl = fetch) {
  const ufNormalizada = uf.toUpperCase();
  const cidadeNormalizada = cidade.trim();
  const logradouroNormalizado = logradouro.trim();
  const url = `https://viacep.com.br/ws/${encodeURIComponent(ufNormalizada)}/${encodeURIComponent(cidadeNormalizada)}/${encodeURIComponent(logradouroNormalizado)}/json/`;

  try {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(5000) });

    if (!response.ok) {
      throw new Error(`ViaCEP respondeu com HTTP ${response.status}`);
    }

    const enderecos = await response.json();

    if (!Array.isArray(enderecos)) {
      throw new Error('ViaCEP respondeu em um formato inesperado');
    }

    if (enderecos.length === 0) {
      return {
        content: [{ type: 'text', text: `Nenhum CEP encontrado para ${logradouroNormalizado}, ${cidadeNormalizada}/${ufNormalizada}.` }],
      };
    }

    const itens = enderecos.slice(0, LIMITE_RESULTADOS).map((endereco, indice) =>
      `${indice + 1}. CEP: ${endereco.cep}\nLogradouro: ${endereco.logradouro}\nBairro: ${endereco.bairro}\nCidade: ${endereco.localidade}\nUF: ${endereco.uf}`,
    );
    const resumo = enderecos.length > LIMITE_RESULTADOS
      ? `Exibindo ${LIMITE_RESULTADOS} de ${enderecos.length} resultados. Refine o logradouro para uma busca mais precisa.`
      : enderecos.length === 1
        ? '1 resultado encontrado.'
        : `${enderecos.length} resultados encontrados.`;

    return {
      content: [{ type: 'text', text: `${resumo}\n\n${itens.join('\n\n')}` }],
    };
  } catch (error) {
    console.error('Falha ao buscar CEPs no ViaCEP:', error);
    return {
      content: [{ type: 'text', text: 'Não foi possível buscar CEPs no ViaCEP agora. Tente novamente.' }],
      isError: true,
    };
  }
}
