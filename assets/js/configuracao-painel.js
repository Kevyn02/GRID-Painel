(() => {
  "use strict";

  const CONFIG = {
    api: {
      computadores: "api/computadores.php",
      maquinas: "api/maquinas.php",
    },

    armazenamento: {
      computador: "grid:painel:computador:v1",
    },

    tentativasIniciais: 5,
    intervaloTentativas: 2000,
    intervaloAtualizacao: 30 * 60 * 1000,
  };

  const elementos = {
    telaInicial: document.getElementById("telaConfiguracaoInicial"),
    painelPrincipal: document.getElementById("painelPrincipal"),

    mensagem: document.getElementById("mensagemConfiguracao"),
    selectComputador: document.getElementById("selectComputador"),

    btnConfirmar: document.getElementById("btnConfirmarComputador"),
    btnRecarregar: document.getElementById("btnRecarregarComputadores"),

    btnAbrirConfiguracoes: document.getElementById("btnAbrirConfiguracoes"),
    btnFecharConfiguracoes: document.getElementById("btnFecharConfiguracoes"),
    btnTrocarComputador: document.getElementById("btnTrocarComputador"),

    painelConfiguracoes: document.getElementById("painelConfiguracoes"),
    configuracoesBackdrop: document.getElementById("configuracoesBackdrop"),
  };

  const estado = {
    computador: null,
    maquinas: [],

    inicializado: false,
    carregando: false,
    atualizandoMaquinas: false,

    ultimaAtualizacao: null,
    geracao: 0,
  };

  /* ========================================
     Utilitários
  ========================================= */

  function aguardar(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function mostrarMensagem(texto, tipo = "info") {
    elementos.mensagem.textContent = texto;
    elementos.mensagem.className = `mensagem mensagem--${tipo}`;
  }

  function limparMensagem() {
    elementos.mensagem.textContent = "";
    elementos.mensagem.className = "mensagem";
  }

  function bloquearFormulario(bloquear) {
    const ocupado = bloquear || estado.carregando;

    elementos.selectComputador.disabled = ocupado;

    elementos.btnConfirmar.disabled =
      ocupado || !elementos.selectComputador.value;

    elementos.btnRecarregar.disabled = ocupado;
  }

  /* ========================================
     Requisições
  ========================================= */

  async function requisitar(url) {
    const resposta = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!resposta.ok) {
      throw new Error(`Erro HTTP ${resposta.status}`);
    }

    const dados = await resposta.json();

    if (
      dados &&
      (dados.sucesso === false || dados.success === false || dados.erro)
    ) {
      throw new Error(
        dados.mensagem ||
          dados.message ||
          dados.erro ||
          "O servidor retornou um erro.",
      );
    }

    return dados;
  }

  function extrairLista(resposta, propriedades) {
    if (Array.isArray(resposta)) {
      return resposta;
    }

    if (!resposta || typeof resposta !== "object") {
      return [];
    }

    for (const propriedade of propriedades) {
      if (Array.isArray(resposta[propriedade])) {
        return resposta[propriedade];
      }
    }

    for (const propriedade of ["dados", "data", "resultado"]) {
      const valor = resposta[propriedade];

      if (Array.isArray(valor)) {
        return valor;
      }

      if (valor && typeof valor === "object") {
        const lista = extrairLista(valor, propriedades);

        if (lista.length > 0) {
          return lista;
        }
      }
    }

    return [];
  }

  /* ========================================
     Normalização dos dados
  ========================================= */

  function normalizarComputador(computador) {
    return {
      id: String(
        computador.id ??
          computador.NR_SEQUENCIA ??
          computador.nr_sequencia ??
          "",
      ),

      nome: String(
        computador.nome ??
          computador.NM_COMPUTADOR ??
          computador.nm_computador ??
          "",
      ),
    };
  }

  function normalizarMaquina(maquina) {
    return {
      id: String(
        maquina.id ??
          maquina.NR_SEQ_MAQUINA_LOCAL_SENHA ??
          maquina.nr_seq_maquina_local_senha ??
          "",
      ),

      nome: String(
        maquina.nome ??
          maquina.DS_LOCAL_CURTO ??
          maquina.ds_local_curto ??
          maquina.DS_LOCAL ??
          maquina.ds_local ??
          "",
      ),

      descricao: String(
        maquina.descricao ?? maquina.DS_LOCAL ?? maquina.ds_local ?? "",
      ),

      computador: String(
        maquina.computador ??
          maquina.NR_SEQ_COMPUTADOR ??
          maquina.nr_seq_computador ??
          "",
      ),

      monitor: String(
        maquina.monitor ??
          maquina.NR_SEQ_COMP_MONITOR ??
          maquina.nr_seq_comp_monitor ??
          "",
      ),
    };
  }

  /* ========================================
     Tentativas de comunicação
  ========================================= */

  async function executarComTentativas(
    callback,
    quantidade = CONFIG.tentativasIniciais,
  ) {
    let ultimoErro = null;

    for (let tentativa = 1; tentativa <= quantidade; tentativa++) {
      try {
        return await callback();
      } catch (erro) {
        ultimoErro = erro;

        if (tentativa < quantidade) {
          mostrarMensagem(
            `Falha na comunicação. Tentativa ${tentativa} de ${quantidade}.`,
            "info",
          );

          await aguardar(CONFIG.intervaloTentativas);
        }
      }
    }

    throw ultimoErro || new Error("Não foi possível concluir a operação.");
  }

  /* ========================================
     Carregamento de computadores
  ========================================= */

  async function carregarComputadores() {
    const resposta = await requisitar(CONFIG.api.computadores);

    const lista = extrairLista(resposta, ["computadores", "lista", "items"]);

    const computadores = lista
      .map(normalizarComputador)
      .filter((item) => item.id && item.nome);

    if (computadores.length === 0) {
      throw new Error("Nenhum computador ativo foi encontrado.");
    }

    return computadores;
  }

  /* ========================================
     Carregamento de máquinas
  ========================================= */

  async function carregarMaquinas(idComputador) {
    const url = new URL(CONFIG.api.maquinas, window.location.href);

    url.searchParams.set("computador", idComputador);

    const resposta = await requisitar(url.toString());

    const lista = extrairLista(resposta, ["maquinas", "lista", "items"]);

    const maquinas = lista
      .map(normalizarMaquina)
      .filter((item) => item.id && item.nome);

    if (maquinas.length === 0) {
      throw new Error(
        "Não existem máquinas de chamada vinculadas a este computador.",
      );
    }

    return maquinas;
  }

  /* ========================================
     Armazenamento local
  ========================================= */

  function salvarComputador(computador) {
    try {
      localStorage.setItem(
        CONFIG.armazenamento.computador,
        JSON.stringify({
          id: computador.id,
          nome: computador.nome,
        }),
      );

      return true;
    } catch (erro) {
      console.warn(
        "[GRID] Não foi possível salvar o computador localmente:",
        erro,
      );

      return false;
    }
  }

  function recuperarComputador() {
    try {
      const valor = localStorage.getItem(CONFIG.armazenamento.computador);

      if (!valor) {
        return null;
      }

      const computador = JSON.parse(valor);

      if (!computador.id || !computador.nome) {
        return null;
      }

      return {
        id: String(computador.id),
        nome: String(computador.nome),
      };
    } catch (erro) {
      console.error("[GRID] Erro ao recuperar computador:", erro);

      return null;
    }
  }

  /* ========================================
     Controle das telas
  ========================================= */

  function exibirTelaInicial() {
    elementos.telaInicial.hidden = false;

    // O painel principal permanece visível por trás da seleção.
    // Na primeira inicialização, ele já estará oculto.
    fecharConfiguracoes();
  }

  function ocultarTelaInicial() {
    elementos.telaInicial.hidden = true;
    elementos.painelPrincipal.hidden = false;
  }

  /* ========================================
     Painel de configurações
  ========================================= */

  function abrirConfiguracoes() {
    if (!estado.inicializado) {
      return;
    }

    elementos.configuracoesBackdrop.hidden = false;
    elementos.painelConfiguracoes.hidden = false;
  }

  function fecharConfiguracoes() {
    elementos.configuracoesBackdrop.hidden = true;
    elementos.painelConfiguracoes.hidden = true;
  }

  /* ========================================
     Lista de computadores
  ========================================= */

  function preencherComputadores(computadores) {
    elementos.selectComputador.innerHTML = "";

    const opcaoInicial = document.createElement("option");

    opcaoInicial.value = "";
    opcaoInicial.textContent = "Selecione um computador";

    elementos.selectComputador.appendChild(opcaoInicial);

    computadores.forEach((computador) => {
      const opcao = document.createElement("option");

      opcao.value = computador.id;
      opcao.textContent = computador.nome;

      elementos.selectComputador.appendChild(opcao);
    });

    elementos.btnConfirmar.disabled = computadores.length === 0;
  }

  async function carregarListaComputadores() {
    bloquearFormulario(true);

    mostrarMensagem("Carregando computadores disponíveis...", "info");

    try {
      const computadores = await executarComTentativas(carregarComputadores);

      preencherComputadores(computadores);

      limparMensagem();

      return true;
    } catch (erro) {
      console.error("[GRID] Erro ao carregar computadores:", erro);

      mostrarMensagem(
        "Não foi possível carregar os computadores após várias tentativas. Verifique a conexão e tente novamente.",
        "erro",
      );

      return false;
    } finally {
      bloquearFormulario(false);
    }
  }

  /* ========================================
     Eventos para os outros módulos
  ========================================= */

  function notificarPainelPronto() {
    document.dispatchEvent(
      new CustomEvent("grid:painel-pronto", {
        detail: {
          computador: estado.computador,
          maquinas: estado.maquinas,
        },
      }),
    );
  }

  function notificarMaquinasAtualizadas() {
    document.dispatchEvent(
      new CustomEvent("grid:maquinas-atualizadas", {
        detail: {
          computador: estado.computador,
          maquinas: estado.maquinas,
        },
      }),
    );
  }

  /* ========================================
     Inicialização do painel
  ========================================= */

  function ativarPainel(computador, maquinas, salvar = true) {
    // Invalida consultas de atualização iniciadas anteriormente.
    estado.geracao++;

    estado.computador = computador;
    estado.maquinas = maquinas;

    estado.inicializado = true;
    estado.ultimaAtualizacao = Date.now();

    if (salvar) {
      salvarComputador(computador);
    }

    ocultarTelaInicial();
    fecharConfiguracoes();
    limparMensagem();

    notificarPainelPronto();
  }

  async function confirmarComputador() {
    if (estado.carregando) {
      return;
    }

    const id = elementos.selectComputador.value;

    if (!id) {
      mostrarMensagem("Selecione um computador antes de continuar.", "erro");

      return;
    }

    const opcao = elementos.selectComputador.selectedOptions[0];

    if (!opcao) {
      mostrarMensagem("O computador selecionado não é válido.", "erro");

      return;
    }

    const novoComputador = {
      id,
      nome: opcao.textContent,
    };

    estado.carregando = true;

    bloquearFormulario(true);

    mostrarMensagem("Validando computador e carregando máquinas...", "info");

    try {
      // O computador atual não é alterado nesta etapa.
      // Primeiro validamos a relação de máquinas do novo computador.
      const maquinas = await executarComTentativas(() =>
        carregarMaquinas(novoComputador.id),
      );

      // Somente após a validação o novo computador é ativado.
      ativarPainel(novoComputador, maquinas);
    } catch (erro) {
      console.error("[GRID] Erro ao validar computador:", erro);

      mostrarMensagem(
        erro.message || "Não foi possível validar este computador.",
        "erro",
      );

      // O computador anterior permanece ativo.
    } finally {
      estado.carregando = false;
      bloquearFormulario(false);
    }
  }

  /* ========================================
     Atualização periódica das máquinas
  ========================================= */

  async function atualizarMaquinas() {
    if (
      !estado.inicializado ||
      !estado.computador ||
      estado.atualizandoMaquinas
    ) {
      return;
    }

    estado.atualizandoMaquinas = true;

    const geracaoAtual = estado.geracao;
    const computadorId = estado.computador.id;

    try {
      const novasMaquinas = await carregarMaquinas(computadorId);

      // Descarta respostas de uma configuração anterior.
      if (
        !estado.inicializado ||
        estado.geracao !== geracaoAtual ||
        estado.computador?.id !== computadorId
      ) {
        return;
      }

      const atual = JSON.stringify(estado.maquinas);
      const nova = JSON.stringify(novasMaquinas);

      if (atual !== nova) {
        estado.maquinas = novasMaquinas;

        notificarMaquinasAtualizadas();
      }

      estado.ultimaAtualizacao = Date.now();
    } catch (erro) {
      console.error("[GRID] Não foi possível atualizar as máquinas:", erro);

      // Mantém a última relação válida em memória.
    } finally {
      estado.atualizandoMaquinas = false;
    }
  }

  /* ========================================
     Troca de computador
  ========================================= */

  async function trocarComputador() {
    if (estado.carregando) {
      return;
    }

    estado.carregando = true;

    try {
      // Não interrompe o painel atual.
      // Ele continua funcionando enquanto o novo computador
      // é selecionado e validado.
      fecharConfiguracoes();
      exibirTelaInicial();

      elementos.selectComputador.value = "";

      await carregarListaComputadores();
    } finally {
      estado.carregando = false;
      bloquearFormulario(false);
    }
  }

  /* ========================================
     Inicialização automática
  ========================================= */

  async function inicializar() {
    const computadorSalvo = recuperarComputador();

    if (!computadorSalvo) {
      exibirTelaInicial();

      await carregarListaComputadores();

      return;
    }

    mostrarMensagem(
      `Restaurando configuração de ${computadorSalvo.nome}...`,
      "info",
    );

    try {
      const maquinas = await executarComTentativas(() =>
        carregarMaquinas(computadorSalvo.id),
      );

      ativarPainel(computadorSalvo, maquinas, false);
    } catch (erro) {
      console.error("[GRID] Erro ao restaurar painel:", erro);

      exibirTelaInicial();

      mostrarMensagem(
        "Não foi possível restaurar as máquinas do computador salvo. Você pode tentar novamente ou selecionar outro computador.",
        "erro",
      );

      const listaCarregada = await carregarListaComputadores();

      if (!listaCarregada) {
        return;
      }

      // Só seleciona o computador salvo se ele ainda estiver
      // disponível na lista retornada pelo servidor.
      const computadorDisponivel = Array.from(
        elementos.selectComputador.options,
      ).some((opcao) => opcao.value === computadorSalvo.id);

      if (computadorDisponivel) {
        elementos.selectComputador.value = computadorSalvo.id;
      } else {
        elementos.selectComputador.value = "";

        mostrarMensagem(
          "O computador salvo não está mais disponível. Selecione outro computador para continuar.",
          "erro",
        );
      }

      bloquearFormulario(false);
    }
  }

  /* ========================================
     Eventos dos controles
  ========================================= */

  elementos.btnConfirmar.addEventListener("click", confirmarComputador);

  elementos.btnRecarregar.addEventListener("click", carregarListaComputadores);

  elementos.btnAbrirConfiguracoes.addEventListener("click", abrirConfiguracoes);

  elementos.btnFecharConfiguracoes.addEventListener(
    "click",
    fecharConfiguracoes,
  );

  elementos.configuracoesBackdrop.addEventListener(
    "click",
    fecharConfiguracoes,
  );

  elementos.btnTrocarComputador.addEventListener("click", trocarComputador);

  elementos.selectComputador.addEventListener("change", () => {
    elementos.btnConfirmar.disabled =
      estado.carregando || !elementos.selectComputador.value;
  });

  // Fecha as configurações com a tecla Escape.
  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && !elementos.painelConfiguracoes.hidden) {
      fecharConfiguracoes();
    }
  });

  /* ========================================
     Atualizações de conexão e visibilidade
  ========================================= */

  window.addEventListener("online", atualizarMaquinas);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      atualizarMaquinas();
    }
  });

  // Atualiza a relação de máquinas a cada 30 minutos.
  setInterval(atualizarMaquinas, CONFIG.intervaloAtualizacao);

  /* ========================================
     API pública do módulo
  ========================================= */

  window.GridConfiguracaoPainel = Object.freeze({
    obterEstado() {
      return {
        computador: estado.computador,
        maquinas: [...estado.maquinas],
        inicializado: estado.inicializado,
        ultimaAtualizacao: estado.ultimaAtualizacao,
      };
    },

    atualizarMaquinas,

    trocarComputador,

    abrirConfiguracoes,

    fecharConfiguracoes,

    eventos: {
      painelPronto: "grid:painel-pronto",
      maquinasAtualizadas: "grid:maquinas-atualizadas",
    },
  });

  inicializar();
})();
