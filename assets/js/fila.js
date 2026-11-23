(function (window) {
  "use strict";

  const estado = {
    chamadas: [],
    processando: false,
    chamadaAtual: null,
    idsProcessados: new Set(),
    mostrarChamada: null,
    executarAudio: null,
    execucao: 0,
  };

  function mostrar(chamada, animar = true) {
    if (typeof estado.mostrarChamada === "function") {
      estado.mostrarChamada(chamada, animar);
      return;
    }

    window.dispatchEvent(
      new CustomEvent("grid:mostrar-chamada", {
        detail: {
          chamada,
          animar,
        },
      }),
    );
  }

  /**
   * Adiciona uma chamada à fila.
   */
  function enfileirar(chamada) {
    if (!chamada || !chamada.id_evento) {
      return false;
    }

    const idEvento = String(chamada.id_evento);

    if (
      estado.chamadaAtual &&
      String(estado.chamadaAtual.id_evento) === idEvento
    ) {
      return false;
    }

    if (estado.idsProcessados.has(idEvento)) {
      return false;
    }

    const jaNaFila = estado.chamadas.some(
      (item) => String(item.id_evento) === idEvento,
    );

    if (jaNaFila) {
      return false;
    }

    estado.chamadas.push(chamada);
    estado.idsProcessados.add(idEvento);

    processar();

    return true;
  }

  /**
   * Processa as chamadas sequencialmente.
   */
  async function processar() {
    if (estado.processando) {
      return;
    }

    if (typeof estado.executarAudio !== "function") {
      return;
    }

    if (estado.chamadas.length === 0) {
      return;
    }

    estado.processando = true;

    const execucao = estado.execucao;

    try {
      while (estado.chamadas.length > 0 && execucao === estado.execucao) {
        const chamada = estado.chamadas.shift();

        estado.chamadaAtual = chamada;

        try {
          // Atualiza a interface antes do áudio.
          mostrar(chamada, true);

          await estado.executarAudio(chamada);
        } catch (erro) {
          console.error("Erro ao executar chamada:", erro);
        } finally {
          // Uma execução antiga não pode limpar a chamada nova.
          if (execucao === estado.execucao) {
            estado.chamadaAtual = null;
          }
        }
      }
    } finally {
      // Só a execução atual pode alterar esse estado.
      if (execucao === estado.execucao) {
        estado.processando = false;

        if (estado.chamadas.length > 0) {
          processar();
        }
      }
    }
  }

  /**
   * Recebe a chamada inicial ou uma chamada nova.
   */
  function receberChamada(evento) {
    const dados = evento.detail || {};
    const chamada = dados.chamada;

    if (!chamada) {
      return;
    }

    // A primeira consulta apenas apresenta a chamada existente.
    if (dados.inicializacao) {
      mostrar(chamada, false);
      return;
    }

    enfileirar(chamada);
  }

  /**
   * Configura as funções fornecidas pelos outros módulos.
   */
  function configurar(opcoes = {}) {
    if (typeof opcoes.mostrarChamada === "function") {
      estado.mostrarChamada = opcoes.mostrarChamada;
    }

    if (typeof opcoes.executarAudio === "function") {
      estado.executarAudio = opcoes.executarAudio;
    }

    processar();
  }

  /**
   * Reinicia completamente a fila.
   *
   * Utilizado principalmente na troca de computador.
   */
  function resetar() {
    // Invalida o processamento anterior.
    estado.execucao++;

    // Descarta as chamadas pendentes.
    estado.chamadas = [];

    // Limpa o controle de duplicidades.
    estado.idsProcessados.clear();

    // Limpa a chamada atual.
    estado.chamadaAtual = null;

    // Libera o estado para a nova fila.
    estado.processando = false;

    // Interrompe o áudio anterior.
    if (window.GridAudio?.cancelar) {
      window.GridAudio.cancelar();
    }

    return true;
  }

  /**
   * Retorna o estado atual da fila.
   */
  function obterEstado() {
    return {
      quantidadePendente: estado.chamadas.length,
      processando: estado.processando,
      chamadaAtual: estado.chamadaAtual,
      chamadasPendentes: [...estado.chamadas],
      quantidadeProcessada: estado.idsProcessados.size,
    };
  }

  window.addEventListener("grid:nova-chamada", receberChamada);

  window.GridFila = Object.freeze({
    configurar,
    enfileirar,
    processar,
    resetar,
    obterEstado,
  });
})(window);
