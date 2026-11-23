# GRID - Painel de senhas

## Plano de implementação e refatoração

**Status:** Em implementação (Etapas 2–6, 9–10 e 13 concluídas; Etapas 5 e 8 parciais; Etapas 7 e 9 pendentes)
**Objetivo:** Modularizar, aprimorar e ampliar o painel de chamadas, tornando-o configurável, personalizável e preparado para gerenciar múltiplos painéis.

---

## Status de implementação (atualizado em 2026-11-23)

### Concluído

- **Etapa 2** — seleção de computador, localStorage, 5 tentativas, máquinas vinculadas, atualização a cada 30 min (`configuracao-painel.js`).
- **Etapa 3** — `chamada.php` dinâmico (máquinas/filas), histórico 2–5, distinção `NR_SEQ_FILA_SENHA` × `NR_SEQ_FILA_SENHA_ORIGEM` preservada.
- **Etapa 4** — módulos JS com eventos (`window.Grid*`).
- **Etapa 5 (parcial)** — `variaveis.css` com 4 temas, `animacoes.css` com zoom/fade/slide e destaque de chamada; falta separar `chamada.css`, `historico.css`, `responsivo.css` (hoje em `index.css`/`layout.css`).
- **Etapa 6** — JSON por computador com versão, backup (retenção: últimos 20), escrita atômica e cópia em localStorage.
- **Etapa 9 (sincronização)** — verificação a cada 30 min, comparação de versão, aplicação somente com fila vazia, recuperação por visibility/pageshow.
- **Etapa 13** — 2 bips, voz pt-BR (rate 0.88), exibição de 8 s, dedup por `id_evento`, histórico sem duplicatas.
- **Fase A (correções)** — schema canônico único em `api/configuracoes.php` (compatível com `aparencia.js`); validação estrita por campo no POST (cores hex, tamanhos, slug de tema, caminhos de imagem, filas, quantidade 2–5, duração 3–30); chaves desconhecidas descartadas; helpers unificados no `_bootstrap.php`; código morto removido de `config.php`; `.gitignore` criado; acesso web a `config/` negado no Apache.
- **Fase B (filas)** — seção "Filas monitoradas" no painel de configurações (`configuracoes-admin.js`): lista de checkboxes, salvamento via POST e aplicação imediata respeitando a fila de chamadas.
- **Fase C (interface administrativa + pré-visualização)** — abas Geral / Chamada / Histórico; títulos (`geral.titulo`, `chamada.titulo`, `historico.titulo`), duração do destaque e animação aplicados da configuração (`interface.js`, `historico.js`, `animacoes.css`); preview ao vivo via evento `grid:configuracoes-preview`; fluxo Testar / Voltar às configurações / Confirmar e salvar / Cancelar; cores com opção "Padrão do tema" (null).

### Pendente

- **Etapa 7** — vinculação entre painéis (origem, propagação, desvinculação, anti-ciclo).
- **Etapa 8 (restante)** — aba Imagens e upload de imagens (`api/imagens.php`).
- **Etapa 9 (temas)** — gerenciamento CRUD de temas em `config/temas/*.json` (os 4 temas existem apenas como CSS).
- **Etapa 11** — testes e validação final multi-painel.

---

# 1. Objetivos do projeto

O projeto tem como objetivo transformar o painel atual em um sistema modular, permitindo:

- Identificar dinamicamente o computador e as máquinas de chamada monitoradas.
- Configurar cada painel individualmente.
- Personalizar aparência, cores, imagens e elementos visuais.
- Criar e gerenciar temas personalizados.
- Replicar configurações entre painéis.
- Vincular painéis para compartilhar configurações e receber atualizações.
- Armazenar configurações no servidor e no navegador.
- Sincronizar alterações sem interromper chamadas em andamento.
- Melhorar a organização e a manutenção do código existente.

A implementação deverá preservar as funcionalidades atuais que já estão funcionando corretamente.

# 2. Identificação e configuração dos painéis

## 2.1. Identificação dos computadores

Utilizar a tabela `COMPUTADOR` do Tasy para identificar os painéis disponíveis.

Consulta de referência:

```sql
SELECT
    *
FROM
    computador
WHERE
        cd_estabelecimento = 125
    AND ie_tipo = 'M'
    AND ie_situacao = 'A';
```

Campos relevantes:

- `NR_SEQUENCIA`: identificador do computador.
- `NM_COMPUTADOR`: nome apresentado ao usuário.

O estabelecimento `125` permanecerá definido no PHP.

## 2.2. Seleção inicial

