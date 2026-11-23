(() => {
  "use strict";

  const CONFIG = {
    intervalo: 30 * 60 * 1000,
    intervaloVerificacaoFila: 500,
    chaveLocalStorage: "grid:painel:configuracoes",
  };

  const estado = {
    iniciado: false,
    verificando: false,
    atualizacaoPendente: null,
    computador: null,
    configuracoes: null,
    timer: null,
    timerFila: null,
    ultimaVerificacao: null,
    geracao: 0,
    controlador: null,
  };

  /**
   * Obtém a chave de armazenamento do computador atual.
   */
  function obterChaveLocalStorage() {
    return `${CONFIG.chaveLocalStorage}:${estado.computador}:v1`;
  }

  /**
   * Obtém a versão das configurações.
   */
  function obterVersao(configuracoes) {
    return configuracoes?.versao ?? null;
  }

  /**
   * Verifica se uma execução ainda é válida.
   */
  function execucaoValida(geracao) {
    return estado.iniciado && estado.geracao === geracao;
  }

  /**
   * Salva as configurações no navegador.
   */
  function salvarLocalmente(configuracoes) {
    try {
      localStorage.setItem(
        obterChaveLocalStorage(),
        JSON.stringify(configuracoes),
      );

      return true;
    } catch (erro) {
      console.error(
        "[GRID] Não foi possível salvar as configurações localmente:",
        erro,
      );

      return false;
    }
  }

  /**
   * Obtém o estado atual da fila.
   */
  function obterEstadoFila() {
    if (!window.GridFila) {
      return null;
    }

    return window.GridFila.obterEstado();
  }

  /**
   * Verifica se existem chamadas em andamento ou pendentes.
   */
  function filaEstaOcupada() {
    const fila = obterEstadoFila();

    // Sem acesso ao estado da fila, não aplicar a atualização.
    if (!fila) {
      return true;
    }

    const quantidadePendente = Array.isArray(fila.chamadasPendentes)
      ? fila.chamadasPendentes.length
      : Number(fila.quantidadePendente) || 0;

    return Boolean(
      fila.processando || fila.chamadaAtual || quantidadePendente > 0,
    );
  }

  /**
   * Aplica uma configuração recebida.
   */
  function aplicarConfiguracoes(configuracoes, geracao) {
    if (!execucaoValida(geracao) || !configuracoes) {
      return false;
    }

    estado.configuracoes = configuracoes;

    const quantidade = Number(configuracoes?.historico?.quantidade);

    if (
      window.GridHistorico &&
      Number.isInteger(quantidade) &&
      quantidade >= 2 &&
      quantidade <= 5
    ) {
      window.GridHistorico.definirQuantidade(quantidade);
    }

    salvarLocalmente(configuracoes);

    document.dispatchEvent(
      new CustomEvent("grid:configuracoes-atualizadas", {
        detail: {
          configuracoes,
          versao: obterVersao(configuracoes),
        },
      }),
    );

    return true;
  }

  /**
   * Compara duas configurações.
   */
  function mesmaConfiguracao(atual, nova) {
    if (!atual || !nova) {
      return false;
    }

    const versaoAtual = obterVersao(atual);
    const versaoNova = obterVersao(nova);

    if (versaoAtual !== null && versaoNova !== null) {
      return String(versaoAtual) === String(versaoNova);
    }

    return JSON.stringify(atual) === JSON.stringify(nova);
  }

  /**
   * Consulta as configurações no servidor.
   */
  async function consultarServidor(geracao, signal) {
    if (!execucaoValida(geracao) || !estado.computador || !window.GridAPI) {
      return null;
    }

    const computador = estado.computador;

    const resposta = await window.GridAPI.obterConfiguracoes(
      computador,
      signal,
    );

    if (!execucaoValida(geracao)) {
      return null;
    }

    if (!resposta?.sucesso || !resposta.configuracoes) {
      throw new Error(
        resposta?.mensagem || "Resposta inválida ao consultar configurações.",
      );
    }

    return resposta.configuracoes;
  }

  /**
   * Aguarda a fila ficar vazia antes de aplicar uma atualização.
   */
  function aguardarFila(geracao) {
    if (!execucaoValida(geracao) || !estado.atualizacaoPendente) {
      return;
    }

    if (filaEstaOcupada()) {
      if (!estado.timerFila) {
        estado.timerFila = setInterval(() => {
          if (!execucaoValida(geracao)) {
            clearInterval(estado.timerFila);
            estado.timerFila = null;
            return;
          }

          if (!estado.atualizacaoPendente) {
            clearInterval(estado.timerFila);
            estado.timerFila = null;
            return;
          }

          if (!filaEstaOcupada()) {
            clearInterval(estado.timerFila);
            estado.timerFila = null;

            const configuracoes = estado.atualizacaoPendente;
            estado.atualizacaoPendente = null;

            aplicarConfiguracoes(configuracoes, geracao);
          }
        }, CONFIG.intervaloVerificacaoFila);
      }

      return;
    }

    const configuracoes = estado.atualizacaoPendente;
    estado.atualizacaoPendente = null;

    aplicarConfiguracoes(configuracoes, geracao);
  }

  /**
   * Verifica se existem configurações novas no servidor.
   */
  async function verificarAtualizacoes() {
    if (estado.verificando || !estado.iniciado) {
      return;
    }

    const geracao = estado.geracao;
    const controlador = new AbortController();

    estado.verificando = true;
    estado.controlador = controlador;

    try {
      const configuracoesServidor = await consultarServidor(
        geracao,
        controlador.signal,
      );

      if (!execucaoValida(geracao) || !configuracoesServidor) {
        return;
      }

      estado.ultimaVerificacao = new Date().toISOString();

      if (mesmaConfiguracao(estado.configuracoes, configuracoesServidor)) {
        return;
      }

      estado.atualizacaoPendente = configuracoesServidor;

      aguardarFila(geracao);
    } catch (erro) {
      if (execucaoValida(geracao) && erro.name !== "AbortError") {
        console.warn("[GRID] Não foi possível verificar atualizações:", erro);
      }
    } finally {
      // Uma consulta antiga não pode alterar a execução nova.
      if (estado.geracao === geracao) {
        estado.verificando = false;
        estado.controlador = null;
      }
    }
  }

  /**
   * Inicia a sincronização de um computador.
   */
  function iniciar(computador, configuracoes) {
    if (estado.iniciado) {
      return;
    }

    const id = Number(computador);

    if (!Number.isInteger(id) || id <= 0) {
      console.error("[GRID] Computador inválido para sincronização.");

      return;
    }

    estado.geracao++;

    const geracao = estado.geracao;

    // Limpa possíveis temporizadores anteriores.
    clearInterval(estado.timer);
    clearInterval(estado.timerFila);

    estado.timer = null;
    estado.timerFila = null;

    estado.controlador = null;
    estado.verificando = false;
    estado.atualizacaoPendente = null;

    estado.computador = id;
    estado.configuracoes = configuracoes || null;
    estado.iniciado = true;

    salvarLocalmente(estado.configuracoes);

    // Primeira verificação após a inicialização.
    verificarAtualizacoes();

    estado.timer = setInterval(() => {
      if (execucaoValida(geracao)) {
        verificarAtualizacoes();
      }
    }, CONFIG.intervalo);
  }

  /**
   * Interrompe a sincronização e invalida consultas anteriores.
   */
  function parar() {
    estado.iniciado = false;

    // Invalida respostas e temporizadores da execução anterior.
    estado.geracao++;

    clearInterval(estado.timer);
    clearInterval(estado.timerFila);

    estado.timer = null;
    estado.timerFila = null;

    // Cancela a requisição HTTP em andamento.
    if (estado.controlador) {
      estado.controlador.abort();
      estado.controlador = null;
    }

    estado.verificando = false;
    estado.atualizacaoPendente = null;

    return true;
  }

  /**
   * Verifica ao retornar para a aba.
   */
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && estado.iniciado) {
      verificarAtualizacoes();
    }
  });

  /**
   * Verifica quando a página retorna do cache do navegador.
   */
  window.addEventListener("pageshow", () => {
    if (estado.iniciado) {
      verificarAtualizacoes();
    }
  });

  /**
   * Recebe a configuração inicial carregada pelo painel.
   */
  document.addEventListener("grid:painel-inicializado", (evento) => {
    const dados = evento.detail;

    const computador = dados?.computador?.id ?? dados?.computador?.NR_SEQUENCIA;

    iniciar(computador, dados?.configuracoes);
  });

  window.GridSincronizacao = Object.freeze({
    iniciar,
    parar,
    verificar: verificarAtualizacoes,

    obterEstado() {
      return {
        iniciado: estado.iniciado,
        verificando: estado.verificando,
        atualizacaoPendente: estado.atualizacaoPendente,
        computador: estado.computador,
        configuracoes: estado.configuracoes,
        ultimaVerificacao: estado.ultimaVerificacao,
        filaOcupada: filaEstaOcupada(),
      };
    },
  });
})();
