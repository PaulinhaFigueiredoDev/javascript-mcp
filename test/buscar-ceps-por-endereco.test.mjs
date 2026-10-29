import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import { buscarCepsPorEndereco, enderecoInputSchema } from '../src/buscar-ceps-por-endereco.mjs';
import { buscarCepsOutputSchema } from '../src/saida-estruturada.mjs';

test('valida UF, cidade e logradouro antes da busca', () => {
  assert.equal(enderecoInputSchema.safeParse({ uf: 'SP', cidade: 'São Paulo', logradouro: 'Praça da Sé' }).success, true);
  assert.equal(enderecoInputSchema.safeParse({ uf: 'SP', cidade: 'São Paulo', logradouro: 'Rua 25 de Março' }).success, true);

  for (const [entrada, mensagem] of [
    [{ uf: 'S1', cidade: 'São Paulo', logradouro: 'Sé' }, 'A UF deve ter 2 letras'],
    [{ uf: 'SP', cidade: 'SP', logradouro: 'Praça da Sé' }, 'A cidade deve ter pelo menos 3 caracteres'],
    [{ uf: 'SP', cidade: 'São Paulo', logradouro: 'Sé' }, 'O logradouro deve ter pelo menos 3 caracteres'],
    [{ uf: 'SP', cidade: 'São Paulo', logradouro: '123' }, 'O logradouro deve conter pelo menos uma letra'],
    [{ uf: 'SP', cidade: 'São Paulo', logradouro: ' 4567 ' }, 'O logradouro deve conter pelo menos uma letra'],
  ]) {
    const result = enderecoInputSchema.safeParse(entrada);
    assert.equal(result.success, false);
    assert.equal(result.error.issues[0].message, mensagem);
  }

  assert.equal(enderecoInputSchema.safeParse({ uf: 'SP', cidade: 'São Paulo', logradouro: 123 }).success, false);
  assert.equal(enderecoInputSchema.safeParse({ uf: 'SP', cidade: 'São Paulo', logradouro: 'Rua Teste', offset: 49, limit: 10 }).success, true);
  for (const extras of [{ offset: -1 }, { offset: 50 }, { offset: 1.5 }, { limit: 0 }, { limit: 11 }, { limit: 2.5 }]) {
    assert.equal(enderecoInputSchema.safeParse({ uf: 'SP', cidade: 'São Paulo', logradouro: 'Rua Teste', ...extras }).success, false);
  }
});

test('busca CEPs com os segmentos da URL codificados e apresenta os endereços', async () => {
  const result = await buscarCepsPorEndereco(
    { uf: 'sp', cidade: ' São Paulo ', logradouro: ' Praça da Sé ' },
    async (url, options) => {
      assert.equal(url, 'https://viacep.com.br/ws/SP/S%C3%A3o%20Paulo/Pra%C3%A7a%20da%20S%C3%A9/json/');
      assert.ok(options.signal instanceof AbortSignal);
      return {
        ok: true,
        json: async () => [{
          cep: '01001-000',
          logradouro: 'Praça da Sé',
          bairro: 'Sé',
          localidade: 'São Paulo',
          uf: 'SP',
        }],
      };
    },
  );

  assert.equal(result.isError, undefined);
  assert.match(result.content[0].text, /1 resultado encontrado/);
  assert.match(result.content[0].text, /CEP: 01001-000/);
  assert.match(result.content[0].text, /Logradouro: Praça da Sé/);
  assert.deepEqual(result.structuredContent, {
    enderecos: [{ cep: '01001-000', logradouro: 'Praça da Sé', bairro: 'Sé', cidade: 'São Paulo', uf: 'SP' }],
    total: 1,
    offset: 0,
    limit: 10,
    proximoOffset: null,
  });
  assert.equal(buscarCepsOutputSchema.safeParse(result.structuredContent).success, true);
});

test('informa quando a busca não encontra CEPs', async () => {
  const result = await buscarCepsPorEndereco(
    { uf: 'SP', cidade: 'São Paulo', logradouro: 'Rua Inexistente' },
    async () => ({ ok: true, json: async () => [] }),
  );

  assert.equal(result.isError, undefined);
  assert.match(result.content[0].text, /Nenhum CEP encontrado/);
  assert.deepEqual(result.structuredContent, { enderecos: [], total: 0, offset: 0, limit: 10, proximoOffset: null });
  assert.equal(buscarCepsOutputSchema.safeParse(result.structuredContent).success, true);
});

test('aceita logradouro e bairro vazios em um endereço da busca', async () => {
  const result = await buscarCepsPorEndereco(
    { uf: 'SP', cidade: 'São Paulo', logradouro: 'Rua Teste' },
    async () => ({ ok: true, json: async () => [{
      cep: '01001-000', logradouro: '', bairro: '', localidade: 'São Paulo', uf: 'SP',
    }] }),
  );

  assert.equal(result.isError, undefined);
  assert.match(result.content[0].text, /Logradouro: \nBairro: \nCidade: São Paulo/);
});

