import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import { buscarCepsPorEndereco, enderecoInputSchema } from '../src/buscar-ceps-por-endereco.mjs';

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
});

test('informa quando a busca não encontra CEPs', async () => {
  const result = await buscarCepsPorEndereco(
    { uf: 'SP', cidade: 'São Paulo', logradouro: 'Rua Inexistente' },
    async () => ({ ok: true, json: async () => [] }),
  );

  assert.equal(result.isError, undefined);
  assert.match(result.content[0].text, /Nenhum CEP encontrado/);
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

test('limita a resposta a dez endereços', async () => {
  const enderecos = Array.from({ length: 11 }, (_, indice) => ({
    cep: String(indice).padStart(8, '0'),
    logradouro: 'Rua Teste',
    bairro: 'Centro',
    localidade: 'São Paulo',
    uf: 'SP',
  }));
  const result = await buscarCepsPorEndereco(
    { uf: 'SP', cidade: 'São Paulo', logradouro: 'Rua Teste' },
    async () => ({ ok: true, json: async () => enderecos }),
  );

  assert.match(result.content[0].text, /Exibindo 10 de 11 resultados/);
  assert.match(result.content[0].text, /CEP: 00000009/);
  assert.doesNotMatch(result.content[0].text, /CEP: 00000010/);
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
