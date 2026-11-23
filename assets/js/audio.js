(function (window) {
  "use strict";

  let audioAtivo = true;
  let contextoAudio = null;
  let execucaoAtual = 0;

  const osciladoresAtivos = new Set();
  const temporizadores = new Map();

  let resolverFalaAtual = null;

  function atualizarStatus(mensagem) {
    window.dispatchEvent(
      new CustomEvent("grid:status", {
        detail: { mensagem },
      }),
    );
  }

  function texto(valor) {
    return String(valor || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function vozPortugues() {
    if (!window.speechSynthesis) {
      return null;
    }

    const vozes = window.speechSynthesis.getVoices();

    return (
      vozes.find((voz) =>
        String(voz.lang || "")
          .toLowerCase()
          .startsWith("pt-br"),
      ) ||
      vozes.find((voz) =>
        String(voz.lang || "")
          .toLowerCase()
          .startsWith("pt"),
      ) ||
      null
    );
  }

  function obterContextoAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;

      if (!AudioContext) {
        return null;
      }

      if (!contextoAudio) {
        contextoAudio = new AudioContext();
      }

      return contextoAudio;
    } catch (erro) {
      console.warn("Não foi possível criar o áudio:", erro);
      return null;
    }
  }

  async function prepararAudio() {
    const ctx = obterContextoAudio();

    if (!ctx) {
      return false;
    }

    try {
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      return ctx.state === "running";
    } catch (erro) {
      console.warn("O navegador bloqueou o áudio:", erro);
      return false;
    }
  }

  /**
   * Espera cancelável.
   */
  function aguardar(ms, execucao) {
    return new Promise((resolve) => {
      if (execucao !== execucaoAtual) {
        resolve(false);
        return;
      }

      const id = setTimeout(() => {
        temporizadores.delete(id);

        resolve(execucao === execucaoAtual);
      }, ms);

      temporizadores.set(id, resolve);
    });
  }

  /**
   * Reproduz um bip.
   */
  function bip(ctx, frequencia, inicio, duracao) {
    const oscilador = ctx.createOscillator();
    const ganho = ctx.createGain();

    oscilador.type = "sine";

    oscilador.frequency.setValueAtTime(frequencia, inicio);

    ganho.gain.setValueAtTime(0.0001, inicio);

    ganho.gain.exponentialRampToValueAtTime(0.35, inicio + 0.025);

    ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao);

    oscilador.connect(ganho);
    ganho.connect(ctx.destination);

    osciladoresAtivos.add(oscilador);

    oscilador.addEventListener(
      "ended",
      () => {
        osciladoresAtivos.delete(oscilador);

        oscilador.disconnect();
        ganho.disconnect();
      },
      { once: true },
    );

    oscilador.start(inicio);
    oscilador.stop(inicio + duracao + 0.03);
  }

  /**
   * Reproduz os dois bipes.
   */
  async function sinalSonoro() {
    const execucao = execucaoAtual;
    const ctx = obterContextoAudio();

    if (!ctx || !audioAtivo) {
      return false;
    }

    try {
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      if (execucao !== execucaoAtual || ctx.state !== "running") {
        return false;
      }

      const agora = ctx.currentTime + 0.05;

      bip(ctx, 880, agora, 0.22);
      bip(ctx, 660, agora + 0.3, 0.22);

      return await aguardar(650, execucao);
    } catch (erro) {
      console.warn("Erro no sinal sonoro:", erro);
      return false;
    }
  }

  /**
   * Pronuncia o paciente.
   */
  async function falar(chamada) {
    const execucao = execucaoAtual;

    if (!audioAtivo || !window.speechSynthesis) {
      return false;
    }

    const paciente = texto(chamada.paciente);
    const guiche = texto(chamada.guiche);

    if (!paciente || !guiche) {
      return false;
    }

    try {
      const synth = window.speechSynthesis;

      synth.resume();

      let voz = vozPortugues();

      if (!voz) {
        const aguardou = await aguardar(150, execucao);

        if (!aguardou) {
          return false;
        }

        voz = vozPortugues();
      }

      if (execucao !== execucaoAtual) {
        return false;
      }

      const frase = `${paciente}, dirigir-se ao Guichê ${guiche}.`;

      const fala = new SpeechSynthesisUtterance(frase);

      fala.lang = "pt-BR";
      fala.rate = 0.88;
      fala.pitch = 1;
      fala.volume = 1;

      if (voz) {
        fala.voice = voz;
      }

      return await new Promise((resolve) => {
        let finalizada = false;

        function finalizar(resultado) {
          if (finalizada) {
            return;
          }

          finalizada = true;

          if (resolverFalaAtual === finalizar) {
            resolverFalaAtual = null;
          }

          resolve(resultado);
        }

        resolverFalaAtual = finalizar;

        fala.onstart = () => {
          if (execucao === execucaoAtual) {
            atualizarStatus("Chamando paciente...");
          }
        };

        fala.onend = () => {
          if (execucao !== execucaoAtual) {
            finalizar(false);
            return;
          }

          atualizarStatus("Chamada finalizada.");
          finalizar(true);
        };

        fala.onerror = (erro) => {
          if (execucao !== execucaoAtual) {
            finalizar(false);
            return;
          }

          console.error("Erro na voz:", erro);
          finalizar(false);
        };

        try {
          synth.speak(fala);

          aguardar(100, execucao).then((resultado) => {
            if (!resultado || execucao !== execucaoAtual) {
              return;
            }

            try {
              synth.resume();
            } catch (erro) {
              console.warn("Não foi possível retomar a fala:", erro);
            }
          });
        } catch (erro) {
          console.error("Erro ao iniciar a fala:", erro);
          finalizar(false);
        }
      });
    } catch (erro) {
      console.error("Erro ao falar:", erro);
      return false;
    }
  }

  /**
   * Executa o áudio completo.
   */
  async function executarChamada(chamada) {
    if (!chamada || !audioAtivo) {
      return false;
    }

    const execucao = execucaoAtual;

    const sinalExecutado = await sinalSonoro();

    if (execucao !== execucaoAtual) {
      return false;
    }

    if (!sinalExecutado) {
      console.warn(
        "Sinal sonoro bloqueado pelo navegador. " +
          "Tentando reproduzir a fala mesmo assim.",
      );
    }

    if (!audioAtivo || execucao !== execucaoAtual) {
      return false;
    }

    return await falar(chamada);
  }

  /**
   * Cancela todas as reproduções e esperas.
   */
  function cancelar() {
    execucaoAtual++;

    // Cancela temporizadores e libera suas Promises.
    temporizadores.forEach((resolver, id) => {
      clearTimeout(id);
      resolver(false);
    });

    temporizadores.clear();

    // Interrompe os bipes.
    osciladoresAtivos.forEach((oscilador) => {
      try {
        oscilador.stop();
      } catch (erro) {
        // O oscilador pode já ter terminado.
      }
    });

    osciladoresAtivos.clear();

    // Interrompe a fala.
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // Libera a Promise da fala em andamento.
    if (resolverFalaAtual) {
      resolverFalaAtual(false);
      resolverFalaAtual = null;
    }

    atualizarStatus("Áudio interrompido.");

    return true;
  }

  function definirAtivo(ativo) {
    audioAtivo = Boolean(ativo);

    if (!audioAtivo) {
      cancelar();
    }

    return audioAtivo;
  }

  function obterEstado() {
    return {
      ativo: audioAtivo,
      contextoDisponivel: contextoAudio !== null,
      estadoContexto: contextoAudio?.state || "indisponivel",
      falaDisponivel: Boolean(window.speechSynthesis),
      vozPortugues: vozPortugues()?.name || null,
      osciladoresAtivos: osciladoresAtivos.size,
      falaEmAndamento: resolverFalaAtual !== null,
    };
  }

  if (window.speechSynthesis) {
    window.speechSynthesis.addEventListener("voiceschanged", vozPortugues);
  }

  window.GridAudio = Object.freeze({
    prepararAudio,
    sinalSonoro,
    falar,
    executarChamada,
    cancelar,
    definirAtivo,
    obterEstado,
  });
})(window);