test('rejeita a lista inteira se houver um endereço incompleto, mesmo além dos dez exibidos', async () => {
  const log = mock.method(console, 'error', () => {});
  try {
    const enderecos = Array.from({ length: 10 }, () => ({
      cep: '01001-000', logradouro: 'Rua Teste', bairro: 'Centro', localidade: 'São Paulo', uf: 'SP',
    }));
    enderecos.push({ cep: '01001-000' });

    const result = await buscarCepsPorEndereco(
      { uf: 'SP', cidade: 'São Paulo', logradouro: 'Rua Teste' },
      async () => ({ ok: true, json: async () => enderecos }),
    );

    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /Não foi possível buscar CEPs no ViaCEP agora/);
    assert.equal(log.mock.callCount(), 1);
  } finally {
    log.mock.restore();
  }
});

test('permite buscar os resultados depois dos dez primeiros', async () => {
  const enderecos = Array.from({ length: 11 }, (_, indice) => ({
    cep: String(indice).padStart(8, '0'),
    logradouro: 'Rua Teste',
    bairro: 'Centro',
    localidade: 'São Paulo',
    uf: 'SP',
  }));
  const fetchImpl = async () => ({ ok: true, json: async () => enderecos });
  const entrada = { uf: 'SP', cidade: 'São Paulo', logradouro: 'Rua Teste' };
  const result = await buscarCepsPorEndereco(entrada, fetchImpl);

  assert.match(result.content[0].text, /Exibindo 1 a 10 de 11 resultados retornados pelo ViaCEP/);
  assert.match(result.content[0].text, /offset=10/);
  assert.match(result.content[0].text, /CEP: 00000009/);
  assert.doesNotMatch(result.content[0].text, /CEP: 00000010/);
  assert.deepEqual({ ...result.structuredContent, enderecos: result.structuredContent.enderecos.length }, {
    enderecos: 10, total: 11, offset: 0, limit: 10, proximoOffset: 10,
  });
  assert.equal(buscarCepsOutputSchema.safeParse(result.structuredContent).success, true);

  const ultimaPagina = await buscarCepsPorEndereco({ ...entrada, offset: 10 }, fetchImpl);
  assert.equal(ultimaPagina.isError, undefined);
  assert.match(ultimaPagina.content[0].text, /Exibindo 11 a 11 de 11 resultados/);
  assert.match(ultimaPagina.content[0].text, /11\. CEP: 00000010/);
  assert.doesNotMatch(ultimaPagina.content[0].text, /offset=11/);
  assert.equal(ultimaPagina.structuredContent.enderecos[0].cep, '00000010');
  assert.equal(ultimaPagina.structuredContent.proximoOffset, null);
  assert.equal(buscarCepsOutputSchema.safeParse(ultimaPagina.structuredContent).success, true);
});

test('respeita o limite escolhido e informa quando o offset está fora da lista', async () => {
  const enderecos = Array.from({ length: 5 }, (_, indice) => ({
    cep: String(indice).padStart(8, '0'),
    logradouro: 'Rua Teste',
    bairro: 'Centro',
    localidade: 'São Paulo',
    uf: 'SP',
  }));
  const fetchImpl = async () => ({ ok: true, json: async () => enderecos });
  const entrada = { uf: 'SP', cidade: 'São Paulo', logradouro: 'Rua Teste' };

  const pagina = await buscarCepsPorEndereco({ ...entrada, offset: 2, limit: 2 }, fetchImpl);
  assert.match(pagina.content[0].text, /Exibindo 3 a 4 de 5 resultados/);
  assert.match(pagina.content[0].text, /3\. CEP: 00000002/);
  assert.match(pagina.content[0].text, /offset=4/);
  assert.doesNotMatch(pagina.content[0].text, /CEP: 00000004/);
  assert.deepEqual(pagina.structuredContent.enderecos.map(({ cep }) => cep), ['00000002', '00000003']);
  assert.deepEqual({ total: pagina.structuredContent.total, offset: pagina.structuredContent.offset, limit: pagina.structuredContent.limit, proximoOffset: pagina.structuredContent.proximoOffset }, {
    total: 5, offset: 2, limit: 2, proximoOffset: 4,
  });
  assert.equal(buscarCepsOutputSchema.safeParse(pagina.structuredContent).success, true);

  const foraDaLista = await buscarCepsPorEndereco({ ...entrada, offset: 5 }, fetchImpl);
  assert.equal(foraDaLista.isError, undefined);
  assert.match(foraDaLista.content[0].text, /nenhum a partir do offset 5/);
  assert.match(foraDaLista.content[0].text, /offset entre 0 e 4/);
  assert.deepEqual(foraDaLista.structuredContent, { enderecos: [], total: 5, offset: 5, limit: 10, proximoOffset: null });
  assert.equal(buscarCepsOutputSchema.safeParse(foraDaLista.structuredContent).success, true);
});

test('retorna erro quando a API falha ou responde em formato inesperado', async () => {
  const log = mock.method(console, 'error', () => {});
  try {
    for (const fetchImpl of [
      async () => ({ ok: false, status: 503 }),
      async () => ({ ok: true, json: async () => ({ erro: true }) }),
      async () => { throw new Error('Falha de rede'); },
    ]) {
      const result = await buscarCepsPorEndereco(
        { uf: 'SP', cidade: 'São Paulo', logradouro: 'Praça da Sé' },
        fetchImpl,
      );
      assert.equal(result.isError, true);
      assert.match(result.content[0].text, /Não foi possível buscar CEPs no ViaCEP agora/);
    }
    assert.equal(log.mock.callCount(), 3);
  } finally {
    log.mock.restore();
  }
});
