(() => {
  "use strict";

  const elementos = {
    lista: document.getElementById("listaFilas"),
    mensagem: document.getElementById("mensagemFilas"),
    btnSalvar: document.getElementById("btnSalvarFilas"),
    btnAbrir: document.getElementById("btnAbrirConfiguracoes"),
    painel: document.getElementById("painelConfiguracoes"),
    backdrop: document.getElementById("configuracoesBackdrop"),
    mensagemAdmin: document.getElementById("mensagemAdmin"),
    btnTestar: document.getElementById("btnTestarConfiguracoes"),
    btnCancelar: document.getElementById("btnCancelarConfiguracoes"),
    btnConfirmar: document.getElementById("btnConfirmarConfiguracoes"),
    btnVoltar: document.getElementById("btnVoltarConfiguracoes"),
  };

  const CORES = [
    "fundo",
    "texto",
    "primaria",
    "secundaria",
    "destaque",
    "historico",
    "borda",
  ];

  const CAMPOS = [
    { id: "selectTema", caminho: ["tema"], tipo: "texto" },
    { id: "tituloPainel", caminho: ["geral", "titulo"], tipo: "texto" },
    { id: "fonteFamilia", caminho: ["aparencia", "fontes", "familia"], tipo: "texto" },
    { id: "espacamento", caminho: ["aparencia", "espacamento"], tipo: "numero" },
    { id: "tituloChamada", caminho: ["chamada", "titulo"], tipo: "texto" },
    { id: "selectAnimacao", caminho: ["chamada", "animacao"], tipo: "texto" },
    { id: "duracaoChamada", caminho: ["chamada", "duracao"], tipo: "numero" },
    { id: "tamanhoPaciente", caminho: ["aparencia", "fontes", "paciente"], tipo: "numero" },
    { id: "tamanhoGuiche", caminho: ["aparencia", "fontes", "guiche"], tipo: "numero" },
    { id: "quantidadeHistorico", caminho: ["historico", "quantidade"], tipo: "numero" },
    { id: "campoTituloHistorico", caminho: ["historico", "titulo"], tipo: "texto" },
    { id: "mostrarHorario", caminho: ["historico", "mostrar_horario"], tipo: "booleano" },
    { id: "tamanhoHistorico", caminho: ["aparencia", "fontes", "historico"], tipo: "numero" },
  ];

  const estado = {
    carregando: false,
    salvando: false,
    computador: null,
    filas: [],
    selecionadas: new Set(),
    original: null,
    rascunho: null,
    modoTeste: false,
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

  function mostrarMensagemAdmin(texto, tipo = "info") {
    if (!elementos.mensagemAdmin) {
      return;
    }

    elementos.mensagemAdmin.textContent = texto;
    elementos.mensagemAdmin.className = `mensagem mensagem--${tipo}`;
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

  function atualizarBotoesAdmin() {
    const ocupado = estado.carregando || estado.salvando || !estado.rascunho;

    [elementos.btnTestar, elementos.btnCancelar, elementos.btnConfirmar].forEach(
      (botao) => {
        if (botao) {
          botao.disabled = ocupado;
        }
      },
    );
  }

  function obterCaminho(objeto, caminho) {
    return caminho.reduce((atual, chave) => atual?.[chave], objeto);
  }

  function definirCaminho(objeto, caminho, valor) {
    let atual = objeto;

    for (let indice = 0; indice < caminho.length - 1; indice += 1) {
      const chave = caminho[indice];

      if (!atual[chave] || typeof atual[chave] !== "object") {
        atual[chave] = {};
      }

      atual = atual[chave];
    }

    atual[caminho[caminho.length - 1]] = valor;
  }

  function clonar(configuracoes) {
    return configuracoes
      ? JSON.parse(JSON.stringify(configuracoes))
      : null;
  }

  function idCor(nome) {
    return `cor${nome.charAt(0).toUpperCase()}${nome.slice(1)}`;
  }

  function aplicarPreview() {
    if (!estado.rascunho) {
      return;
    }

    document.dispatchEvent(
      new CustomEvent("grid:configuracoes-preview", {
        detail: { configuracoes: estado.rascunho },
      }),
    );
  }

  function preencherFormularios() {
    if (!estado.rascunho) {
      return;
    }

    CAMPOS.forEach((campo) => {
      const elemento = document.getElementById(campo.id);

      if (!elemento) {
        return;
      }

      const valor = obterCaminho(estado.rascunho, campo.caminho);

      if (campo.tipo === "booleano") {
        elemento.checked = valor !== false;
        return;
      }

      elemento.value =
        valor === null || valor === undefined ? "" : String(valor);
    });

    CORES.forEach((nome) => {
      const entrada = document.getElementById(idCor(nome));
      const padrao = document.getElementById(`${idCor(nome)}Padrao`);

      if (!entrada || !padrao) {
        return;
      }

      const valor = estado.rascunho?.aparencia?.cores?.[nome];
      const usarPadrao = valor === null || valor === undefined;

      padrao.checked = usarPadrao;
      entrada.disabled = usarPadrao;

      if (!usarPadrao) {
        entrada.value = valor;
      }
    });
  }

  function registrarCampos() {
    CAMPOS.forEach((campo) => {
      const elemento = document.getElementById(campo.id);

      if (!elemento) {
        return;
      }

      const evento =
        elemento.tagName === "SELECT" || elemento.type === "checkbox"
          ? "change"
          : "input";

      elemento.addEventListener(evento, () => {
        if (!estado.rascunho) {
          return;
        }

        let valor;

        if (campo.tipo === "booleano") {
          valor = elemento.checked;
        } else if (campo.tipo === "numero") {
          valor = elemento.value === "" ? null : Number(elemento.value);

          if (valor !== null && !Number.isFinite(valor)) {
            return;
          }
        } else {
          const texto = elemento.value.trim();
          valor = texto === "" ? null : texto;
        }

        definirCaminho(estado.rascunho, campo.caminho, valor);
        aplicarPreview();
      });
    });

    CORES.forEach((nome) => {
      const entrada = document.getElementById(idCor(nome));
      const padrao = document.getElementById(`${idCor(nome)}Padrao`);

      if (!entrada || !padrao) {
        return;
      }

      const atualizar = () => {
        if (!estado.rascunho) {
          return;
        }

        entrada.disabled = padrao.checked;

        definirCaminho(
          estado.rascunho,
          ["aparencia", "cores", nome],
          padrao.checked ? null : entrada.value,
        );

        aplicarPreview();
      };

      entrada.addEventListener("input", atualizar);
      padrao.addEventListener("change", atualizar);
    });
  }

  function trocarAba(nome) {
    document.querySelectorAll("[data-aba]").forEach((botao) => {
      const ativa = botao.dataset.aba === nome;

      botao.classList.toggle("configuracoes__aba--ativa", ativa);
      botao.setAttribute("aria-selected", String(ativa));
    });

    document.querySelectorAll("[data-painel-aba]").forEach((painel) => {
      painel.hidden = painel.dataset.painelAba !== nome;
    });
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
    atualizarBotoesAdmin();
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

      estado.original = respostaConfig?.configuracoes || null;
      estado.rascunho = clonar(estado.original);

      renderizar();
      preencherFormularios();
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
      atualizarBotoesAdmin();
    }
  }

  async function salvar() {
    if (estado.salvando || estado.carregando || !estado.computador) {
      return;
    }

    estado.salvando = true;
    atualizarBotao();
    atualizarBotoesAdmin();
    mostrarMensagem("Salvando filas...", "info");

    const filas = [...estado.selecionadas]
      .filter((id) => Number.isInteger(id) && id > 0)
      .sort((a, b) => a - b);

    try {
      await window.GridAPI.salvarConfiguracoes(estado.computador, {
        geral: { filas },
      });

      [estado.original, estado.rascunho].forEach((config) => {
        if (config?.geral) {
          config.geral.filas = [...filas];
        }
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
      atualizarBotoesAdmin();
    }
  }

  function entrarModoTeste() {
    if (!estado.rascunho) {
      return;
    }

    estado.modoTeste = true;

    if (elementos.painel) {
      elementos.painel.hidden = true;
    }

    if (elementos.backdrop) {
      elementos.backdrop.hidden = true;
    }

    if (elementos.btnVoltar) {
      elementos.btnVoltar.hidden = false;
    }
  }

  function sairModoTeste() {
    estado.modoTeste = false;

    if (elementos.btnVoltar) {
      elementos.btnVoltar.hidden = true;
    }

    if (elementos.painel) {
      elementos.painel.hidden = false;
    }

    if (elementos.backdrop) {
      elementos.backdrop.hidden = false;
    }
  }

  async function confirmar() {
    if (estado.salvando || !estado.computador || !estado.rascunho) {
      return;
    }

    estado.salvando = true;
    atualizarBotoesAdmin();
    mostrarMensagemAdmin("Salvando configurações...", "info");

    const rascunho = clonar(estado.rascunho);
    delete rascunho.versao;

    if (rascunho.geral) {
      delete rascunho.geral.computador;
    }

    try {
      const resposta = await window.GridAPI.salvarConfiguracoes(
        estado.computador,
        rascunho,
      );

      estado.original = resposta?.configuracoes || estado.rascunho;
      estado.rascunho = clonar(estado.original);

      preencherFormularios();

      if (estado.modoTeste) {
        sairModoTeste();
      }

      mostrarMensagemAdmin("Configurações salvas com sucesso.", "sucesso");

      if (window.GridSincronizacao?.verificar) {
        window.GridSincronizacao.verificar();
      }
    } catch (erro) {
      mostrarMensagemAdmin(
        erro?.message || "Não foi possível salvar as configurações.",
        "erro",
      );
    } finally {
      estado.salvando = false;
      atualizarBotoesAdmin();
    }
  }

  function cancelar() {
    if (!estado.original || estado.salvando) {
      return;
    }

    estado.rascunho = clonar(estado.original);

    preencherFormularios();
    aplicarPreview();

    if (estado.modoTeste) {
      sairModoTeste();
    }

    mostrarMensagemAdmin("Alterações descartadas.", "info");
  }

  elementos.btnAbrir?.addEventListener("click", carregar);
  elementos.btnSalvar?.addEventListener("click", salvar);
  elementos.btnTestar?.addEventListener("click", entrarModoTeste);
  elementos.btnVoltar?.addEventListener("click", sairModoTeste);
  elementos.btnConfirmar?.addEventListener("click", confirmar);
  elementos.btnCancelar?.addEventListener("click", cancelar);

  document.querySelectorAll("[data-aba]").forEach((botao) => {
    botao.addEventListener("click", () => trocarAba(botao.dataset.aba));
  });

  document.addEventListener("grid:painel-inicializado", () => {
    if (elementos.painel && !elementos.painel.hidden) {
      carregar();
    }
  });

  registrarCampos();

  window.GridConfiguracoesAdmin = Object.freeze({
    carregar,
    salvar,
    confirmar,
    cancelar,

    obterEstado() {
      return {
        computador: estado.computador,
        filas: [...estado.filas],
        selecionadas: [...estado.selecionadas],
        carregando: estado.carregando,
        salvando: estado.salvando,
        modoTeste: estado.modoTeste,
        rascunho: clonar(estado.rascunho),
      };
    },
  });
})();