No primeiro acesso, apresentar um modal para selecionar o computador que será utilizado pelo painel.

O modal deverá:

- Listar computadores ativos.
- Permitir selecionar o computador desejado.
- Exibir o nome do computador.
- Salvar a seleção no `localStorage`.
- Carregar as máquinas de chamada vinculadas.
- Iniciar o monitoramento somente após a validação da configuração.

Nos acessos seguintes, abrir diretamente o painel utilizando a configuração local existente.

## 2.3. Alteração do computador

Disponibilizar a opção de trocar o computador nas configurações do painel.

A troca deverá validar o novo computador antes de substituir a configuração atual.

Se a validação falhar, o painel anterior deverá continuar funcionando normalmente.

# 3. Identificação das máquinas de chamada

Utilizar a relação entre `MAQUINA_LOCAL_SENHA`, `MAQUINA_MONITOR_ADICIONAL` e `COMPUTADOR`.

Consulta de referência:

```sql
SELECT
    a.nr_sequencia AS nr_seq_maquina_local_senha,
    a.ds_local,
    a.ds_local_curto,
    a.nr_seq_computador,
    COALESCE(
        b.nr_seq_comp_monitor,
        a.nr_seq_comp_monitor
    ) AS nr_seq_comp_monitor
FROM
    maquina_local_senha a
    LEFT JOIN maquina_monitor_adicional b
        ON b.nr_seq_local = a.nr_sequencia
WHERE
        a.cd_estabelecimento = :cd_estabelecimento
    AND a.ie_situacao = 'A'
    AND COALESCE(
        b.nr_seq_comp_monitor,
        a.nr_seq_comp_monitor
    ) = :nr_seq_comp_monitor;
```

Regras:

- Carregar as máquinas vinculadas uma vez na inicialização.
- Manter a relação em memória no JavaScript.
- Reutilizar os dados nas consultas normais.
- Verificar alterações nessa relação a cada 30 minutos.
- Atualizar os dados somente quando houver mudanças.
- Não consultar novamente a relação completa a cada requisição de chamadas.

## 3.1. Tratamento de falhas

Na inicialização:

- Realizar até cinco tentativas de carregamento.
- Se todas falharem, apresentar uma mensagem de erro.
- Não iniciar o monitoramento sem carregar corretamente as máquinas.
- Disponibilizar uma opção de nova tentativa manual.

Durante o funcionamento:

- Manter as tentativas automáticas de reconexão.
- Não interromper o painel por falhas temporárias.
- Ao recuperar a conexão, retomar o monitoramento sem repetir a última chamada.

# 4. Configurações individuais e vinculação entre painéis

Esta funcionalidade permitirá reutilizar configurações completas entre computadores.

## 4.1. Listagem de painéis

Nas configurações administrativas, apresentar os painéis cadastrados e permitir identificar:

- Nome do computador.
- Identificador do computador.
- Configuração utilizada.
- Se possui configuração própria ou utiliza outra como origem.

## 4.2. Utilização da configuração de outro painel

Permitir selecionar um painel existente como origem das configurações.

Ao selecionar uma origem:

- Utilizar integralmente suas configurações.
- Herdar aparência, tema, cores, imagens, logo, chamada principal, histórico e demais preferências.
- Registrar o vínculo entre os painéis.
- Não copiar o identificador do computador de origem.
- Manter a identificação e as máquinas monitoradas do computador de destino.

## 4.3. Atualização dos painéis vinculados

Quando a configuração de origem for alterada e salva:

- Identificar os painéis vinculados diretamente a ela.
- Disponibilizar a nova versão para esses painéis.
- Atualizar os painéis vinculados automaticamente.
- Respeitar a fila de chamadas antes de aplicar as mudanças.
- Não interromper chamadas em andamento.

Um painel vinculado deverá utilizar integralmente a configuração da origem.

## 4.4. Desvinculação

Caso o usuário queira personalizar um painel vinculado:

- Disponibilizar a opção de desvincular.
- Preservar a última configuração recebida.
- Criar uma configuração própria para o painel.
- Encerrar o vínculo com a origem.
- Não receber novas atualizações daquela origem.

Nesta primeira versão, não haverá personalização individual de propriedades enquanto o painel permanecer vinculado.

## 4.5. Restrições

- Um painel não poderá utilizar a própria configuração como origem.
- Não permitir vínculos circulares.
- Um painel independente não será alterado por outros painéis.
- A exclusão ou indisponibilidade da origem não deverá apagar a última configuração válida dos destinos.

# 5. Interface administrativa

