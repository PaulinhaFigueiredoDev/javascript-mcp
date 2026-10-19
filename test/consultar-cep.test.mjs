import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import { cepInputSchema, consultarCep } from '../src/consultar-cep.mjs';

test('aceita um CEP com 8 dígitos e rejeita formatos inválidos', () => {
  assert.equal(cepInputSchema.safeParse({ cep: '01001000' }).success, true);

  for (const cep of ['01001-000', 'abc', '1234567', '123456789']) {
    const result = cepInputSchema.safeParse({ cep });
    assert.equal(result.success, false);
    assert.equal(result.error.issues[0].message, 'O CEP deve ter 8 dígitos');
  }
});

test('retorna os dados do endereço para um CEP encontrado', async () => {
  const result = await consultarCep({ cep: '01001000' }, async (url, options) => {
    assert.equal(url, 'https://viacep.com.br/ws/01001000/json/');
    assert.ok(options.signal instanceof AbortSignal);
    return {
      ok: true,
      json: async () => ({
        cep: '01001-000',
        logradouro: 'Praça da Sé',
        bairro: 'Sé',
        localidade: 'São Paulo',
        uf: 'SP',
      }),
    };
  });

  assert.equal(result.isError, undefined);
  assert.match(result.content[0].text, /CEP: 01001-000/);
  assert.match(result.content[0].text, /Cidade: São Paulo/);
  assert.match(result.content[0].text, /UF: SP/);
});

test('informa quando o ViaCEP não encontra o CEP', async () => {
  const result = await consultarCep({ cep: '00000000' }, async () => ({
    ok: true,
    json: async () => ({ erro: 'true' }),
  }));

  assert.equal(result.isError, true);
  assert.equal(result.content[0].text, 'CEP 00000000 não encontrado.');
});

test('retorna erro quando o ViaCEP responde com falha HTTP', async () => {
  const log = mock.method(console, 'error', () => {});
  try {
    const result = await consultarCep({ cep: '01001000' }, async () => ({
      ok: false,
      status: 503,
    }));

    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /Não foi possível consultar o ViaCEP agora/);
    assert.equal(log.mock.callCount(), 1);
  } finally {
    log.mock.restore();
  }
});

test('retorna erro quando a requisição falha', async () => {
  const log = mock.method(console, 'error', () => {});
  try {
    const result = await consultarCep({ cep: '01001000' }, async () => {
      throw new Error('Falha de rede');
    });

    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /Não foi possível consultar o ViaCEP agora/);
    assert.equal(log.mock.callCount(), 1);
  } finally {
    log.mock.restore();
  }
});
