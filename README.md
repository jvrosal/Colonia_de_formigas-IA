# Simulador Ant System — Etapa 02

Trabalho da disciplina de **Inteligência Artificial da UFPI (2026.2)**: otimização de rotas de entrega por colônia de formigas, especificamente a variante **Ant System**.

**Importante:** esta versão não implementa o algoritmo completo Ant System nem executa a otimização.

**Estado atual:** Etapas 00 (fundação), 01 (grafo e distância) e 02 (feromônios iniciais, pesos, probabilidades e sorteios) implementadas. **Ainda não há construção de rotas por formigas, iterações, evaporação, depósito de feromônios nem execução da simulação.** Esses recursos serão implementados nas Etapas 03–05. Os formulários e controles continuam desabilitados propositalmente até a Etapa 06.

## Tecnologia e execução

- HTML5, CSS3, JavaScript ES modules e SVG nativo, sem frameworks/bibliotecas externas.
- Código funciona inteiramente no navegador; nenhum backend é necessário.
- Durante o desenvolvimento, use um **servidor de arquivos estáticos**, já que navegadores podem bloquear imports ES em `file://`:

```bash
# na pasta colonia-formigas
python -m http.server 8000
# no Windows, também pode utilizar: py -m http.server 8000
```

Abra **http://localhost:8000/**.

Para rodar os testes automáticos, é necessário **Node.js 18+** (recomendado Node.js 22+), sem dependências externas:

```bash
npm test
# ou:
node --test
```

A instalação do Node.js destina-se apenas aos testes de desenvolvimento e não é necessária para utilizar a aplicação publicada.

## Estrutura de arquivos

```text
colonia-formigas/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   ├── core/
│   │   ├── constants.js
│   │   ├── validation.js
│   │   ├── graph.js
│   │   ├── random.js                  # NOVO: PRNG Mulberry32 com semente
│   │   └── ant-system.js              # NOVO: τ₀, pesos, probabilidades, sorteios
│   └── ui/
│       ├── forms.js
│       ├── dashboard.js
│       ├── graph-view.js
│       ├── distance-matrix.js
│       └── probability-preview.js    # NOVO: prévia numérica da primeira escolha
├── tests/
│   ├── stage00.test.js
│   ├── validation.test.js
│   ├── graph.test.js
│   └── ant-system.test.js            # NOVO: 31 testes da Etapa 02
├── package.json
└── README.md
```

## Base matemática: Etapas 00–01

A aplicação começa com cinco pontos válidos: A(100,100), B(300,100), C(450,300), D(300,500), E(100,400), sendo A o depósito. O grafo completo é **não direcionado**, possui 10 arestas, distâncias euclidianas simétricas e diagonal zero.

A matriz de distâncias nunca é arredondada internamente. Uma rota válida começa no depósito, visita cada entrega uma única vez e retorna ao depósito.

Para o retângulo de referência A(0,0), B(3,0), C(3,4), D(0,4), os seis comprimentos possíveis são **14, 16, 18, 16, 18 e 14**, respectivamente para as rotas ABCDA, ABDCA, ACBDA, ACDBA, ADBCA e ADCBA. Os testes automatizados da Etapa 01 confirmam esses valores.

## Núcleo probabilístico: Etapa 02

### 1. Feromônio inicial

`createPheromoneMatrix(vertexCount, initialPheromone)` cria uma matriz quadrada de 4 a 12 vértices com **τ₀ igual em todas as arestas**, simetria τ(i,j)=τ(j,i) e diagonal **zero**. Aceita τ₀ entre 0,01 e 100. `validatePheromoneMatrix` verifica dimensões, simetria, finitude, diagonal zero e piso de pelo menos 10⁻¹² fora da diagonal. **O piso também deverá ser aplicado nas atualizações futuras (Etapa 04).**

### 2. Pesos e probabilidades

`calculateTransitionWeights(graph, matrix, currentId, visitedIds, alpha, beta)` calcula para cada destino não visitado:

```text
w(i,j) = τ(i,j)^α × (1 / d(i,j))^β
```

`calculateProbabilities(weightedCandidates)` normaliza **somente os candidatos permitidos**:

```text
p(i,j) = w(i,j) / Σ w(i,u)
```

`α` e `β` pertencem a [0,5], incluindo zero. Com α=0 não há influência do feromônio; β=0 elimina a influência da distância; ambos zero geram distribuição uniforme. A normalização divide primeiro pelo maior peso para evitar transbordamento da soma, sem alterar proporções. A ordem dos candidatos segue a ordem estável do grafo.

### 3. Sorteios por semente

`createSeededRandom(seed)` disponibiliza `next()`, `reset()` e `getState()`. Foi implementado o gerador determinístico **Mulberry32**, sem `Math.random()`; a semente deve ser um inteiro seguro do JavaScript. Internamente são utilizados os 32 bits inferiores da semente (módulo 2³²). A mesma semente, algoritmo e ordem de chamadas geram a mesma sequência no mesmo sistema.

`weightedRandomChoice(candidates, probabilities, rng)` usa uma soma cumulativa e **não escolhe sempre o maior peso**. Retorna `{candidate, index, randomValue}` para rastreamento futuro.

