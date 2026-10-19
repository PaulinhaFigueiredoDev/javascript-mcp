import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from 'zod/v4';

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
        inputSchema: z.object({
          cep: z.string().regex(/^\d{8}$/, "O CEP deve ter 8 dígitos"),
        }),
      },
      async ({ cep }) => {
        try {
          const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
            signal: AbortSignal.timeout(5000),
          });

          if (!response.ok) {
            throw new Error(`ViaCEP respondeu com HTTP ${response.status}`);
          }

          const endereco = await response.json();

          // O ViaCEP indica um CEP inexistente com o campo "erro" na resposta.
          if (endereco.erro) {
            return {
              content: [{ type: "text", text: `CEP ${cep} não encontrado.` }],
              isError: true,
            };
          }

          return {
            content: [{
              type: "text",
              text: `CEP: ${endereco.cep}\nLogradouro: ${endereco.logradouro}\nBairro: ${endereco.bairro}\nCidade: ${endereco.localidade}\nUF: ${endereco.uf}`,
            }],
          };
        } catch (error) {
          console.error("Falha ao consultar o ViaCEP:", error);
          return {
            content: [{ type: "text", text: "Não foi possível consultar o ViaCEP agora. Tente novamente." }],
            isError: true,
          };
        }
      },
    );

    return server;
});
