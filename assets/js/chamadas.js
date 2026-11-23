(function (window) {
  "use strict";

  const INTERVALO_PADRAO = 1000;

  let estado = {
    iniciado: false,
    consultando: false,
    computador: null,
    controlador: null,
    maquinas: [],
    intervalo: INTERVALO_PADRAO,
    temporizador: null,
    ultimaChamada: null,
    primeiraConsulta: true,
    ultimaResposta: null,
    geracao: 0,
  };

  /**
   * Verifica se uma chamada possui identificador válido.
   */
  function obterIdEvento(chamada) {
    return chamada?.id_evento || null;
  }

  /**
   * Notifica os demais módulos sobre uma chamada.
   */
  function notificarChamada(chamada, inicializacao = false) {
    window.dispatchEvent(
      new CustomEvent("grid:nova-chamada", {
        detail: {
          chamada,
          inicializacao,
        },
      }),
    );
  }

  /**
   * Notifica a interface sobre os dados recebidos.
   */
  function notificarAtualizacao(dados) {
    window.dispatchEvent(
      new CustomEvent("grid:dados-atualizados", {
        detail: dados,
      }),
    );
  }

  /**
   * Notifica falhas de comunicação.
   */
  function notificarErro(erro) {
    window.dispatchEvent(
      new CustomEvent("grid:erro-comunicacao", {
        detail: {
          mensagem: erro.message,
          status: erro.status || 0,
        },
      }),
    );
  }

  /**
   * Verifica se uma execução ainda é válida.
   */
  function execucaoValida(geracao) {
    return estado.iniciado && estado.geracao === geracao;
  }

  /**
   * Processa a chamada atual retornada pela API.
   */
  function processarChamadaAtual(chamada) {
    if (!chamada) {
      return;
    }

    const idEvento = obterIdEvento(chamada);

    if (!idEvento) {
      return;
    }

    // A primeira consulta apresenta a última chamada disponível.
    if (estado.primeiraConsulta) {
      estado.ultimaChamada = idEvento;

      notificarChamada(chamada, true);

      return;
    }

    // Não repetir uma chamada já identificada.
    if (idEvento === estado.ultimaChamada) {
      return;
    }

    estado.ultimaChamada = idEvento;

    // Encaminhar somente chamadas novas.
    notificarChamada(chamada, false);
  }

  /**
   * Executa uma consulta à API.
   */
  async function consultar(geracao = estado.geracao) {
    if (!execucaoValida(geracao) || estado.consultando) {
      return;
    }

    const controlador = estado.controlador;

    if (!controlador) {
      return;
    }

    estado.consultando = true;

    try {
      const computador = estado.computador;
      const maquinas = [...estado.maquinas];

      const dados = await window.GridAPI.obterChamada(
        computador,
        maquinas,
        controlador.signal,
      );

      if (!execucaoValida(geracao)) {
        return;
      }

      estado.ultimaResposta = dados;

      processarChamadaAtual(dados.chamada_atual);

      notificarAtualizacao(dados);

      estado.primeiraConsulta = false;
    } catch (erro) {
      if (execucaoValida(geracao) && erro.name !== "AbortError") {
        notificarErro(erro);
      }
    } finally {
      if (estado.geracao === geracao) {
        estado.consultando = false;
      }
    }
  }

  /**
   * Agenda a próxima consulta.
   */
  function agendarConsulta(geracao) {
    if (!execucaoValida(geracao)) {
      return;
    }

    clearTimeout(estado.temporizador);

    estado.temporizador = setTimeout(async function () {
      if (!execucaoValida(geracao)) {
        return;
      }

      await consultar(geracao);

      // Só agenda novamente se continuar na mesma execução.
      agendarConsulta(geracao);
    }, estado.intervalo);
  }

  /**
   * Inicia uma nova geração de monitoramento.
   */
  function iniciarExecucao() {
    // Cancela uma consulta da execução anterior.
    if (estado.controlador) {
      estado.controlador.abort();
    }

    estado.geracao++;

    const geracao = estado.geracao;

    estado.consultando = false;

    clearTimeout(estado.temporizador);
    estado.temporizador = null;

    estado.controlador = new AbortController();

    consultar(geracao).finally(() => {
      agendarConsulta(geracao);
    });
  }

  /**
   * Inicia o monitoramento.
   */
  function iniciar(opcoes = {}) {
    if (estado.iniciado) {
      return;
    }

    const computador = Number(opcoes.computador);

    const maquinas = Array.isArray(opcoes.maquinas)
      ? [
          ...new Set(
            opcoes.maquinas
              .map(Number)
              .filter((maquina) => Number.isInteger(maquina) && maquina > 0),
          ),
        ]
      : [];

    if (!Number.isInteger(computador) || computador <= 0) {
      throw new Error("Computador inválido para iniciar o monitoramento.");
    }

    if (maquinas.length === 0) {
      throw new Error("Nenhuma máquina válida foi informada.");
    }

    estado.computador = computador;
    estado.maquinas = maquinas;

    estado.intervalo = Math.max(
      500,
      Number(opcoes.intervalo) || INTERVALO_PADRAO,
    );

    estado.ultimaChamada = null;
    estado.ultimaResposta = null;
    estado.primeiraConsulta = true;
    estado.iniciado = true;

    iniciarExecucao();
  }

  /**
   * Interrompe o monitoramento e invalida consultas anteriores.
   */
  function parar() {
    estado.iniciado = false;

    estado.geracao++;

    clearTimeout(estado.temporizador);

    estado.temporizador = null;
    estado.consultando = false;

    if (estado.controlador) {
      estado.controlador.abort();
      estado.controlador = null;
    }

    return true;
  }

  /**
   * Atualiza as máquinas utilizadas nas consultas.
   */
  function atualizarMaquinas(maquinas) {
    if (!Array.isArray(maquinas)) {
      throw new Error("A relação de máquinas informada é inválida.");
    }

    const novasMaquinas = [
      ...new Set(
        maquinas
          .map(Number)
          .filter((maquina) => Number.isInteger(maquina) && maquina > 0),
      ),
    ];

    if (novasMaquinas.length === 0) {
      throw new Error("Nenhuma máquina válida foi informada.");
    }

    const mudou =
      novasMaquinas.length !== estado.maquinas.length ||
      novasMaquinas.some(
        (maquina, indice) => maquina !== estado.maquinas[indice],
      );

    if (!mudou) {
      return false;
    }

    estado.maquinas = novasMaquinas;

    // Se estiver monitorando, reinicia a consulta com a nova relação.
    if (estado.iniciado) {
      iniciarExecucao();
    }

    return true;
  }

  /**
   * Retorna uma cópia do estado atual.
   */
  function obterEstado() {
    return {
      iniciado: estado.iniciado,
      consultando: estado.consultando,
      computador: estado.computador,
      maquinas: [...estado.maquinas],
      intervalo: estado.intervalo,
      ultimaChamada: estado.ultimaChamada,
      primeiraConsulta: estado.primeiraConsulta,
      ultimaResposta: estado.ultimaResposta,
    };
  }

  window.GridChamadas = Object.freeze({
    iniciar,
    parar,
    consultar,
    atualizarMaquinas,
    obterEstado,
  });
})(window);