`previewTransition(...)` integra **uma única escolha** e retorna candidatos com pesos/probabilidades e o sorteio realizado, sem construir rota nem modificar feromônios.

**Atenção à independência:** a prévia visual usa um **gerador separado** do motor futuro. Quando a simulação existir, ela deverá criar e manter seu próprio RNG para todos os sorteios das formigas. Mudanças na apresentação visual não poderão avançar esse RNG.

### 4. Prévia na interface

Logo abaixo da matriz de distâncias, a interface mostra:

- Matriz inicial numérica de feromônios (sem aplicar evaporação ou depósitos).
- Todos os candidatos disponíveis a partir do depósito, com distância, τ₀, peso e probabilidade.
- Um único sorteio reprodutível com a semente 42, claramente marcado como demonstração, **não como execução de rota**.

Os cálculos usam precisão completa (`Number`); o arredondamento ocorre somente na visualização.

## Testes — entradas, parâmetros, saídas e conclusões

Execute `npm test` para reproduzir todos os testes. No ambiente de desenvolvimento foram aprovados **69/69 testes**, dos quais **31** são da Etapa 02 e **38** são regressões das etapas anteriores.

### Seção 6.2 do enunciado: probabilidades de escolha

**Entradas:** A=(0,0), B=(3,0), C=(3,4), D=(0,4), τ(i,j)=1 em cada aresta, α=1 e β=2.

| Decisão | Peso calculado | Probabilidade esperada e obtida |
|---|---:|---:|
| A → B | 1/9 | 400/769 ≈ 0,520156 |
| A → C | 1/25 | 144/769 ≈ 0,187256 |
| A → D | 1/16 | 225/769 ≈ 0,292588 |
| B → C (A e B visitados) | 1/16 | 25/41 ≈ 0,609756 |
| B → D (A e B visitados) | 1/25 | 16/41 ≈ 0,390244 |

**Conclusão:** todas as probabilidades foram confirmadas com tolerância absoluta de 0,000001. Também passaram os casos α=β=0 (uniforme), somente um candidato (p=1), α=0, β=0 e rejeição de candidatos já visitados.

### Sorteio e reprodutibilidade

**Entradas:** probabilidades 400/769, 144/769 e 225/769, gerador Mulberry32 com sementes controladas.

**Saídas e verificações realizadas:**

- Sorteios forçados com valores 0, 0,5202, 0,9 e 0,999999 resultaram respectivamente em B, C, D e D.
- Probabilidade zero nunca é escolhida, mesmo quando o valor sorteado é zero.
- A sequência de 100 valores para a semente 42 foi idêntica entre duas instâncias independentes.
- Chamar `reset()` produziu novamente a mesma sequência de 30 valores para sementes 0, −42 e 42.
- Foram verificados 10.000 valores pseudoaleatórios dentro de [0,1).
- Uma simulação estatística de 30.000 sorteios com a semente 1234 confirmou frequências próximas das probabilidades, dentro de uma diferença de 0,015.
- Probabilidades inválidas, sementes não inteiras, assimetrias e matrizes inválidas são rejeitadas.

**Conclusão:** o núcleo probabilístico permite exploração estocástica reprodutível e permanece independente do estado visual. A reprodução de um **histórico completo de iterações** será testada após a implementação do motor na Etapa 05.

### Testes de integração e regressão

**Entradas:** cenário inicial de cinco vértices e parâmetros 10 formigas, 30 iterações, α=1, β=2, ρ=50%, τ₀=1, Q=14 e semente 42.

**Saídas obtidas:** cinco vértices, dez arestas, cinco linhas da matriz de feromônios, quatro candidatos a partir de A e uma escolha demonstrativa de **C** na semente 42 (esta escolha não estabelece um percurso completo). Os controles permanecem corretamente bloqueados e a melhor distância informa “Ainda não calculada”.

A interface foi examinada via Chromium em três tamanhos: 1440×900, 768×1024 e 390×844; nenhum erro JavaScript nem rolagem horizontal indevida foi observado. O ambiente de avaliação bloqueou navegação HTTP direta, então a verificação visual utilizou o código dos módulos inserido no navegador; **imports ES reais foram testados pelo Node.js**. Recomenda-se também executar manualmente no navegador com `python -m http.server` no seu computador.

## O que ainda falta

- **Etapa 03:** construir rotas completas por formiga usando essas probabilidades e um RNG único por execução.
- **Etapa 04:** evaporar feromônios e somar depósitos de todas as formigas, **apenas depois** que terminarem as rotas.
- **Etapa 05:** executar iterações, controlar estados e melhores rotas.
- **Etapa 06:** habilitar edição de vértices e parâmetros, controles e validação da interface.
- **Etapa 07:** atualizar a representação visual dos feromônios e destacar a melhor rota.
- **Etapa 08:** métricas, histórico e logs completos.
- **Etapa 09:** demais testes e análise obrigatória (6.3 a 6.5).
- **Etapa 10:** README final, repositório público e publicação no GitHub Pages.

**Autores:** a preencher antes da entrega.  
**Link do GitHub Pages:** a adicionar na Etapa 10.
