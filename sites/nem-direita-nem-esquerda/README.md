# Nem Direita, Nem Esquerda — Brasil em Dados

Portal público apartidário para pesquisa de indicadores oficiais brasileiros.

## Objetivo
Permitir consulta por Brasil, estado e município, separando dado, metodologia, contexto histórico e atribuição política.

## Fontes prioritárias
- IBGE / SIDRA / PNAD Contínua
- Banco Central do Brasil
- Tesouro Nacional / Siconfi
- Inep
- DataSUS
- Ipea / Atlas da Violência
- MDS

## Estrutura
- `index.html`: interface pública
- `dados.json`: catálogo curado e glossário
- `api/bcb.js`: proxy normalizado das séries BCB usadas
- `api/territorio.js`: perfil territorial via SIDRA
- `api/health.js`: saúde das fontes externas
- `vercel.json`: headers e cache
- `manifest.webmanifest`, `robots.txt`, `sitemap.xml`: PWA/SEO

## Regra editorial
O portal não ranqueia governos. Séries oficiais são preservadas com sua periodicidade e revisões. Quando não existe dado comparável no nível territorial solicitado, o portal informa a indisponibilidade em vez de estimar.

## Publicação
A pasta é usada como Root Directory do projeto Vercel. Pushes na branch principal devem gerar novo deployment quando a integração Git está ativa.

## Auditoria técnica 1.8.0 (07/10/2026)

Endereço estável: https://nem-direita-nem-esquerda-brasil.vercel.app/

Execute `node --test sites/nem-direita-nem-esquerda/tests/regression.test.mjs` a partir da raiz do repositório.
Os testes cobrem parsing SIDRA, indicadores derivados, unidade monetária municipal, falha parcial, parâmetros dos proxies e integridade do HTML. Não substituem homologação em navegador e em produção.

SIDRA usa ponto decimal; `...`, `-` e valores ausentes não representam zero. PIB da tabela 5938 em Mil Reais é convertido para reais. Séries NFSP são preservadas: déficit positivo, superávit negativo; nominal = primário + juros para o mesmo período e cobertura. Cache das APIs pertence à CDN; o service worker não devolve HTML para chamadas JSON nem mascara respostas antigas como atuais.

### Pendências de homologação

- A conexão Vercel retornou 403 em `read_protection_bypass` para o projeto `prj_wNMqzE6dGW4lolYN0rZykmI06ek1`, equipe `team_u9QhJW2G5QPSOu7dwyVul7UO`. Inspeção de metadados funciona, acesso autenticado ao conteúdo não.
- Validação completa dos indicadores curados, séries históricas, granularidade setorial, catálogo dinâmico e integrações educacionais, sociais e sanitárias ainda pendente.
- Responsividade em dispositivos, acessibilidade, performance e teste pós-deploy ainda não homologados.
- Esta revisão técnica não certifica o portal como pronto para publicação.


## Versão candidata 1.9 (08/10/2026)

A versão 1.9 consolida o portal para publicação pública: foco em 2026, painel macro, recortes territoriais, busca, catálogo, glossário, downloads, APIs próprias, status de fontes, PWA/SEO e valores monetários em Economia, Fiscal e Social.

A publicação é automática pela integração Git → Vercel. O status de deploy deve estar em `success` no commit final antes de considerar a release concluída.

## Versão 2.0.2 — correção de referência e homologação em andamento (09/10/2026)

Preserva identidade visual v2.0. Acrescenta séries SIDRA, consulta estadual de trabalho, histórico IPCA, consulta RREO, exportação do catálogo consultado e busca territorial.

Execute `npm test` neste diretório. O package.json local declara ES modules para as funções, sem depender do package.json do aplicativo na raiz do monorepo.

Domínio pretendido: https://www.nemdireitaenemesquerda.com.br. Manter canonical Vercel até validar DNS e HTTPS. DNS consultado: Registro.br autoritativo, raiz sem A e www inexistente. A integração Vercel não concedeu acesso aos logs (403); as cinco APIs públicas retornaram FUNCTION_INVOCATION_FAILED antes desta revisão. A publicação não está homologada.

Não confundir cobertura disponível na fonte com cobertura implementada no portal. Educação, Saúde, Social e Violência ainda precisam de carga territorial e auditoria completa dos valores editoriais.


O PIB per capita anual do catálogo usa a última referência oficial disponível na série consultada (2023); o portal a identifica como dado de 2023, nunca como valor corrente de 2025/2026.
