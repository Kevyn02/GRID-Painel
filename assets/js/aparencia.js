(() => {
  "use strict";

  const estado = {
    tema: "padrao",
    configuracoes: null,
  };

  const VARIAVEIS = {
    fundo: "--grid-cor-fundo",
    texto: "--grid-cor-texto",
    primaria: "--grid-cor-primaria",
    secundaria: "--grid-cor-secundaria",
    destaque: "--grid-cor-destaque",
    historico: "--grid-cor-historico",
    borda: "--grid-cor-borda",
    fonte: "--grid-fonte-principal",
    tamanhoPaciente: "--grid-tamanho-paciente",
    tamanhoGuiche: "--grid-tamanho-guiche",
    tamanhoHistorico: "--grid-tamanho-historico",
    espacamento: "--grid-espacamento",
    imagemFundo: "--grid-imagem-fundo",
    logo: "--grid-logo",
  };

  function obterAparencia(configuracoes) {
    return configuracoes?.aparencia || configuracoes?.geral?.aparencia || {};
  }

  function validarCor(valor) {
    if (typeof valor !== "string") {
      return null;
    }

    const cor = valor.trim();

    // Aceita somente cores hexadecimais.
    if (!/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(cor)) {
      return null;
    }

    return cor;
  }

  function validarTamanho(valor, minimo, maximo) {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
      return null;
    }

    if (numero < minimo || numero > maximo) {
      return null;
    }

    return `${numero}px`;
  }

  function validarFonte(valor) {
    if (typeof valor !== "string") {
      return null;
    }

    const fonte = valor.trim();

    if (!fonte || fonte.length > 100 || !/^[a-zA-Z0-9\s,'"-]+$/.test(fonte)) {
      return null;
    }

    return fonte;
  }

  function validarCaminhoImagem(valor) {
    if (typeof valor !== "string") {
      return null;
    }

    const caminho = valor.trim();

    if (
      !caminho ||
      caminho.length > 500 ||
      caminho.includes("..") ||
      caminho.includes("\\") ||
      /["'();<>]/.test(caminho) ||
      !/^assets\/imagens\/[a-zA-Z0-9/_\-.]+$/.test(caminho)
    ) {
      return null;
    }

    return caminho;
  }

  function definirVariavel(nome, valor) {
    if (valor === null || valor === undefined) {
      return;
    }

    document.documentElement.style.setProperty(nome, valor);
  }

  function removerVariavel(nome) {
    document.documentElement.style.removeProperty(nome);
  }

  function aplicarTema(tema) {
    const nome = String(tema || "padrao")
      .trim()
      .toLowerCase();

    const temaValido = /^[a-z0-9_-]+$/.test(nome) ? nome : "padrao";

    document.body.classList.forEach((classe) => {
      if (classe.startsWith("tema-")) {
        document.body.classList.remove(classe);
      }
    });

    document.body.classList.add(`tema-${temaValido}`);

    estado.tema = temaValido;
  }

  function aplicarCores(aparencia) {
    const cores = aparencia.cores || {};

    const mapeamento = {
      fundo: VARIAVEIS.fundo,
      texto: VARIAVEIS.texto,
      primaria: VARIAVEIS.primaria,
      secundaria: VARIAVEIS.secundaria,
      destaque: VARIAVEIS.destaque,
      historico: VARIAVEIS.historico,
      borda: VARIAVEIS.borda,
    };

    Object.entries(mapeamento).forEach(([chave, variavel]) => {
      const cor = validarCor(cores[chave]);

      if (cor) {
        definirVariavel(variavel, cor);
      }
    });
  }

  function aplicarFontes(aparencia) {
    const fontes = aparencia.fontes || {};

    const fonte = validarFonte(fontes.familia);

    if (fonte) {
      definirVariavel(VARIAVEIS.fonte, fonte);
    }

    const tamanhos = [
      {
        campo: "paciente",
        variavel: VARIAVEIS.tamanhoPaciente,
        minimo: 12,
        maximo: 200,
      },
      {
        campo: "guiche",
        variavel: VARIAVEIS.tamanhoGuiche,
        minimo: 12,
        maximo: 120,
      },
      {
        campo: "historico",
        variavel: VARIAVEIS.tamanhoHistorico,
        minimo: 10,
        maximo: 80,
      },
    ];

    tamanhos.forEach((item) => {
      const tamanho = validarTamanho(
        fontes[item.campo],
        item.minimo,
        item.maximo,
      );

      if (tamanho) {
        definirVariavel(item.variavel, tamanho);
      }
    });
  }

  function aplicarEspacamentos(aparencia) {
    const espacamento = validarTamanho(aparencia.espacamento, 0, 100);

    if (espacamento) {
      definirVariavel(VARIAVEIS.espacamento, espacamento);
    }
  }

  function aplicarImagens(aparencia) {
    const imagens = aparencia.imagens || {};

    const fundo = validarCaminhoImagem(imagens.fundo);
    const logo = validarCaminhoImagem(imagens.logo);

    if (fundo) {
      definirVariavel(VARIAVEIS.imagemFundo, `url("${fundo}")`);
    } else {
      removerVariavel(VARIAVEIS.imagemFundo);
    }

    if (logo) {
      definirVariavel(VARIAVEIS.logo, `url("${logo}")`);
    } else {
      removerVariavel(VARIAVEIS.logo);
    }
  }

  function aplicar(configuracoes) {
    if (!configuracoes || typeof configuracoes !== "object") {
      return false;
    }

    estado.configuracoes = configuracoes;

    aplicarTema(configuracoes.tema);

    const aparencia = obterAparencia(configuracoes);

    aplicarCores(aparencia);
    aplicarFontes(aparencia);
    aplicarEspacamentos(aparencia);
    aplicarImagens(aparencia);

    document.dispatchEvent(
      new CustomEvent("grid:aparencia-aplicada", {
        detail: {
          tema: estado.tema,
          configuracoes,
        },
      }),
    );

    return true;
  }

  document.addEventListener("grid:configuracoes-carregadas", (evento) => {
    aplicar(evento.detail?.configuracoes);
  });

  document.addEventListener("grid:configuracoes-atualizadas", (evento) => {
    aplicar(evento.detail?.configuracoes);
  });

  document.addEventListener("grid:configuracoes-preview", (evento) => {
    aplicar(evento.detail?.configuracoes);
  });

  window.GridAparencia = {
    aplicar,

    obterEstado() {
      return {
        tema: estado.tema,
        configuracoes: estado.configuracoes,
      };
    },
  };
})();
