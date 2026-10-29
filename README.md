# javascript-mcp

Servidor MCP em JavaScript e Node.js para consultar endereços brasileiros pelo CEP ou buscar CEPs a partir de um endereço, usando o [ViaCEP](https://viacep.com.br/). Para testar o MCP em funcionamento, use o [Claude Desktop](#testar-com-claude-desktop) ou o [MCP Inspector](#testar-com-mcp-inspector).

## Sumário

- [Objetivo](#objetivo)
- [Entendendo o MCP neste projeto](docs/entendendo-mcp.md)
- [Ferramentas disponíveis](#ferramentas-disponíveis)
  - [Consultar endereço pelo CEP](#consultar-endereço-pelo-cep)
  - [Buscar CEPs pelo endereço](#buscar-ceps-pelo-endereço)
- [Requisitos](#requisitos)
- [Instalação](#instalação)
- [Como o servidor inicia](#como-o-servidor-inicia)
- [Como testar](#como-testar)
- [Estrutura do projeto](#estrutura)
- [Licença](#licença)

## Objetivo

Este projeto mostra como disponibilizar uma API pública como ferramentas MCP. Um cliente MCP pode consultar um endereço pelo CEP com `consultar-cep` ou buscar CEPs pela UF, cidade e logradouro com `buscar-ceps-por-endereco`.

Se você está usando este repositório para estudar, leia também o guia [Entendendo o MCP neste projeto](docs/entendendo-mcp.md), que explica os conceitos e reúne a documentação oficial usada na implementação.

## Ferramentas disponíveis

### Consultar endereço pelo CEP

`consultar-cep` recebe o argumento `cep` como uma string de **8 dígitos, sem hífen**. Ela valida a entrada, consulta o ViaCEP e retorna CEP, logradouro, bairro, cidade e UF.

Exemplo de entrada:

```json
{ "cep": "01001000" }
```

Exemplo de resultado:

```text
CEP: 01001-000
Logradouro: Praça da Sé
Bairro: Sé
Cidade: São Paulo
UF: SP
```

Um CEP com formato inválido é rejeitado pela validação. Se o CEP não existir, a ferramenta informa que ele não foi encontrado. Falhas na consulta ao ViaCEP também são retornadas como erro da ferramenta.

### Buscar CEPs pelo endereço

`buscar-ceps-por-endereco` recebe três campos obrigatórios: `uf` (duas letras), `cidade` e `logradouro` (pelo menos três caracteres cada). O logradouro precisa conter uma letra: `123` é inválido, mas `Rua 25 de Março` é aceito. Use quando souber o endereço, mas não o CEP. A busca pode retornar vários endereços; quanto mais específico for o logradouro, mais precisa tende a ser a lista. O [ViaCEP limita a pesquisa a 50 CEPs](https://viacep.com.br/); esta tool mostra até 10 por chamada para manter o resultado legível.

Para ver os resultados seguintes, repita a busca com os mesmos dados e informe `offset`: ele começa em `0` e pode ir até `49`. O campo opcional `limit` define quantos resultados mostrar por chamada, de `1` a `10` (padrão: `10`). A resposta informa o próximo `offset` quando houver mais resultados entre os devolvidos pelo ViaCEP. Por exemplo, para ver os itens 11 a 20:

```json
{ "uf": "SP", "cidade": "São Paulo", "logradouro": "Rua Augusta", "offset": 10, "limit": 10 }
```

Se o ViaCEP atingir seu limite de 50 resultados, refine o logradouro para encontrar endereços fora dessa lista.

Exemplo de entrada JSON:

```json
{ "uf": "SP", "cidade": "São Paulo", "logradouro": "Praça da Sé" }
```

Exemplo de resultado:

```text
1 resultado encontrado.

1. CEP: 01001-000
Logradouro: Praça da Sé
Bairro: Sé
Cidade: São Paulo
UF: SP
```

Se a busca não encontrar correspondências, a tool responde `Nenhum CEP encontrado...`. Se o ViaCEP falhar, a tool devolve um erro. A UF pode ser escrita em letras minúsculas; ela será enviada em maiúsculas ao ViaCEP.

## Requisitos

- Node.js 20 ou superior para o servidor. Para seguir o teste com a versão atual do MCP Inspector, use Node.js 22.19 ou superior, com npm.
- Conexão com a internet para consultar o ViaCEP.

## Instalação

Clone o repositório e instale as dependências:

```bash
git clone https://github.com/PaulinhaFigueiredoDev/javascript-mcp.git
cd javascript-mcp
npm install
```

O projeto usa `@modelcontextprotocol/server` para criar o servidor MCP e `zod` para validar os argumentos das ferramentas. As dependências estão declaradas no `package.json`; não é necessário instalá-las globalmente.

## Como o servidor inicia

O arquivo `src/index.mjs` cria uma instância de `McpServer`, registra as duas ferramentas e a entrega a `serveStdio`. O servidor se comunica com o cliente MCP pela entrada e saída padrão do processo (`stdin` e `stdout`). Ele não abre uma porta HTTP.

Para iniciar o processo diretamente, execute na raiz do repositório:

```bash
node src/index.mjs
```

O terminal ficará aguardando a conexão de um cliente MCP; não aparecerá uma página ou resposta nesse comando. Use `Ctrl+C` para encerrar. Quando um cliente MCP executa o servidor, ele inicia esse processo automaticamente.

## Como testar

Escolha uma das opções abaixo para abrir as instruções. O Claude Desktop é o caminho mais simples para experimentar as ferramentas em uma conversa.

<details id="testar-com-claude-desktop">
<summary><strong>Testar com Claude Desktop</strong></summary>

1. Instale o [Claude Desktop](https://claude.com/download) e conclua a [instalação das dependências](#instalação) deste projeto.
2. Encontre o caminho absoluto do Node.js com `command -v node` no macOS/Linux ou `where.exe node` no Windows. Encontre também o caminho absoluto do arquivo `src/index.mjs` deste repositório.
3. Abra o arquivo de configuração do Claude Desktop:
   - macOS: no Finder, pressione **Command + Shift + G**, cole `~/Library/Application Support/Claude/` e abra `claude_desktop_config.json`.
   - Windows: pressione **Win + R**, digite `%APPDATA%\Claude`, pressione **Enter** e abra `claude_desktop_config.json`.

   Se o arquivo já vier preenchido, mantenha as configurações existentes. Insira `mcpServers` **antes da última chave `}`**, no mesmo nível das outras propriedades, e coloque uma vírgula depois da propriedade anterior. Por exemplo, se o arquivo já tiver `coworkUserFilesPath`, o resultado será (substitua os dois caminhos pelos da sua máquina):

   ```json
   {
     "coworkUserFilesPath": "/Users/seu-usuario/Claude",
     "mcpServers": {
       "javascript-mcp": {
         "command": "/caminho/absoluto/para/node",
         "args": ["/caminho/absoluto/para/javascript-mcp/src/index.mjs"]
       }
     }
   }
   ```

   `coworkUserFilesPath` aparece apenas como exemplo de uma configuração existente; não é necessário adicioná-la se não estiver no seu arquivo. Se `mcpServers` já existir, adicione apenas `javascript-mcp` dentro dele.

   Se `claude_desktop_config.json` não existir, crie o arquivo nessa pasta. Se estiver vazio ou contiver apenas `{}`, use o exemplo completo abaixo, substituindo os dois caminhos pelos da sua máquina:

   ```json
   {
     "mcpServers": {
       "javascript-mcp": {
         "command": "/caminho/absoluto/para/node",
         "args": ["/caminho/absoluto/para/javascript-mcp/src/index.mjs"]
       }
     }
   }
   ```

   O valor `"node"` em `command` também pode funcionar se o Claude Desktop encontrar o Node.js no `PATH`; usar o caminho absoluto evita depender disso. No Windows, use `/` nos caminhos do JSON ou escape cada `\` como `\\`.
4. Encerre o Claude Desktop por completo e abra-o novamente para carregar a configuração. Em uma conversa, abra **+ → Connectors** para conferir se `javascript-mcp` e as ferramentas `consultar-cep` e `buscar-ceps-por-endereco` aparecem.
5. Peça, por exemplo, **“Consulte o CEP 01001000”** e **“Busque CEPs da Praça da Sé em São Paulo, SP”**. Se o Claude solicitar autorização para usar uma ferramenta, permita a execução e confira o resultado na conversa.

O Claude Desktop inicia o servidor automaticamente. Se as ferramentas não aparecerem, confira os caminhos no JSON e se `npm install` foi executado na pasta do projeto. Consulte também os [logs do Claude Desktop](https://modelcontextprotocol.io/docs/tools/debugging#viewing-logs).

</details>

<details id="testar-com-mcp-inspector">
<summary><strong>Testar com MCP Inspector</strong></summary>

O [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector) permite conectar ao servidor, chamar as ferramentas e ver as respostas. Na raiz do repositório, execute:

```bash
npx @modelcontextprotocol/inspector node src/index.mjs
```

O Inspector inicia o servidor e abre uma página no navegador. **Não execute `node src/index.mjs` separadamente** durante esse teste: o Inspector inicia o processo para você.

### Passo 1: conectar ao servidor

Na tela inicial, localize o servidor `node`. Ele aparece como **Disconnected** e mostra o comando `node src/index.mjs` e o transporte **STDIO**.

![Tela inicial do Inspector com o servidor node desconectado](img/inicio.png)

Clique no botão de conexão à direita do nome do servidor. O estado deve mudar para **Connected**, como na imagem abaixo. A indicação **Read-only session** significa apenas que a configuração desse servidor foi passada ao iniciar o Inspector e não será editada pela interface.

![Servidor conectado no Inspector](img/clicando%20em%20conecte.png)

### Passo 2: abrir a ferramenta

Clique na aba **Tools**, na parte superior da página. A lista à esquerda deve mostrar `consultar-cep` e `buscar-ceps-por-endereco`. As capturas abaixo foram feitas quando apenas `consultar-cep` estava disponível.

![Aba Tools com a ferramenta consultar-cep](img/clicando%20em%20tools.png)

Clique em **consultar-cep** para abrir o formulário. O campo `cep` tem um asterisco porque é obrigatório. Você pode usar o campo normal ou ativar **Edit as JSON**; os dois modos enviam o mesmo argumento à ferramenta.

![Formulário da ferramenta consultar-cep](img/clicando%20no%20mcp%20consultar-cep.png)

### Passo 3: consultar um CEP válido

Você pode preencher a entrada de duas formas. Escolha **uma** delas e clique em **Execute Tool**.

**Entrada simples:** deixe **Edit as JSON** desligado e digite apenas `01001000` no campo `cep`, sem hífen. Não é preciso escrever o nome do campo nem as chaves do JSON.

![Entrada simples: campo cep preenchido com 01001000](img/input.png)

**Entrada JSON:** ative **Edit as JSON** e informe o objeto completo, incluindo o nome do argumento:

```json
{ "cep": "01001000" }
```

![Entrada JSON: objeto com a propriedade cep e o valor 01001000](img/input-json.png)

Nesse modo, digitar somente `01001000` não funciona, porque a ferramenta espera um objeto com a propriedade `cep`. Os dois modos enviam o mesmo argumento à ferramenta.

Na área **Results**, o endereço deve aparecer com CEP, logradouro, bairro, cidade e UF. O ViaCEP pode devolver o CEP formatado com hífen, como `01001-000`.

![Resultado da consulta do CEP 01001000](img/sucesso.png)

### Passo 4: conferir a validação

Selecione a ferramenta novamente, substitua o CEP por `abc` e clique em **Execute Tool**. Esse valor não tem 8 dígitos numéricos.

![Campo cep preenchido com abc para testar a validação](img/invalido.png)

O resultado esperado é **Tool Error**, com a mensagem **O CEP deve ter 8 dígitos**. A validação ocorre antes da consulta ao ViaCEP.

![Erro de validação exibido para o CEP abc](img/error.png)

Você também pode testar `00000000`. Ele passa pela validação de formato, mas o ViaCEP não encontra um endereço; a ferramenta deve responder `CEP 00000000 não encontrado.`. Isso demonstra a diferença entre **entrada inválida** e **CEP inexistente**.

O painel **Protocol**, à direita, registra as mensagens trocadas entre o Inspector e o servidor. As capturas mostram algumas consultas a `resources/list` e `prompts/list` com erro; este projeto oferece tools, mas não registra resources ou prompts. Essas mensagens não impedem as consultas.

### Passo 5: testar a busca por endereço

Na aba **Tools**, selecione **buscar-ceps-por-endereco**. Com **Edit as JSON** desligado, preencha os campos `uf` com `SP`, `cidade` com `São Paulo` e `logradouro` com `Praça da Sé`. Clique em **Execute Tool**. Se preferir **Edit as JSON**, use o objeto do [exemplo acima](#buscar-ceps-pelo-endereço).

Em **Results**, você verá a quantidade de correspondências e, para cada uma, CEP, logradouro, bairro, cidade e UF. Se houver mais de 10 resultados, a resposta mostra os primeiros 10 e informa o próximo `offset`. Para ver os itens seguintes, mantenha UF, cidade e logradouro e preencha `offset` com o número indicado. Para verificar a validação, experimente `logradouro` igual a `Sé`: o Inspector deve mostrar **Tool Error**, pois são necessários pelo menos três caracteres. Experimente também `123`: a mensagem deve informar que o logradouro precisa conter pelo menos uma letra.

### Testes automatizados

Para repetir no navegador o caminho de um usuario usando o Inspector, instale as dependências e o Chromium do Playwright uma vez:

```bash
npm install
npx playwright install chromium
```

Na raiz do projeto, execute a automação e abra o relatório:

```bash
npm run test:e2e -- --trace on --reporter=html
npx playwright show-report
```

O primeiro comando inicia o MCP Inspector e o servidor automaticamente, executa os testes no Chromium e grava os passos da navegação. O segundo abre o relatório no navegador. Clique em um teste e depois em **Trace** para ver cada ação, as imagens da página e o resultado exibido pelo Inspector. A resposta consultada no ViaCEP também aparece como anexo `resposta-real-viacep.json`. Para acompanhar o navegador enquanto a automação acontece, acrescente `--headed` ao primeiro comando.

O teste consulta o CEP `04344902` e busca `Rua Augusta` em São Paulo usando o **ViaCEP real**, comparando o texto mostrado no Inspector com os dados recebidos da API. Na busca, confere a primeira e a segunda página de endereços. Também envia `abc` para conferir a validação do CEP. É necessária conexão com a internet; uma indisponibilidade ou alteração dos dados da API pode fazer o teste falhar.

O workflow de CI também instala o Chromium e executa `npm run test:e2e` após os testes do Node.js.

</details>

## Estrutura

```text
javascript-mcp/
├── src/
│   ├── index.mjs                     # Inicia o servidor MCP e registra as ferramentas
│   ├── consultar-cep.mjs             # Consulta um endereço pelo CEP
│   └── buscar-ceps-por-endereco.mjs  # Busca CEPs pelo endereço
├── test/              # Testes automatizados das duas ferramentas
├── .github/workflows/ # Testes e validação de commits no GitHub Actions
├── .husky/            # Validação da mensagem no git commit local
├── img/               # Capturas do fluxo de teste no Inspector
├── docs/
│   └── entendendo-mcp.md # Conceitos e referências para estudo
├── package.json       # Dependências do projeto
├── commitlint.config.cjs # Regra de mensagens de commit
├── LICENSE            # Licença ISC do projeto
└── README.md
```

## Licença

Este projeto é distribuído sob a [licença ISC](LICENSE).
