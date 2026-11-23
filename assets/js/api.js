(function (window) {
  "use strict";

  const API_BASE = "api/";

  /**
   * Erro padronizado das requisições.
   */
  class GridApiError extends Error {
    constructor(message, status = 0, resposta = null) {
      super(message);

      this.name = "GridApiError";
      this.status = status;
      this.resposta = resposta;
    }
  }

  /**
   * Executa uma requisição HTTP e interpreta a resposta JSON.
   */
  async function requisicao(endpoint, opcoes = {}) {
    const configuracao = {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(opcoes.headers || {}),
      },
      cache: "no-store",
      ...opcoes,
    };

    try {
      const resposta = await fetch(API_BASE + endpoint, configuracao);

      let dados;

      try {
        dados = await resposta.json();
      } catch {
        throw new GridApiError(
          "O servidor retornou uma resposta inválida.",
          resposta.status,
        );
      }

      if (!resposta.ok || dados?.sucesso === false) {
        throw new GridApiError(
          dados?.mensagem || "Não foi possível concluir a requisição.",
          resposta.status,
          dados,
        );
      }

      return dados;
    } catch (erro) {
      // Mantém o erro de cancelamento identificável.
      if (erro.name === "AbortError") {
        throw erro;
      }

      if (erro instanceof GridApiError) {
        throw erro;
      }

      throw new GridApiError(
        "Não foi possível estabelecer comunicação com o servidor.",
        0,
        null,
      );
    }
  }

  /**
   * Monta parâmetros de consulta.
   */
  function criarParametros(dados) {
    const parametros = new URLSearchParams();

    Object.entries(dados).forEach(([chave, valor]) => {
      if (valor !== undefined && valor !== null) {
        parametros.append(chave, valor);
      }
    });

    return parametros;
  }

  /**
   * Consulta os computadores disponíveis.
   */
  async function obterComputadores() {
    return requisicao("computadores.php");
  }

  /**
   * Consulta as máquinas vinculadas ao computador.
   */
  async function obterMaquinas(computador) {
    const parametros = criarParametros({
      computador,
    });

    return requisicao(`maquinas.php?${parametros.toString()}`);
  }

  /**
   * Consulta as filas ativas disponíveis.
   */
  async function obterFilas() {
    return requisicao("filas.php");
  }

  /**
   * Carrega as configurações de um painel.
   */
  async function obterConfiguracoes(computador, signal = undefined) {
    const parametros = criarParametros({
      computador,
    });

    return requisicao(`configuracoes.php?${parametros.toString()}`, { signal });
  }

  /**
   * Salva as configurações de um painel.
   */
  async function salvarConfiguracoes(computador, configuracoes) {
    return requisicao("configuracoes.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        computador,
        configuracoes,
      }),
    });
  }

  /**
   * Consulta a chamada atual e o histórico.
   *
   * As máquinas devem ser identificadores NR_SEQUENCIA.
   * O signal permite cancelar a requisição em andamento.
   */
  async function obterChamada(computador, maquinas, signal = undefined) {
    if (!Array.isArray(maquinas) || maquinas.length === 0) {
      throw new GridApiError("Nenhuma máquina foi informada para a consulta.");
    }

    const parametros = criarParametros({
      computador,
    });

    maquinas.forEach((maquina) => {
      parametros.append("maquinas[]", maquina);
    });

    return requisicao(`chamada.php?${parametros.toString()}`, { signal });
  }

  window.GridAPI = Object.freeze({
    requisicao,
    obterComputadores,
    obterMaquinas,
    obterFilas,
    obterConfiguracoes,
    salvarConfiguracoes,
    obterChamada,
    GridApiError,
  });
})(window);
