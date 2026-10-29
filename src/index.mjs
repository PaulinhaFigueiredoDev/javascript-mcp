import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { readFileSync } from 'node:fs';
import { cepInputSchema, consultarCep } from './consultar-cep.mjs';
import { enderecoInputSchema, buscarCepsPorEndereco } from './buscar-ceps-por-endereco.mjs';
import { consultarCepOutputSchema, buscarCepsOutputSchema } from './saida-estruturada.mjs';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

// Inicia um servidor MCP que se comunica pela entrada e saída do terminal.
// A função cria o servidor, configura seu nome e versão e o entrega ao
// serveStdio, que cuida da comunicação com os clientes MCP.
const handle = serveStdio(() => {
    const server = new McpServer({ name: 'javascript-mcp', version });

// Registra a tool de consulta de CEP.
// O inputSchema valida o CEP recebido; a função async processa a consulta
// e devolve o resultado ao cliente MCP.
    server.registerTool(
      "consultar-cep",
      {
        description: "Consulta informações de um CEP",
        inputSchema: cepInputSchema,
        outputSchema: consultarCepOutputSchema,
      },
      ({ cep }) => consultarCep({ cep }),
    );

    // Busca possíveis CEPs quando a pessoa conhece o endereço, mas não o CEP.
    server.registerTool(
      'buscar-ceps-por-endereco',
      {
        description: 'Busca CEPs pela UF, cidade e logradouro. Retorna até 10 por chamada; use offset para obter os próximos resultados.',
        inputSchema: enderecoInputSchema,
        outputSchema: buscarCepsOutputSchema,
      },
      ({ uf, cidade, logradouro, offset, limit }) => buscarCepsPorEndereco({ uf, cidade, logradouro, offset, limit }),
    );

    return server;
});
