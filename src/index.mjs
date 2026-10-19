import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { cepInputSchema, consultarCep } from './consultar-cep.mjs';

// Inicia um servidor MCP que se comunica pela entrada e saída do terminal.
// A função cria o servidor, configura seu nome e versão e o entrega ao
// serveStdio, que cuida da comunicação com os clientes MCP.
const handle = serveStdio(() => {
    const server = new McpServer({ name: 'mcp-dados-brasil', version: '1.0.0' });

// Registra a tool de consulta de CEP.
// O inputSchema valida o CEP recebido; a função async processa a consulta
// e devolve o resultado ao cliente MCP.
    server.registerTool(
      "consultar-cep",
      {
        description: "Consulta informações de um CEP",
        inputSchema: cepInputSchema,
      },
      ({ cep }) => consultarCep({ cep }),
    );

    return server;
});
