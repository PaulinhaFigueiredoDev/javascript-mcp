import { expect, test } from '@playwright/test';

async function consultarViaCep(caminho, testInfo) {
  const url = `https://viacep.com.br/ws/${caminho}/json/`;
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  expect(response.ok, `ViaCEP deve responder com sucesso: ${url}`).toBe(true);
  const dados = await response.json();
  await testInfo.attach('resposta-real-viacep.json', {
    body: JSON.stringify({ url, dados }, null, 2),
    contentType: 'application/json',
  });
  return dados;
}

async function conectarAoServidor(page) {
  await page.goto('/');
  const switchConexao = page.getByRole('switch', { name: 'Connect or disconnect "node"' });
  // O input do switch fica sob a trilha visual do Mantine; o label recebe o clique.
  await page.locator('label').filter({ has: switchConexao }).click();
  await expect(page.getByRole('button', { name: 'Disconnect from server' })).toBeVisible();
  await page.getByText('Tools', { exact: true }).click();
  await expect(page.getByTestId('tools-screen')).toHaveAttribute('data-tool-count', '2');
}

test('usuário consulta um CEP e recebe os dados reais do ViaCEP', async ({ page }, testInfo) => {
  const cep = '04344902';
  const endereco = await consultarViaCep(cep, testInfo);
  expect(endereco.erro).toBeFalsy();
  await conectarAoServidor(page);

  await page.getByRole('button', { name: 'consultar-cep' }).click();
  await page.getByRole('textbox', { name: 'cep' }).fill(cep);
  await page.getByRole('button', { name: 'Execute Tool' }).click();

  await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible();
  await expect(page.getByTestId('tools-screen')).toHaveAttribute('data-call-status', 'ok');
  const textoEsperado = `CEP: ${endereco.cep}\nLogradouro: ${endereco.logradouro}\nBairro: ${endereco.bairro}\nCidade: ${endereco.localidade}\nUF: ${endereco.uf}`;
  await expect(page.getByText(textoEsperado, { exact: true })).toBeVisible();
});

test('usuário recebe erro de validação ao enviar um CEP inválido', async ({ page }) => {
  await conectarAoServidor(page);

  await page.getByRole('button', { name: 'consultar-cep' }).click();
  await page.getByRole('textbox', { name: 'cep' }).fill('abc');
  await page.getByRole('button', { name: 'Execute Tool' }).click();

  await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible();
  await expect(page.getByRole('alert', { name: 'Tool Error' })).toContainText('O CEP deve ter 8 dígitos');
});

test('usuário percorre as duas primeiras páginas de endereços reais', async ({ page }, testInfo) => {
  const uf = 'SP';
  const cidade = 'São Paulo';
  const logradouro = 'Rua Augusta';
  const caminho = `${uf}/${encodeURIComponent(cidade)}/${encodeURIComponent(logradouro)}`;
  const enderecos = await consultarViaCep(caminho, testInfo);
  expect(Array.isArray(enderecos)).toBe(true);
  expect(enderecos.length).toBeGreaterThan(10);
  await conectarAoServidor(page);

  await page.getByRole('button', { name: 'buscar-ceps-por-endereco' }).click();
  await page.getByRole('textbox', { name: 'uf' }).fill(uf);
  await page.getByRole('textbox', { name: 'cidade' }).fill(cidade);
  await page.getByRole('textbox', { name: 'logradouro' }).fill(logradouro);
  await page.getByRole('button', { name: 'Execute Tool' }).click();

  await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible();
  await expect(page.getByTestId('tools-screen')).toHaveAttribute('data-call-status', 'ok');
  const itens = enderecos.slice(0, 10).map((endereco, indice) =>
    `${indice + 1}. CEP: ${endereco.cep}\nLogradouro: ${endereco.logradouro}\nBairro: ${endereco.bairro}\nCidade: ${endereco.localidade}\nUF: ${endereco.uf}`,
  );
  const textoEsperado = `Exibindo 1 a 10 de ${enderecos.length} resultados retornados pelo ViaCEP. Para ver os próximos, repita a busca com offset=10.\n\n${itens.join('\n\n')}`;
  await expect(page.getByText(textoEsperado, { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Close results' }).click();
  await page.getByLabel('offset').fill('10');
  await page.getByRole('button', { name: 'Execute Tool' }).click();

  const segundaPagina = enderecos.slice(10, 20).map((endereco, indice) =>
    `${indice + 11}. CEP: ${endereco.cep}\nLogradouro: ${endereco.logradouro}\nBairro: ${endereco.bairro}\nCidade: ${endereco.localidade}\nUF: ${endereco.uf}`,
  );
  const fim = Math.min(20, enderecos.length);
  const proximo = fim < enderecos.length ? ` Para ver os próximos, repita a busca com offset=${fim}.` : '';
  const textoSegundaPagina = `Exibindo 11 a ${fim} de ${enderecos.length} resultados retornados pelo ViaCEP.${proximo}\n\n${segundaPagina.join('\n\n')}`;
  await expect(page.getByText(textoSegundaPagina, { exact: true })).toBeVisible();
});
