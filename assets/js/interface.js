(() => {
  "use strict";

  const estado = {
    chamadaAtual: null,
    conexao: false,
    status: "",
    ultimoHorario: null,
    timerChamada: null,
  };

  const elementos = {
    paciente: document.getElementById("pacienteAtual"),
    guiche: document.getElementById("guicheAtual"),
    historico: document.getElementById("historicoLista"),
    status: document.getElementById("status"),
    conexao: document.getElementById("conexao"),
    indicador: document.querySelector(".indicador-chamada"),
  };

  function obterHora(chamada) {
    if (!chamada?.data_evento) {
      return null;
    }

    const data = String(chamada.data_evento);
    const correspondencia = data.match(/\d{2}:\d{2}(?::\d{2})?/);

    return correspondencia ? correspondencia[0].substring(0, 5) : null;
  }

  function definirStatus(mensagem) {
    estado.status = mensagem || "";

    if (elementos.status) {
      elementos.status.textContent = estado.status;
    }
  }

  function definirConexao(online) {
    estado.conexao = Boolean(online);

    if (!elementos.conexao) {
      return;
    }

    elementos.conexao.textContent = estado.conexao
      ? "● ONLINE"
      : "● SEM CONEXÃO";

    elementos.conexao.classList.toggle("erro", !estado.conexao);
  }

  function animarPaciente() {
    if (!elementos.paciente) {
      return;
    }

    elementos.paciente.classList.remove("animar");

    // Reinicia a animação CSS.
    void elementos.paciente.offsetWidth;

    elementos.paciente.classList.add("animar");
  }

  function telaChamada() {
    document.body.classList.add("chamada-ativa");

    if (elementos.indicador) {
      elementos.indicador.classList.remove("mostrar");

      void elementos.indicador.offsetWidth;

      elementos.indicador.classList.add("mostrar");
    }

    if (estado.timerChamada) {
      clearTimeout(estado.timerChamada);
    }

    estado.timerChamada = setTimeout(() => {
      document.body.classList.remove("chamada-ativa");

      if (elementos.indicador) {
        elementos.indicador.classList.remove("mostrar");
      }

      estado.timerChamada = null;
    }, 8000);
  }

  function mostrarPaciente(chamada, animar = true) {
    if (!chamada) {
      return;
    }

    estado.chamadaAtual = chamada;
    estado.ultimoHorario = obterHora(chamada);

    if (elementos.paciente) {
      elementos.paciente.textContent =
        chamada.paciente || "Paciente não identificado";
    }

    if (elementos.guiche) {
      elementos.guiche.textContent = chamada.guiche || "";
    }

    if (animar) {
      animarPaciente();
      telaChamada();
    }

    if (estado.ultimoHorario) {
      definirStatus(`Última chamada: ${estado.ultimoHorario}`);
    }

    if (window.GridHistorico) {
      GridHistorico.definirChamadaAtual(chamada);
    }
  }

  function processarDados(dados) {
    definirConexao(true);

    if (!dados) {
      return;
    }

    if (window.GridHistorico) {
      GridHistorico.atualizar(dados.ultimas || [], dados.chamada_atual || null);
    }
  }

  function processarErro() {
    definirConexao(false);
    definirStatus("Aguardando conexão...");
  }

  function processarStatus(evento) {
    const mensagem = evento?.detail?.mensagem;

    if (!mensagem) {
      return;
    }

    if (mensagem === "Chamada finalizada." && estado.ultimoHorario) {
      definirStatus(`Última chamada: ${estado.ultimoHorario}`);
      return;
    }

    definirStatus(mensagem);
  }

  // Eventos emitidos pelos demais módulos.
  document.addEventListener("grid:dados-atualizados", (evento) => {
    processarDados(evento.detail);
  });

  document.addEventListener("grid:erro-comunicacao", () => {
    processarErro();
  });

  document.addEventListener("grid:status", (evento) => {
    processarStatus(evento);
  });

  // Integra a fila com a interface e o áudio.
  if (window.GridFila && window.GridAudio) {
    GridFila.configurar({
      mostrarChamada: mostrarPaciente,
      executarAudio: GridAudio.executarChamada,
    });
  }

  window.GridInterface = {
    mostrarPaciente,
    telaChamada,
    definirConexao,
    definirStatus,
    obterEstado() {
      return {
        ...estado,
      };
    },
  };
})();