As configurações serão realizadas dentro da própria página do painel, por meio de um botão de configurações.

Não haverá autenticação administrativa nesta primeira versão.

A interface será organizada em abas.

## 5.1. Aba Geral

- Seleção do computador.
- Identificação do painel.
- Configuração própria ou vinculada.
- Seleção de outro painel como origem.
- Desvinculação.
- Tema utilizado.
- Configurações gerais de aparência.

## 5.2. Aba Chamada

Permitir personalizar:

- Título da chamada.
- Nome do paciente.
- Guichê.
- Cores.
- Tamanhos das fontes.
- Efeitos visuais.
- Espaçamentos.
- Elementos apresentados.

## 5.3. Aba Histórico

Permitir configurar:

- Quantidade de chamadas anteriores.
- Cores.
- Fontes.
- Tamanhos.
- Espaçamentos.
- Bordas e divisórias.

A quantidade deverá permanecer entre duas e cinco chamadas, com padrão inicial de quatro.

## 5.4. Aba Imagens

Permitir:

- Selecionar imagens existentes.
- Enviar novas imagens.
- Visualizar imagens antes de salvar.
- Utilizar logos institucionais.
- Utilizar fundos personalizados.
- Utilizar imagens comemorativas.

Validar formato e tamanho dos arquivos enviados.

## 5.5. Aparência e personalização

Permitir personalizar:

- Cor de fundo.
- Imagem de fundo.
- Logo institucional.
- Cores dos elementos.
- Fontes.
- Tamanhos.
- Espaçamentos.
- Bordas.
- Efeitos visuais.

As personalizações deverão utilizar variáveis CSS sempre que possível, evitando alterações diretas nas regras estruturais.

# 6. Temas

Disponibilizar temas pré-cadastrados e personalizados.

Exemplos:

- Padrão.
- Natal.
- Outubro Rosa.
- Novembro Azul.

## 6.1. Gerenciamento

Permitir:

- Criar temas.
- Editar temas próprios.
- Duplicar temas.
- Excluir temas próprios.
- Utilizar temas pré-cadastrados como ponto de partida.

Os temas originais deverão ser protegidos contra alterações ou exclusões acidentais.

Não haverá ativação automática por data.

## 6.2. Modelos e publicação

Salvar um tema como modelo não deverá publicá-lo automaticamente.

O usuário poderá personalizar o tema antes de aplicá-lo ao painel.

# 7. Pré-visualização e salvamento

A interface administrativa deverá disponibilizar os seguintes controles:

**Testar**

- Fechar a janela de configurações.
- Exibir o painel em tela cheia com as alterações temporárias.

**Voltar às configurações**

- Retornar à interface administrativa.
- Preservar as alterações temporárias.

**Confirmar e salvar**

- Validar as configurações.
- Salvar no servidor.
- Atualizar a cópia do `localStorage`.
- Atualizar a versão da configuração.
- Disponibilizar as alterações aos painéis vinculados.

Se o usuário cancelar, restaurar a aparência originalmente carregada.

As alterações temporárias não deverão afetar outros painéis antes da confirmação.

# 8. Armazenamento das configurações

Não será necessário criar novas tabelas no Oracle para armazenar as configurações visuais.

O armazenamento será realizado em arquivos JSON no servidor e no `localStorage` do navegador.

Estrutura inicial sugerida:

```text
config/
├── paineis/
│   ├── 805.json
│   ├── 796.json
│   └── 810.json
├── temas/
│   ├── padrao.json
│   ├── natal.json
│   ├── outubro-rosa.json
│   └── novembro-azul.json
└── aparencia.json

assets/
└── imagens/
    ├── fundos/
    ├── logos/
    └── comemorativas/
```

A estrutura poderá ser ajustada durante a análise técnica dos arquivos existentes.

## 8.1. Arquivos individuais

Cada painel independente deverá possuir sua própria configuração.

Os painéis vinculados deverão registrar a identificação da origem utilizada.

As imagens poderão ser compartilhadas por referência, evitando duplicação desnecessária.

## 8.2. LocalStorage

O navegador deverá armazenar uma cópia local das configurações necessárias.

Exemplo:

```json
{
  "painel": 805,
  "historico": 4,
  "versao": 1
}
```

O exemplo representa a seleção local e deverá ser ampliado conforme a estrutura definitiva das configurações.

O servidor será a fonte persistente das configurações, enquanto o `localStorage` será utilizado como cópia local para inicialização e recuperação.

## 8.3. Segurança e integridade

