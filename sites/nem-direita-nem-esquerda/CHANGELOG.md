# Changelog

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
