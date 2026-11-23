(() => {
  "use strict";

  const elementos = {
    lista: document.getElementById("listaFilas"),
    mensagem: document.getElementById("mensagemFilas"),
    btnSalvar: document.getElementById("btnSalvarFilas"),
    btnAbrir: document.getElementById("btnAbrirConfiguracoes"),
    painel: document.getElementById("painelConfiguracoes"),
  };

  const estado = {
    carregando: false,
    salvando: false,
    computador: null,
    filas: [],
    selecionadas: new Set(),
  };

  function mostrarMensagem(texto, tipo = "info") {
    if (!elementos.mensagem) {
      return;
    }

    elementos.mensagem.textContent = texto;
    elementos.mensagem.className = `mensagem mensagem--${tipo}`;
  }

  function limparMensagem() {
    if (!elementos.mensagem) {
      return;
    }

    elementos.mensagem.textContent = "";
    elementos.mensagem.className = "mensagem";
  }

  function computadorAtual() {
    const dados = window.GridConfiguracaoPainel?.obterEstado();
    const id = Number(dados?.computador?.id);

    return Number.isInteger(id) && id > 0 ? id : null;
  }

  function atualizarBotao() {
    if (!elementos.btnSalvar) {
      return;
    }

    elementos.btnSalvar.disabled =
      estado.carregando || estado.salvando || !estado.computador;
  }

  function renderizar() {
    if (!elementos.lista) {
      return;
    }

    const fragmento = document.createDocumentFragment();

    estado.filas.forEach((fila) => {
      const id = Number(fila.id);

      if (!Number.isInteger(id) || id <= 0) {
        return;
      }

      const rotulo = document.createElement("label");
      rotulo.className = "configuracoes__fila";

      const caixa = document.createElement("input");
      caixa.type = "checkbox";
      caixa.value = String(id);
      caixa.checked = estado.selecionadas.has(id);

      caixa.addEventListener("change", () => {
        if (caixa.checked) {
          estado.selecionadas.add(id);
        } else {
          estado.selecionadas.delete(id);
        }
      });

      const nome = document.createElement("span");
      nome.textContent = fila.nome_curto
        ? `${fila.nome} (${fila.nome_curto})`
        : String(fila.nome || "");

      rotulo.append(caixa, nome);
      fragmento.appendChild(rotulo);
    });

    elementos.lista.replaceChildren(fragmento);
  }

  async function carregar() {
    if (estado.carregando || estado.salvando) {
      return;
    }

    const computador = computadorAtual();

    if (!computador) {
      mostrarMensagem("Nenhum computador ativo para configurar.", "erro");
      return;
    }

    estado.carregando = true;
    atualizarBotao();
    mostrarMensagem("Carregando filas...", "info");

    try {
      const [respostaFilas, respostaConfig] = await Promise.all([
        window.GridAPI.obterFilas(),
        window.GridAPI.obterConfiguracoes(computador),
      ]);

      estado.computador = computador;
      estado.filas = Array.isArray(respostaFilas?.filas)
        ? respostaFilas.filas
        : [];

      const filasSalvas = respostaConfig?.configuracoes?.geral?.filas;

      estado.selecionadas = new Set(
        (Array.isArray(filasSalvas) ? filasSalvas : [])
          .map(Number)
          .filter((id) => Number.isInteger(id) && id > 0),
      );

      renderizar();
      limparMensagem();

      if (estado.filas.length === 0) {
        mostrarMensagem("Nenhuma fila ativa foi encontrada.", "info");
      }
    } catch (erro) {
      mostrarMensagem(
        erro?.message || "Não foi possível carregar as filas.",
        "erro",
      );
    } finally {
      estado.carregando = false;
      atualizarBotao();
    }
  }

  async function salvar() {
    if (estado.salvando || estado.carregando || !estado.computador) {
      return;
    }

    estado.salvando = true;
    atualizarBotao();
    mostrarMensagem("Salvando filas...", "info");

    const filas = [...estado.selecionadas]
      .filter((id) => Number.isInteger(id) && id > 0)
      .sort((a, b) => a - b);

    try {
      await window.GridAPI.salvarConfiguracoes(estado.computador, {
        geral: { filas },
      });

      mostrarMensagem("Filas salvas com sucesso.", "sucesso");

      if (window.GridSincronizacao?.verificar) {
        window.GridSincronizacao.verificar();
      }
    } catch (erro) {
      mostrarMensagem(
        erro?.message || "Não foi possível salvar as filas.",
        "erro",
      );
    } finally {
      estado.salvando = false;
      atualizarBotao();
    }
  }

  elementos.btnAbrir?.addEventListener("click", carregar);
  elementos.btnSalvar?.addEventListener("click", salvar);

  document.addEventListener("grid:painel-inicializado", () => {
    if (elementos.painel && !elementos.painel.hidden) {
      carregar();
    }
  });

  window.GridConfiguracoesAdmin = Object.freeze({
    carregar,
    salvar,

    obterEstado() {
      return {
        computador: estado.computador,
        filas: [...estado.filas],
        selecionadas: [...estado.selecionadas],
        carregando: estado.carregando,
        salvando: estado.salvando,
      };
    },
  });
})();