- Validar os dados recebidos pelo PHP.
- Validar nomes e referências dos arquivos.
- Evitar caminhos de arquivos definidos livremente pelo usuário.
- Evitar sobrescritas incompletas.
- Preservar a última configuração válida.
- Criar backups das configurações anteriores.
- Controlar versões das configurações.

# 9. Sincronização

A sincronização deverá funcionar de forma independente do monitoramento das chamadas.

## 9.1. Verificação periódica

- Verificar atualizações a cada 30 minutos.
- Comparar a versão local com a versão disponível no servidor.
- Não recarregar configurações quando a versão for igual.
- Quando houver diferença, aguardar a fila de chamadas terminar.

## 9.2. Aplicação das atualizações

A atualização somente poderá ser aplicada quando:

- Não houver chamada em andamento.
- Não houver chamadas pendentes na fila.

Após isso, aplicar a nova configuração e atualizar a versão local.

A regra deverá valer inclusive para o próprio painel que realizou o salvamento.

## 9.3. Recuperação de conexão

Se o servidor estiver indisponível:

- Manter a configuração atualmente carregada.
- Não interromper o painel.
- Tentar novamente no próximo ciclo.

Ao retornar de suspensão ou quando a aba voltar ao primeiro plano, verificar imediatamente se existem atualizações.

# 10. Modularização JavaScript

Dividir o JavaScript atual em módulos com responsabilidades específicas.

| Arquivo            | Responsabilidade                           |
| ------------------ | ------------------------------------------ |
| `api.js`           | Comunicação com o servidor                 |
| `chamadas.js`      | Identificação e processamento das chamadas |
| `fila.js`          | Controle da fila de chamadas               |
| `audio.js`         | Bips e voz                                 |
| `historico.js`     | Exibição do histórico                      |
| `interface.js`     | Atualização dos elementos da tela          |
| `configuracoes.js` | Configurações locais e seleção do painel   |
| `aparencia.js`     | Aplicação de temas e estilos               |
| `sincronizacao.js` | Verificação e aplicação de atualizações    |

A modularização deverá preservar o comportamento atual do sistema.

# 11. Modularização CSS

Separar o CSS atual conforme as responsabilidades.

| Arquivo             | Responsabilidade                     |
| ------------------- | ------------------------------------ |
| `base.css`          | Reset, fontes e configurações gerais |
| `layout.css`        | Estrutura e posicionamento           |
| `chamada.css`       | Paciente, guichê e chamada principal |
| `historico.css`     | Lista de senhas anteriores           |
| `animacoes.css`     | Efeitos e animações                  |
| `responsivo.css`    | Diferentes resoluções                |
| `configuracoes.css` | Interface administrativa             |
| `variaveis.css`     | Propriedades personalizáveis         |

Corrigir seletores duplicados e incompatibilidades identificadas na estrutura atual.

# 12. API de chamadas

Adaptar `api/chamada.php` para trabalhar dinamicamente com as máquinas vinculadas ao computador selecionado.

Regras:

- Receber o identificador do computador.
- Identificar suas máquinas de chamada.
- Filtrar as chamadas conforme a relação encontrada.
- Receber a quantidade de chamadas anteriores.
- Preservar as diferenças entre `NR_SEQ_FILA_SENHA` e `NR_SEQ_FILA_SENHA_ORIGEM`.
- Remover listas fixas de filas e máquinas atualmente existentes.

A consulta das máquinas deverá ser separada da consulta normal das chamadas, permitindo reutilizar a relação carregada.

# 13. Comportamento das chamadas

Preservar e validar as regras existentes.

## 13.1. Inicialização

- Repetir a última chamada disponível ao iniciar ou recarregar a página.
- Executar dois bips antes da fala.
- Utilizar voz em português brasileiro.
- Manter velocidade de fala `0.88`.

## 13.2. Novas chamadas

- Identificar novas chamadas pelo `id_evento`.
- Enfileirar chamadas novas.
- Processar uma chamada por vez.
- Não interromper anúncios anteriores.
- Exibir a chamada ativa durante oito segundos.

## 13.3. Conexão

- Ao perder a conexão, manter o painel funcionando com os últimos dados disponíveis.
- Ao recuperar a conexão, não repetir a última chamada.
- Anunciar somente chamadas novas.

## 13.4. Histórico

- Exibir entre duas e cinco chamadas anteriores.
- Utilizar quatro como quantidade padrão.
- Manter a chamada atual fora do histórico.
- Evitar duplicidades.
- Ordenar por data.
- Manter a última chamada exibida quando não houver novas chamadas.

