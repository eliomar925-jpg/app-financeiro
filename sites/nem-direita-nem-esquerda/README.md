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
