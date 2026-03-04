#!/usr/bin/env node

import readline from "readline";

const DEFAULT_KEY = "SUA_CHAVE_AQUI"; // coloque sua key real aqui

// Interface STDIO (MCP usa isso)
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

function send(response) {
  process.stdout.write(JSON.stringify(response) + "\n");
}

rl.on("line", async (line) => {
  try {
    const request = JSON.parse(line);

    // ============================================
    // 1️⃣ Handshake / Initialize
    // ============================================
    if (request.method === "initialize") {
      return send({
        jsonrpc: "2.0",
        id: request.id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: "promo-0rientd-llm-skill",
            version: "0.2.0"
          }
        }
      });
    }

    // ============================================
    // 2️⃣ Listar Tools
    // ============================================
    if (request.method === "tools/list") {
      return send({
        jsonrpc: "2.0",
        id: request.id,
        result: {
          tools: [
            {
              name: "get_random_promo",
              description:
                "Retorna os dados brutos JSON de um jogo aleatório em promoção na plataforma solicitada (eshop, xbox ou psn). O modelo deve interpretar e formatar a resposta para o usuário. O modelo também deve responder em formato de tabela, separando 'chave' e 'valor' em colunas, para que as informações fiquem mais fáceis de serem compreendidas. Responda sempre de forma amigável e diga algo sobre o jogo, caso o modelo saiba alguma coisa sobre o jogo em questão.",
              inputSchema: {
                type: "object",
                properties: {
                  platform: {
                    type: "string",
                    description:
                      "Plataforma desejada: eshop (Nintendo Switch), xbox ou psn (PlayStation)"
                  }
                },
                required: []
              }
            }
          ]
        }
      });
    }

    // ============================================
    // 3️⃣ Executar Tool
    // ============================================
    if (request.method === "tools/call") {
      const { name, arguments: args } = request.params;

      if (name === "get_random_promo") {
        const platform = args?.platform || "eshop";

        const baseUrl = `https://promo.0rientd.dev.br/v1/${platform}/key/${DEFAULT_KEY}/random_game`;

        try {
          const response = await fetch(baseUrl);
          const json = await response.json();

          // ⚠️ MUITO IMPORTANTE:
          // MCP NÃO pode retornar type: "json"
          // Então retornamos como string
          const rawJsonString = JSON.stringify(json);

          return send({
            jsonrpc: "2.0",
            id: request.id,
            result: {
              content: [
                {
                  type: "text",
                  text: rawJsonString
                }
              ]
            }
          });

        } catch (error) {
          return send({
            jsonrpc: "2.0",
            id: request.id,
            result: {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    error: "Erro ao buscar promoção",
                    details: error.message
                  })
                }
              ]
            }
          });
        }
      }
    }

  } catch (error) {
    send({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32603,
        message: "Internal error",
        data: error.message
      }
    });
  }
});