# 14. Etapas de implementação

A implementação será dividida em etapas para facilitar testes e reduzir riscos.

## Etapa 1 — Análise e preparação

- Revisar os arquivos atuais.
- Identificar dependências entre JavaScript, CSS e PHP.
- Mapear funcionalidades existentes.
- Definir a estrutura definitiva de diretórios.
- Preparar uma estratégia de migração sem perda de funcionalidades.

## Etapa 2 — Identificação dinâmica dos painéis

- Implementar seleção de computador.
- Implementar carregamento das máquinas vinculadas.
- Armazenar seleção no `localStorage`.
- Implementar tentativas de conexão.
- Implementar atualização da relação a cada 30 minutos.

## Etapa 3 — Adaptação da API

- Adaptar consultas de chamadas.
- Remover filtros fixos.
- Implementar filtragem dinâmica.
- Validar quantidade configurável do histórico.

## Etapa 4 — Modularização JavaScript

- Separar responsabilidades.
- Preservar a fila.
- Preservar áudio e voz.
- Validar o funcionamento após cada separação.

## Etapa 5 — Modularização CSS

- Separar estilos.
- Corrigir duplicidades.
- Criar variáveis CSS.
- Validar diferentes resoluções.

## Etapa 6 — Armazenamento e gerenciamento dos painéis

- Criar estrutura de arquivos JSON.
- Implementar leitura e gravação.
- Implementar cópia local no `localStorage`.
- Implementar controle de versões.
- Implementar backup e validação.

## Etapa 7 — Vinculação e replicação

- Listar painéis cadastrados.
- Permitir selecionar uma configuração de origem.
- Implementar atualização dos painéis vinculados.
- Implementar desvinculação.
- Preservar a última configuração ao desvincular.
- Validar restrições de vínculo.

## Etapa 8 — Interface administrativa

- Criar botão de configurações.
- Implementar abas.
- Implementar personalização geral.
- Implementar personalização da chamada.
- Implementar personalização do histórico.
- Implementar gerenciamento de imagens.

## Etapa 9 — Temas

- Criar temas iniciais.
- Implementar criação e edição.
- Implementar duplicação e exclusão.
- Proteger temas originais.

## Etapa 10 — Pré-visualização e sincronização

- Implementar pré-visualização.
- Implementar confirmação e cancelamento.
- Implementar sincronização a cada 30 minutos.
- Aplicar alterações somente após a fila terminar.
- Implementar recuperação após suspensão e falhas de conexão.

## Etapa 11 — Testes e validação final

- Testar múltiplos painéis.
- Testar configurações independentes.
- Testar vínculos e desvinculações.
- Testar propagação de atualizações.
- Testar recuperação de conexão.
- Testar chamadas durante atualizações.
- Testar persistência no servidor e navegador.
- Testar diferentes resoluções.
- Validar integridade dos arquivos e imagens.

# 15. Critérios de conclusão

O projeto será considerado concluído quando:

- Os painéis forem identificados dinamicamente.
- As máquinas vinculadas forem carregadas corretamente.
- A API funcionar sem listas fixas de máquinas.
- O JavaScript e o CSS estiverem modularizados.
- Cada painel possuir configuração própria ou vinculada.
- A replicação copiar todas as configurações.
- Os painéis vinculados receberem atualizações da origem.
- A desvinculação preservar a última configuração.
- As configurações forem armazenadas no servidor e no navegador.
- Os temas puderem ser gerenciados.
- A interface administrativa funcionar corretamente.
- A sincronização não interromper chamadas.
- O histórico respeitar a quantidade configurada.
- Todas as funcionalidades atuais forem preservadas.

# 16. Diretrizes de desenvolvimento

Durante toda a implementação:

1. Não reescrever o sistema inteiro sem necessidade.
2. Não remover funcionalidades existentes sem autorização.
3. Analisar os arquivos reais antes de propor alterações.
4. Apresentar o escopo de cada etapa antes de implementá-la.
5. Informar arquivos afetados e possíveis impactos.
6. Aguardar aprovação antes de modificar código.
7. Implementar em pequenas etapas.
8. Validar cada etapa antes de avançar.
9. Evitar dependências desnecessárias.
10. Manter documentação atualizada conforme as decisões forem implementadas.

---

**Diretriz principal:** construir um painel confiável, modular e flexível, priorizando manutenção, integridade das configurações e continuidade das chamadas.

**Diretriz principal:** construir um painel confiável, modular e flexível, priorizando manutenção, integridade das configurações e continuidade das chamadas.
