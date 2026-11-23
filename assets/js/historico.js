(function (window) {
  "use strict";

  const elementos = {
    lista: document.getElementById("historicoLista"),
  };

  const estado = {
    chamadas: [],
    quantidade: 4,
    chamadaAtual: null,
  };

  /**
   * Normaliza textos.
   */
  function texto(valor) {
    return String(valor || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Extrai o horário da chamada.
   */
  function obterHora(data) {
    if (!data) {
      return "--:--";
    }

    const partes = String(data).split(" ");

    if (partes.length > 1) {
      return partes[1].substring(0, 5);
    }

    return data;
  }

  /**
   * Atualiza a quantidade máxima de registros.
   */
  function definirQuantidade(quantidade) {
    const valor = Number(quantidade);

    if (!Number.isInteger(valor) || valor < 2 || valor > 5) {
      throw new Error("A quantidade do histórico deve estar entre 2 e 5.");
    }

    estado.quantidade = valor;

    renderizar();
  }

  /**
   * Verifica se uma chamada já existe no histórico.
   */
  function existe(idEvento) {
    return estado.chamadas.some((chamada) => chamada.id_evento === idEvento);
  }

  /**
   * Remove a chamada atualmente exibida do histórico.
   */
  function removerChamadaAtual() {
    const idEvento = estado.chamadaAtual?.id_evento;

    if (!idEvento) {
      return;
    }

    estado.chamadas = estado.chamadas.filter(
      (chamada) => chamada.id_evento !== idEvento,
    );
  }

  /**
   * Ordena as chamadas da mais recente para a mais antiga.
   */
  function ordenar() {
    estado.chamadas.sort((a, b) => {
      return String(b.data_evento || "").localeCompare(
        String(a.data_evento || ""),
      );
    });
  }

  /**
   * Adiciona chamadas recebidas da API.
   */
  function atualizar(chamadas, chamadaAtual = null) {
    if (!Array.isArray(chamadas)) {
      return;
    }

    if (chamadaAtual) {
      estado.chamadaAtual = chamadaAtual;
    }

    chamadas.forEach((chamada) => {
      if (!chamada || !chamada.id_evento) {
        return;
      }

      if (!existe(chamada.id_evento)) {
        estado.chamadas.push(chamada);
      }
    });

    removerChamadaAtual();

    ordenar();

    estado.chamadas = estado.chamadas.slice(0, estado.quantidade);

    renderizar();
  }

  /**
   * Atualiza a chamada principal atualmente exibida.
   */
  function definirChamadaAtual(chamada) {
    estado.chamadaAtual = chamada || null;

    removerChamadaAtual();

    ordenar();

    renderizar();
  }

  /**
   * Cria um elemento de histórico sem inserir HTML diretamente.
   */
  function criarItem(chamada) {
    const item = document.createElement("div");
    item.className = "historico-item";

    const nome = document.createElement("div");
    nome.className = "historico-nome";
    nome.textContent = texto(chamada.paciente);

    const guiche = document.createElement("div");
    guiche.className = "historico-guiche";
    guiche.textContent = texto(chamada.guiche);

    const horario = document.createElement("div");
    horario.className = "historico-hora";
    horario.textContent = obterHora(chamada.data_evento);

    item.append(nome, guiche, horario);

    return item;
  }

  /**
   * Renderiza o histórico na página.
   */
  function renderizar() {
    if (!elementos.lista) {
      return;
    }

    const fragmento = document.createDocumentFragment();

    estado.chamadas.forEach((chamada) => {
      fragmento.appendChild(criarItem(chamada));
    });

    elementos.lista.replaceChildren(fragmento);
  }

  /**
   * Limpa o histórico.
   */
  function limpar() {
    estado.chamadas = [];
    renderizar();
  }

  /**
   * Reinicia o histórico para um novo computador.
   */
  function resetar() {
    estado.chamadas = [];
    estado.chamadaAtual = null;

    renderizar();
  }

  /**
   * Retorna o estado atual do histórico.
   */
  function obterEstado() {
    return {
      quantidade: estado.quantidade,
      chamadaAtual: estado.chamadaAtual,
      chamadas: [...estado.chamadas],
    };
  }

  window.GridHistorico = Object.freeze({
    atualizar,
    definirChamadaAtual,
    definirQuantidade,
    renderizar,
    limpar,
    resetar,
    obterEstado,
  });
})(window);
