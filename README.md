
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
- `getState()`: retorna o estado atual.

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
- Inspecionar logs das decisões das formigas.
- Acompanhar os feromônios nas arestas.

A interface utiliza o motor de simulação implementado na Etapa 05.

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
| Semente aleatória | Inteiro seguro |

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
│       ├── distance-matrix.js
│       └── probability-preview.js
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

### 8.5. Comparação de parâmetros

Os testes incluem execuções com:

- β = 0
- β = 2
- Sementes 1, 2, 3, 4 e 5

Ainda é necessário registrar no relatório final as médias das melhores distâncias e quantas execuções atingiram o ótimo de 14 em cada configuração.

## 9. Situação atual

Implementadas:

- Etapa 00: estrutura inicial.
- Etapa 01: grafo e distâncias.
- Etapa 02: probabilidades e sorteios.
- Etapa 03: rotas completas.
- Etapa 04: evaporação e depósitos.
- Etapa 05: motor de simulação.
- Etapa 06: integração inicial da interface.

Pendências para a entrega final:

- Validar manualmente todos os controles no navegador.
- Revisar visualização dos feromônios e legenda.
- Conferir os logs detalhados de cada iteração.
- Registrar resultados quantitativos dos testes comparativos.
- Verificar a aplicação em diferentes tamanhos de tela.
- Publicar a aplicação no GitHub Pages.
- Completar a identificação dos integrantes.

## 10. Repositório

https://github.com/jvrosal/Colonia_de_formigas-IA

## 11. Autores

Benjamim Pessoa Vale Filho
Gustavo Bastos Ribeiro Carvalho
João Vinicio Teles Rosal

Universidade Federal do Piauí — UFPI

Disciplina: Inteligência Artificial

Período: 2026.2
