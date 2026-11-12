
# Simulador de Colônia de Formigas — Ant System

Projeto desenvolvido para a disciplina de Inteligência Artificial da Universidade Federal do Piauí (UFPI), período 2026.2.

O objetivo é implementar um simulador de otimização de rotas de entrega utilizando o algoritmo Ant System, uma variante da Otimização por Colônia de Formigas (ACO).

## 1. Descrição

O problema consiste em encontrar uma rota de menor distância para um veículo que deve:

- Sair de um depósito.
- Visitar todos os pontos de entrega exatamente uma vez.
- Retornar ao depósito inicial.
- Minimizar a distância total percorrida.

Os pontos são representados por um grafo completo, não direcionado, com coordenadas no plano cartesiano.

As distâncias são calculadas pela fórmula euclidiana:

d(i,j) = √((xi - xj)² + (yi - yj)²)

O algoritmo utiliza feromônios e distâncias para orientar probabilisticamente a construção das rotas.

## 2. Tecnologias

O projeto utiliza:

- HTML5: estrutura da aplicação.
- CSS3: apresentação e responsividade.
- JavaScript: implementação do Ant System.
- SVG: representação visual do grafo.
- Node.js: execução dos testes automatizados.

Não são utilizadas bibliotecas externas de otimização ou inteligência artificial.

Recurso visual de terceiros:

- Fonte [Recursive](https://github.com/arrowtype/recursive) (licença SIL Open Font License), usada em toda a interface. Os arquivos ficam na pasta `fonts/` do projeto, sem dependência de serviço externo.

A aplicação funciona no navegador, sem servidor de aplicação.

## 3. Funcionalidades implementadas

### Etapas 00 e 01 — Estrutura e grafo

- Estrutura inicial da aplicação.
- Cadastro e validação dos vértices.
- Grafo completo e não direcionado.
- Cálculo das distâncias euclidianas.
- Matriz de distâncias.
- Validação de rotas completas.

### Etapa 02 — Probabilidades

- Inicialização da matriz de feromônios.
- Cálculo dos pesos de escolha.
- Normalização das probabilidades.
- Sorteio proporcional aos pesos.
- Gerador pseudoaleatório Mulberry32 com semente.

O peso de escolha é calculado por:

w(i,j) = τ(i,j)^α × (1/d(i,j))^β

A probabilidade de escolher o próximo vértice é:

p(i,j) = w(i,j) / Σw(i,u)

A soma considera apenas os vértices ainda não visitados.

### Etapa 03 — Construção de rotas

Cada formiga constrói uma rota completa:

1. Começa no depósito.
2. Calcula as probabilidades dos destinos disponíveis.
3. Sorteia o próximo vértice.
4. Repete até visitar todos os pontos.
5. Retorna ao depósito.
6. Calcula o comprimento total da rota.

Os vértices intermediários não podem ser repetidos.

### Etapa 04 — Atualização dos feromônios

A atualização ocorre somente depois que todas as formigas de uma iteração terminam suas rotas.

A fórmula utilizada é:

τ_novo(i,j) = (1 - ρ) × τ_antigo(i,j) + ΣΔτk(i,j)

Cada formiga deposita:

Δτk(i,j) = Q / Lk

O depósito é realizado apenas nas arestas percorridas pela formiga, incluindo o retorno ao depósito.

A matriz permanece simétrica e utiliza o piso numérico de 10^-12 nas arestas.

### Etapa 05 — Motor de simulação

O motor permite:

- Executar uma ou várias iterações.
- Construir rotas com múltiplas formigas.
- Calcular a melhor distância da iteração.
- Calcular a distância média das formigas.
- Guardar a melhor solução acumulada.
- Atualizar os feromônios.
- Registrar o histórico.
- Reiniciar a simulação e a semente.

O módulo principal é `js/core/simulation.js`.

Suas principais funções são:

- `createSimulation()`: cria a simulação.
- `step()`: executa uma iteração.
- `runAll()`: executa as iterações restantes.
- `reset()`: restaura o estado inicial.
- `getState()`: retorna uma cópia completa do estado atual, incluindo todo o histórico.
- `stepSummary()` e `getSummary()`: executam uma iteração ou consultam o estado sem copiar o histórico.
- `getHistorySince(n)`: retorna apenas os registros a partir da posição `n`.

A interface usa os três últimos métodos para receber cada iteração uma única vez. Assim, o custo por iteração não cresce com o tamanho do histórico.

### Etapa 06 — Interface interativa

A interface permite configurar e acompanhar o algoritmo diretamente no navegador.

Recursos implementados:

- Adicionar, editar e remover vértices.
- Escolher o depósito.
- Configurar os parâmetros.
- Executar e pausar a simulação.
- Avançar uma iteração.
- Reiniciar a execução.
- Visualizar a melhor rota.
- Consultar métricas e histórico.
- Inspecionar logs das decisões das formigas. Para cada iteração, o painel expansível mostra:
  - A rota e o comprimento de todas as formigas, com destaque para a menor.
  - A construção passo a passo da rota da Formiga 1: vértice atual, candidatos com τ, d, w e p, valor sorteado, vértice escolhido e retorno obrigatório ao depósito.
  - Para cada aresta, o feromônio anterior, o valor após evaporação, o depósito total e o valor final.
- Consultar no histórico a menor distância, a melhor rota de cada iteração, a média e a melhor distância acumulada.
- Renomear um vértice ou trocar o depósito atualiza na hora a lista de depósitos e a coluna "Tipo".
- Ao alterar dados ou parâmetros durante uma execução, Executar, Avançar ou Reiniciar aplicam as alterações e avisam que a simulação recomeçou do início.
- Acompanhar os feromônios nas arestas.

A interface utiliza o motor de simulação implementado na Etapa 05.

### Etapa 07 — Visualização da convergência

- Atualização do grafo a cada iteração com os feromônios calculados.
- Espessura (1,5 a 9 px) e opacidade das arestas proporcionais a τ/τmáx da iteração atual.
- Aviso abaixo do grafo sempre que a escala muda entre iterações, informando o τ máximo atual e o anterior e se ele aumentou ou diminuiu.
- Destaque da melhor rota acumulada.
- Consulta da distância e do feromônio de cada aresta.
- Gráfico de convergência com a melhor distância acumulada e a distância média por iteração.
- Atualização do gráfico durante a execução, avanço manual e retomada.

O gráfico utiliza os dados registrados pelo motor de simulação, sem recalcular ou modificar os resultados do algoritmo.

## 4. Parâmetros

| Parâmetro | Intervalo |
|---|---|
| Número de vértices | 4 a 12 |
| Número de formigas | 1 a 100 |
| Número de iterações | 1 a 200 |
| Alfa (α) | 0 a 5 |
| Beta (β) | 0 a 5 |
| Evaporação (ρ) | 0% a 90% |
| Feromônio inicial (τ₀) | 0,01 a 100 |
| Constante Q | 0,01 a 10.000 |
| Semente aleatória | Inteiro seguro (ver observação abaixo) |

Observação sobre a semente: o gerador Mulberry32 usa apenas os 32 bits menos significativos da semente. Sementes que diferem por múltiplos de 2³² (por exemplo, 1 e 4.294.967.297) produzem os mesmos sorteios. Valores negativos também são aceitos e convertidos da mesma forma.

As mensagens de erro dos parâmetros informam o intervalo aceito, por exemplo: "Número de formigas deve ser um número inteiro entre 1 e 100."

Os identificadores dos vértices devem ser únicos.

As coordenadas devem estar entre 0 e 1000, com até duas casas decimais.

Não são permitidos vértices com coordenadas duplicadas.

## 5. Estrutura do projeto

```text
Colonia_de_formigas-IA/
│
├── index.html
├── README.md
├── package.json
│
├── css/
│   └── styles.css
│
├── fonts/
│   ├── recursive-latin.woff2
│   └── recursive-latin-ext.woff2
│
├── js/
│   ├── app.js
│   │
│   ├── core/
│   │   ├── constants.js
│   │   ├── validation.js
│   │   ├── graph.js
│   │   ├── random.js
│   │   ├── ant-system.js
│   │   └── simulation.js
│   │
│   └── ui/
│       ├── forms.js
│       ├── dashboard.js
│       ├── graph-view.js
│       ├── convergence-chart.js
│       ├── distance-matrix.js
│       ├── probability-preview.js
│       └── tabs.js
│
└── tests/
    ├── stage00.test.js
    ├── validation.test.js
    ├── graph.test.js
    ├── ant-system.test.js
    ├── routes-pheromones.test.js
    └── simulation.test.js
```

## 6. Como executar

Clone o repositório:

```bash
git clone https://github.com/jvrosal/Colonia_de_formigas-IA.git
```

Entre na pasta:

```bash
cd Colonia_de_formigas-IA
```

Inicie um servidor local:

```bash
python -m http.server 8000
```

No Windows, também pode utilizar:

```bash
py -m http.server 8000
```

Abra no navegador:

http://localhost:8000

O servidor local é utilizado para carregar corretamente os módulos JavaScript.

## 7. Como utilizar

1. Configure os vértices e o depósito.
2. Defina os parâmetros do algoritmo.
3. Clique em Aplicar cenário.
4. Utilize Executar para iniciar a simulação.
5. Utilize Pausar para interromper temporariamente.
6. Utilize Avançar para completar uma iteração.
7. Consulte as métricas, a melhor rota e o histórico.
8. Utilize Reiniciar para retornar ao estado inicial.

Alterações nos dados ou parâmetros exigem reinício da simulação.

## 8. Testes automatizados

Execute:

```bash
npm test
```

Ou:

```bash
node --test
```

A suíte atual contém 87 testes automatizados, abrangendo as Etapas 00 a 05 e verificações estruturais da Etapa 06.

### 8.1. Instância de referência

Vértices:

- A = (0,0)
- B = (3,0)
- C = (3,4)
- D = (0,4)

Depósito: A.

Distâncias:

| Aresta | Distância |
|---|---:|
| AB | 3 |
| AC | 5 |
| AD | 4 |
| BC | 4 |
| BD | 5 |
| CD | 3 |

As seis rotas possíveis possuem distâncias:

- A-B-C-D-A: 14
- A-B-D-C-A: 16
- A-C-B-D-A: 18
- A-C-D-B-A: 16
- A-D-B-C-A: 18
- A-D-C-B-A: 14

O comprimento ótimo é 14.

Os testes verificam os comprimentos e a validade das rotas.

**Resultado obtido:** os seis comprimentos calculados coincidem com os esperados (14, 16, 18, 16, 18 e 14). Rotas incompletas, com vértice repetido ou que não começam e terminam no depósito são rejeitadas.

**Conclusão:** o cálculo das distâncias e do comprimento das rotas, incluindo o retorno ao depósito, está correto.

### 8.2. Probabilidades

Configuração:

- τ = 1
- α = 1
- β = 2

Probabilidades a partir do vértice A:

| Destino | Probabilidade |
|---|---:|
| B | 400/769 |
| C | 144/769 |
| D | 225/769 |

Os testes verificam esses valores com tolerância de 0,000001.

Também são verificados os casos α = 0, β = 0 e candidatos únicos.

**Resultado obtido:**

- A partir de A: p(A,B) ≈ 0,520156; p(A,C) ≈ 0,187256; p(A,D) ≈ 0,292588. A soma é 1.
- Após visitar B: p(B,C) ≈ 0,609756 e p(B,D) ≈ 0,390244. A e B não participam do sorteio.
- Com α = 0 e β = 0: os três candidatos recebem probabilidade 1/3.
- Com um único candidato restante: probabilidade 1.

**Conclusão:** os pesos e as probabilidades seguem as fórmulas do Ant System. O sorteio é proporcional e nenhum candidato é descartado por não ter o maior peso.

### 8.3. Evaporação e depósito

Configuração:

- τ₀ = 1
- ρ = 50%
- Q = 14
- Rota: A-B-C-D-A

Após a primeira iteração:

- AB = BC = CD = AD = 1,5
- AC = BD = 0,5

Após uma segunda iteração com a mesma rota:

- Arestas do perímetro: 1,75
- Diagonais: 0,25

Com duas formigas percorrendo a mesma rota na primeira iteração:

- Arestas do perímetro: 2,5
- Diagonais: 0,5

Esses valores são verificados pelos testes automatizados.

**Resultado obtido:** os valores coincidem com os esperados. Log da aresta AB na primeira iteração: "anterior 1; após evaporação 0,5; depósito 1; final 1,5". Para AC: "anterior 1; após evaporação 0,5; depósito 0; final 0,5". Com ρ = 0%, AC permanece em 1 e as arestas do perímetro chegam a 2 (1 + 14/14).

**Conclusão:** a evaporação e a soma dos depósitos são aplicadas somente depois que todas as formigas concluem as rotas. A aresta de retorno ao depósito também recebe depósito, e a matriz permanece simétrica.

### 8.4. Execução completa

Configuração de referência:

- Depósito: A
- Formigas: 10
- Iterações: 30
- α = 1
- β = 2
- ρ = 50%
- τ₀ = 1
- Q = 14
- Semente: 42

A suíte verifica:

- Existência de 30 registros.
- Rotas completas e válidas.
- Reprodutibilidade com a mesma semente.
- Preservação do resultado ao avançar e continuar.
- Melhor distância acumulada não crescente.
- Reinício correto do estado.
- Uso dos mesmos feromônios pelas formigas de cada iteração.

Encontrar o ótimo em todas as execuções não é obrigatório.

**Resultado obtido (semente 42):**

- 30 registros, um por iteração.
- Melhor rota: A → B → C → D → A, comprimento 14 (ótimo).
- Todas as rotas construídas têm comprimento 14, 16 ou 18.
- Repetir a execução, avançar algumas iterações e depois executar o restante, ou pausar e retomar pela interface, produz exatamente o mesmo histórico.
- No estado inicial (iteração 0), a melhor distância aparece como "Ainda não calculada".

**Conclusão:** a execução é reprodutível com a mesma semente, e a melhor distância acumulada nunca aumenta.

### 8.5. Comparação de parâmetros

Demais parâmetros iguais aos da seção 8.4 (10 formigas, 30 iterações, α = 1, ρ = 50%, τ₀ = 1, Q = 14), sementes 1, 2, 3, 4 e 5.

| Configuração | Melhor distância final por semente | Média da melhor distância | Execuções que atingiram 14 | Média das distâncias das formigas (todas as iterações) |
|---|---|---:|---:|---:|
| β = 0 | 14, 14, 14, 14, 14 | 14 | 5 de 5 | ≈ 15,88 |
| β = 2 | 14, 14, 14, 14, 14 | 14 | 5 de 5 | ≈ 14,29 |

**Interpretação:** nessa instância, com apenas seis rotas possíveis e 10 formigas por iteração, as duas configurações encontram o ótimo em todas as execuções. A diferença aparece na qualidade média das rotas: com β = 0 a distância não influencia a escolha, e as formigas dependem só do feromônio e do acaso, o que gera média ≈ 15,9. Com β = 2, as arestas curtas são favorecidas desde a primeira iteração, e a média cai para ≈ 14,3. Em instâncias maiores, essa diferença tende a afetar também a melhor distância final.

### 8.6. Entradas inválidas

Verificado na interface: cada caso abaixo impede a execução e exibe uma mensagem.

| Entrada | Mensagem exibida |
|---|---|
| Dois vértices nas mesmas coordenadas | "O vértice 2 possui coordenadas já utilizadas." |
| Identificador repetido | "O identificador "A" já está cadastrado." |
| Identificador vazio | "O vértice 2 precisa de um identificador não vazio." |
| Coordenada vazia | "A coordenada x do vértice 2 deve ser um número finito." |
| x = 1000,5 | "A coordenada x do vértice 2 deve estar entre 0 e 1.000." |
| x = 10,123 | "A coordenada x do vértice 2 deve ter no máximo duas casas decimais." |
| Remover vértice com apenas 4 cadastrados | "São necessários pelo menos 4 vértices." |
| Adicionar o 13º vértice | "O limite é de 12 vértices." |
| Formigas = 0 ou 2,5 | "Número de formigas deve ser um número inteiro entre 1 e 100." |
| ρ = 95% | "Evaporação (ρ) deve ser um número entre 0% e 90%." |
| α = 7 | "Feromônio (α) deve ser um número entre 0 e 5." |
| τ₀ = 0 | "Feromônio inicial (τ₀) deve ser um número entre 0,01 e 100." |
| α vazio | "Preencha Feromônio (α)." |
| Semente = 1,5 | "Semente aleatória deve ser um número inteiro." |

Com ρ = 0%, a evaporação não reduz o feromônio. Apenas os depósitos o alteram (ver seção 8.3).

## 9. Situação atual

Implementadas:

- Etapa 00: estrutura inicial.
- Etapa 01: grafo e distâncias.
- Etapa 02: probabilidades e sorteios.
- Etapa 03: rotas completas.
- Etapa 04: evaporação e depósitos.
- Etapa 05: motor de simulação.
- Etapa 06: interface interativa e controles.
- Etapa 07: visualização dinâmica e gráfico de convergência.

Os controles, a visualização dos feromônios, o gráfico de convergência e os logs foram verificados no navegador, em tela de computador e de celular.

Pendência para a entrega final:

- Publicar a aplicação no GitHub Pages e incluir o link neste README.

## 10. Repositório

https://github.com/jvrosal/Colonia_de_formigas-IA

## 11. Autores

Benjamim Pessoa Vale Filho

Gustavo Bastos Ribeiro Carvalho

João Vinicio Teles Rosal

Universidade Federal do Piauí — UFPI

Disciplina: Inteligência Artificial

Período: 2026.2
