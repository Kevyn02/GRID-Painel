(() => {
  "use strict";

  const CONFIG = {
    intervaloChamadas: 1000,
    quantidadeHistoricoPadrao: 4,
    chaveLocalStorage: "grid:painel:configuracoes",
  };

  const estado = {
    inicializado: false,
    inicializando: false,
    computador: null,
    maquinas: [],
    configuracoes: null,
    erro: null,

    geracao: 0,
    controlador: null,
    computadorEmInicializacao: null,
    maquinasEmInicializacao: [],
  };

  let eventosRegistrados = false;

  /* ========================================
     Utilitários
  ========================================= */

  function definirStatus(mensagem) {
    if (window.GridInterface) {
      window.GridInterface.definirStatus(mensagem);
    }
  }

  function normalizarId(valor) {
    const id = Number(valor);

    return Number.isInteger(id) && id > 0 ? id : null;
  }

  function obterIdComputador(computador) {
    return normalizarId(computador?.id ?? computador?.NR_SEQUENCIA);
  }

  function obterIdsMaquinas(maquinas) {
    if (!Array.isArray(maquinas)) {
      return [];
    }

    return [
      ...new Set(
        maquinas
          .map((maquina) =>
            normalizarId(
              maquina?.id ??
                maquina?.NR_SEQ_MAQUINA_LOCAL_SENHA ??
                maquina?.NR_SEQUENCIA,
            ),
          )
          .filter(Boolean),
      ),
    ];
  }

  function inicializacaoValida(geracao) {
    return estado.geracao === geracao;
  }

  /* ========================================
     Armazenamento local das configurações
  ========================================= */

  function obterConfiguracoesLocais(computadorId) {
    try {
      const chave = `${CONFIG.chaveLocalStorage}:${computadorId}:v1`;
      const dados = localStorage.getItem(chave);

      if (!dados) {
        return null;
      }

      return JSON.parse(dados);
    } catch (erro) {
      console.warn(
        "[GRID] Não foi possível recuperar as configurações locais:",
        erro,
      );

      return null;
    }
  }

  function salvarConfiguracoesLocais(computadorId, configuracoes) {
    try {
      const chave = `${CONFIG.chaveLocalStorage}:${computadorId}:v1`;

      localStorage.setItem(chave, JSON.stringify(configuracoes));

      return true;
    } catch (erro) {
      console.warn(
        "[GRID] Não foi possível salvar as configurações locais:",
        erro,
      );

      return false;
    }
  }

  /* ========================================
     Aplicação das configurações
  ========================================= */

  function aplicarConfiguracoes(configuracoes) {
    estado.configuracoes = configuracoes || {};

    let quantidade = Number(estado.configuracoes?.historico?.quantidade);

    if (!Number.isInteger(quantidade) || quantidade < 2 || quantidade > 5) {
      quantidade = CONFIG.quantidadeHistoricoPadrao;
    }

    if (window.GridHistorico) {
      window.GridHistorico.definirQuantidade(quantidade);
    }

    document.dispatchEvent(
      new CustomEvent("grid:configuracoes-carregadas", {
        detail: {
          configuracoes: estado.configuracoes,
        },
      }),
    );
  }

  /* ========================================
     Carregamento das configurações
  ========================================= */

  async function carregarConfiguracoes(computadorId, geracao, signal) {
    try {
      const resposta = await window.GridAPI.obterConfiguracoes(
        computadorId,
        signal,
      );

      if (!inicializacaoValida(geracao)) {
        return null;
      }

      if (!resposta?.sucesso || !resposta.configuracoes) {
        throw new Error(
          resposta?.mensagem || "Não foi possível carregar as configurações.",
        );
      }

      salvarConfiguracoesLocais(computadorId, resposta.configuracoes);

      return resposta.configuracoes;
    } catch (erro) {
      if (erro.name === "AbortError" || !inicializacaoValida(geracao)) {
        return null;
      }

      console.warn("[GRID] Erro ao carregar configurações do servidor:", erro);

      const configuracoesLocais = obterConfiguracoesLocais(computadorId);

      if (configuracoesLocais) {
        console.info("[GRID] Utilizando configurações armazenadas localmente.");

        return configuracoesLocais;
      }

      // Mantém o funcionamento básico com valores padrão.
      return {
        historico: {
          quantidade: CONFIG.quantidadeHistoricoPadrao,
        },
      };
    }
  }

  /* ========================================
     Interrupção do painel anterior
  ========================================= */

  function interromperPainelAnterior() {
    if (window.GridChamadas?.parar) {
      window.GridChamadas.parar();
    }

    if (window.GridSincronizacao?.parar) {
      window.GridSincronizacao.parar();
    }

    if (window.GridFila?.resetar) {
      window.GridFila.resetar();
    } else if (window.GridAudio?.cancelar) {
      window.GridAudio.cancelar();
    }

    if (window.GridHistorico?.resetar) {
      window.GridHistorico.resetar();
    } else if (window.GridHistorico?.limpar) {
      window.GridHistorico.limpar();
    }
  }

  /* ========================================
     Inicialização do painel
  ========================================= */

  async function inicializar(dados) {
    const computador = dados?.computador;
    const maquinas = dados?.maquinas;

    const computadorId = obterIdComputador(computador);
    const maquinasIds = obterIdsMaquinas(maquinas);

    if (!computadorId) {
      definirStatus("Computador não identificado.");
      return;
    }

    if (maquinasIds.length === 0) {
      definirStatus("Nenhuma máquina de chamada encontrada.");
      return;
    }

    // Se o mesmo computador já estiver sendo inicializado,
    // atualiza a relação de máquinas recebida.
    if (
      estado.inicializando &&
      estado.computadorEmInicializacao === computadorId
    ) {
      estado.maquinasEmInicializacao = [...maquinas];
      return;
    }

    // Evita reinicializar o computador que já está ativo.
    if (
      estado.inicializado &&
      obterIdComputador(estado.computador) === computadorId
    ) {
      atualizarMaquinas(dados);
      return;
    }

    // Invalida uma inicialização anterior.
    estado.geracao++;

    const geracao = estado.geracao;

    if (estado.controlador) {
      estado.controlador.abort();
    }

    const controlador = new AbortController();

    estado.controlador = controlador;
    estado.inicializando = true;
    estado.computadorEmInicializacao = computadorId;
    estado.maquinasEmInicializacao = [...maquinas];

    definirStatus("Carregando configurações...");

    try {
      const configuracoes = await carregarConfiguracoes(
        computadorId,
        geracao,
        controlador.signal,
      );

      // Descarta uma inicialização que deixou de ser válida.
      if (!inicializacaoValida(geracao) || !configuracoes) {
        return;
      }

      // Utiliza a última relação de máquinas recebida.
      const maquinasFinais = estado.maquinasEmInicializacao;
      const maquinasFinaisIds = obterIdsMaquinas(maquinasFinais);

      if (maquinasFinaisIds.length === 0) {
        throw new Error("Nenhuma máquina válida foi encontrada.");
      }

      // Verifica a disponibilidade do módulo antes de interromper
      // qualquer atividade do painel que já esteja funcionando.
      if (
        !window.GridChamadas ||
        typeof window.GridChamadas.iniciar !== "function"
      ) {
        throw new Error("O módulo de chamadas não está disponível.");
      }

      const computadorAnterior = obterIdComputador(estado.computador);

      // O painel anterior só é interrompido depois que o novo
      // computador e suas configurações estiverem preparados.
      if (estado.inicializado && computadorAnterior !== computadorId) {
        interromperPainelAnterior();
      }

      if (!inicializacaoValida(geracao)) {
        return;
      }

      estado.computador = computador;
      estado.maquinas = maquinasFinais;
      estado.inicializado = false;

      aplicarConfiguracoes(configuracoes);

      window.GridChamadas.iniciar({
        computador: computadorId,
        maquinas: maquinasFinaisIds,
        intervalo: CONFIG.intervaloChamadas,
      });

      estado.inicializado = true;
      estado.erro = null;

      document.dispatchEvent(
        new CustomEvent("grid:painel-inicializado", {
          detail: {
            computador: estado.computador,
            maquinas: estado.maquinas,
            configuracoes: estado.configuracoes,
          },
        }),
      );

      definirStatus("Painel conectado.");
    } catch (erro) {
      if (inicializacaoValida(geracao)) {
        estado.erro = erro;

        console.error("[GRID] Erro ao inicializar o painel:", erro);

        definirStatus("Não foi possível iniciar o painel.");
      }
    } finally {
      if (inicializacaoValida(geracao)) {
        estado.inicializando = false;
        estado.computadorEmInicializacao = null;
        estado.maquinasEmInicializacao = [];
        estado.controlador = null;
      }
    }
  }

  /* ========================================
     Atualização das máquinas
  ========================================= */

  function atualizarMaquinas(dados) {
    const computadorId = obterIdComputador(dados?.computador);
    const maquinasIds = obterIdsMaquinas(dados?.maquinas);

    if (!computadorId || maquinasIds.length === 0) {
      return;
    }

    // Se o computador recebido ainda estiver em inicialização,
    // atualiza os dados pendentes em vez de descartá-los.
    if (
      estado.inicializando &&
      estado.computadorEmInicializacao === computadorId
    ) {
      estado.maquinasEmInicializacao = [...dados.maquinas];
      return;
    }

    if (!estado.inicializado) {
      inicializar(dados);
      return;
    }

    const computadorAtual = obterIdComputador(estado.computador);

    // Impede a atualização com máquinas de outro computador.
    if (computadorId !== computadorAtual) {
      return;
    }

    estado.maquinas = dados.maquinas;

    if (window.GridChamadas?.atualizarMaquinas) {
      window.GridChamadas.atualizarMaquinas(maquinasIds);
    }
  }

  /* ========================================
     Eventos do painel
  ========================================= */

  function registrarEventos() {
    if (eventosRegistrados) {
      return;
    }

    eventosRegistrados = true;

    document.addEventListener("grid:painel-pronto", (evento) => {
      inicializar(evento.detail);
    });

    document.addEventListener("grid:maquinas-atualizadas", (evento) => {
      atualizarMaquinas(evento.detail);
    });
  }

  /* ========================================
     Inicialização do módulo
  ========================================= */

  function iniciar() {
    registrarEventos();

    // Recupera uma configuração que já tenha sido carregada.
    if (window.GridConfiguracaoPainel) {
      const configuracao = window.GridConfiguracaoPainel.obterEstado();

      if (configuracao?.inicializado) {
        inicializar(configuracao);
      }
    }
  }

  /* ========================================
     API pública
  ========================================= */

  window.GridPainel = Object.freeze({
    iniciar,

    obterEstado() {
      return {
        ...estado,
        maquinas: [...estado.maquinas],
        maquinasEmInicializacao: [...estado.maquinasEmInicializacao],
      };
    },
  });

  iniciar();
})();
