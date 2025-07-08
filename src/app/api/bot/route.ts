import { NextResponse } from 'next/server';
import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL!,
  apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTION_NAME = 'empreendimentos';
const VECTOR_SIZE = 1536;

const systemPrompt = `
Você é um assistente imobiliário de alto padrão treinado para atuar exclusivamente consultando o banco de dados vetorial Qdrant, utilizado pela Colnaghi Imóveis.

- Sempre que o usuário pedir links de um empreendimento — seja link do vídeo, link do card, link do tabelão, link da tabela ou "drive das construtoras" — consulte o Qdrant e retorne exatamente o valor dos campos:
  • "DRIVE DAS CONSTRUTORAS"
  • "LINK DOS VIDEOS"
  • "LINK DOS CARDS"
  • "LINK TABELÃO"
  • "LINK TABELA"
- Exiba apenas os links que realmente existem para o empreendimento solicitado. Se algum desses campos estiver vazio, apresente como: "informação não fornecida pela construtora".
- Sempre que listar links, apresente-os de forma clara e amigável, como uma lista de links clicáveis, com nome comercial para cada tipo de link (por exemplo: "Drive das Construtoras", "Vídeo institucional", "Cards digitais", "Tabelão", "Tabela de valores").
- Nunca invente, altere nomes das chaves ou crie links inexistentes. Só utilize exatamente o que está presente no banco Qdrant.

- Utilize SEMPRE as chaves exatas dos campos, conforme a estrutura abaixo: "CONSTRUTORA", "EMPREENDIMENTO", "ESTOQUE", "BAIRRO", "SITUAÇÃO", "ENDEREÇO", "METRAGEM", "DORMS/SUITES", "VAGAS", "INFRAESTRUTURA", "DIFERENCIAIS/FRASE CHAVE", "PREV. ENTREGA", "VALOR A PARTIR DE", "PONTOS FORTES INDICADOS PELO CONSTRUTOR", "PERSONA INDICADA PELO CONSTRUTOR", "CONTATO COMERCIAL 1", "CONTATO COMERCIAL 2", "POLÍTICAS COMERCIAIS", "DRIVE DAS CONSTRUTORAS", "LINK DOS VIDEOS", "LINK DOS CARDS", "LINK TABELÃO", "LINK TABELA".

- Quando algum campo estiver vazio ou não disponível, sinalize de forma natural e comercial, por exemplo: "informação não fornecida pela construtora".

- Links, contatos e políticas comerciais só devem ser apresentados se forem diretamente solicitados pelo usuário ou claramente relevantes ao contexto da resposta.

- Sempre responda em Markdown puro, usando títulos, listas, tabelas e negrito para destacar campos e diferenciais, mas nunca utilize blocos de código (nada de crases ou \`\`\`). A resposta deve ser adequada para ser renderizada em HTML.

- Se o usuário pedir ficha técnica, apresente todos os campos de forma organizada e comercial. Se solicitar apenas um campo, retorne só aquele campo. Caso a consulta for sobre valor, metragem, bairro, infraestrutura, previsão de entrega, etc., retorne o campo solicitado com fidelidade.

- Para perguntas globais, siga as regras:
  1. "liste todos os empreendimentos": consulte apenas a base de empreendimentos do Qdrant;
  2. "liste todas as construtoras": utilize somente a base de construtoras do Qdrant;
  3. "quantos empreendimentos/construtoras participam da campanha": responda com "Atualmente, 52 empreendimentos fazem parte da campanha" ou "36 construtoras participam da campanha Mês das Construtoras".

- Responda sempre de forma personalizada, comercial, formal, valorizando os diferenciais, infraestrutura, localização e valores dos empreendimentos conforme o padrão de comunicação da Colnaghi Imóveis.

- Nunca forneça informações fora da estrutura das bases Qdrant e nunca invente dados.

- Adapte sempre o formato da resposta conforme o contexto (lista, ficha, texto, tabela), valorizando a clareza comercial e a experiência do usuário.


`;

function isAskForLinks(text: string) {
  return /(link|drive|tabela|cards?|vídeo|video)/i.test(text);
}

export async function POST(req: Request) {
  try {
    const { prompt, historico } = await req.json();

    // Gerar embedding da pergunta
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: prompt,
    });
    const vector = embedding.data[0].embedding;

    // Busca vetorial no Qdrant
    const searchResult = await qdrant.search(COLLECTION_NAME, {
      vector,
      limit: 5,
      with_payload: true,
    });

    // Decide se deve mandar só os campos de links ou ficha técnica completa
    const pedeLinks = isAskForLinks(prompt);

    const contexto = searchResult
      .map((item: any) => {
        const p = item.payload;
        if (pedeLinks) {
          return `
### ${p.EMPREENDIMENTO || 'Empreendimento'} (${p.CONSTRUTORA || 'Construtora'})
**Drive das Construtoras:** ${p["DRIVE DAS CONSTRUTORAS"] || 'informação não fornecida pela construtora'}
**Vídeo institucional:** ${p["LINK DOS VIDEOS"] || 'informação não fornecida pela construtora'}
**Cards digitais:** ${p["LINK DOS CARDS"] || 'informação não fornecida pela construtora'}
**Tabelão:** ${p["LINK TABELÃO"] || 'informação não fornecida pela construtora'}
**Tabela de valores:** ${p["LINK TABELA"] || 'informação não fornecida pela construtora'}
`;
        }
        // Contexto completo para outros tipos de pergunta
        return `
### ${p.EMPREENDIMENTO || 'Empreendimento'} (${p.CONSTRUTORA || 'Construtora'})
**Bairro:** ${p.BAIRRO || '-'}
**Situação:** ${p.SITUAÇÃO || '-'}
**Metragem:** ${p.METRAGEM || '-'}
**Dorms/Suítes:** ${p["DORMS/SUITES"] || '-'}
**Vagas:** ${p.VAGAS || '-'}
**Entrega:** ${p["PREV. ENTREGA"] || '-'}
**Valor a partir de:** ${p["VALOR A PARTIR DE"] || '-'}
**Diferenciais:** ${p["DIFERENCIAIS/FRASE CHAVE"] || '-'}
**Infraestrutura:** ${p.INFRAESTRUTURA || '-'}
`;
      })
      .join('\n---\n');

    // ChatGPT para resposta comercial e estruturada
    const chat = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...(historico && Array.isArray(historico)
          ? historico.map((h: any) => ({
              role: h.role === 'bot' ? 'assistant' : h.role,
              content: String(h.content || ''),
            }))
          : []),
        {
          role: 'user',
          content: `
Abaixo estão os dados disponíveis dos empreendimentos consultados na base Qdrant.

${contexto}

Responda à seguinte pergunta do usuário, de forma clara, sucinta e informativa, sempre utilizando Markdown para títulos, listas, negritos e links (sem blocos de código):

Pergunta: ${prompt}

Resposta:
          `,
        },
      ],
      temperature: 1,
      max_tokens: 800,
    });

    const resposta = chat.choices[0].message.content;

    return NextResponse.json({ resposta });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { resposta: 'Erro ao buscar resposta. Tente novamente.' },
      { status: 500 }
    );
  }
}
