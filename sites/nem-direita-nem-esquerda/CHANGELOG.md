# Changelog

## 2.0.2 — 2026-10-09
- Corrige a referência do PIB per capita para o último dado anual disponível da série oficial consultada (2023), sem rotulá-lo como 2025 ou 2026.
- Alinha catálogo, painel, testes de regressão e versão do cache offline.

## 2.0.1 — 2026-10-09 — homologação pendente
- Corrige sintaxe da API BCB e declara runtime ES modules no diretório publicado.
- Acrescenta séries SIDRA, conversões testadas, histórico IPCA e trabalho estadual sem estimativa municipal.
- Consulta macro BCB em paralelo, com referência preservada e falhas visíveis.
- Busca territorial, exportação CSV/JSON do catálogo consultado e consulta RREO.
- Atualiza glossário, documentação, fontes e versão do cache PWA.
- Não certifica DNS, SSL ou cobertura territorial ainda não implementada.

## 1.9 — 2026-10-08 — candidata de publicação
- Detalha Economia, Trabalho, Fiscal e Educação com maior contexto e referências de 2026.
- Adiciona valores monetários em R$ para PIB, componentes econômicos, contas fiscais e proteção social.
- Integra séries fiscais monetárias adicionais do BCB e preserva a distinção entre fluxo e estoque.
- Amplia Bolsa Família/Cadastro Único e referências financeiras do Inep com escopo metodológico explícito.
- Alinha interface, catálogo e cache offline na versão 1.9.
- Deploy automático via Vercel validado pelo status do GitHub; inspeção autenticada do conteúdo segue limitada pela conexão Vercel.

## 1.5 — 2026-10-06
- Novo painel Macro Brasil.
- Indicadores automáticos de PIB trimestral, IPCA 12 meses e desemprego via IBGE/SIDRA.
- Indicadores automáticos de Selic, câmbio, reservas, dívida bruta, primário, juros, nominal e conta corrente via BCB/SGS.
- Leitura integrada factual por atividade, preços, fiscal e setor externo.

## 1.3 — 2026-10-06
- Desemprego, IPCA 12 meses e PIB trimestral automatizados via SIDRA/IBGE.
- Comparação Brasil × estado × município para população e PIB territorial.
- Links compartilháveis preservam o território selecionado.
- API Siconfi pública e monitoramento por GitHub Actions.
- Health check, PWA/SEO, catálogo e status operacional consolidados.

## 1.2 — 2026-10-06
- API própria para BCB, território e health check.
- Perfil territorial com população e PIB via SIDRA.
- PWA/manifest, robots e sitemap.
- Documentação de operação e fontes.
- Base preparada para finanças subnacionais via Siconfi.

## 1.1 — 2026-10-06
- Busca pública, catálogo, glossário e downloads CSV/JSON.

## 1.0 — 2026-10-05
- Painel público inicial com temas nacionais e seletor territorial.

## 1.8.0 — 2026-10-07 — correções técnicas, homologação pendente
- Corrige parsing dos decimais SIDRA e conversão do PIB municipal de milhares de reais para reais.
- Isola falhas de população e PIB territorial e limita tempo de espera das fontes.
- Rejeita níveis/IDs territoriais inválidos, séries BCB herdadas do protótipo e parâmetros Siconfi indevidos.
- Valida respostas BCB/Siconfi e inclui metadados BCB.
- Corrige IDs duplicados, fechamento HTML, link da aba Macro e preservação territorial ao limpar busca.
- Associa labels aos campos, melhora larguras e alvos de toque, e informa corretamente convenção NFSP.
- Usa domínio estável em canonical, sitemap e documentação.
- Corrige fallback offline e escopo do service worker, evitando HTML em respostas de APIs.
- Adiciona oito testes de regressão; integração e produção ainda não homologadas.
