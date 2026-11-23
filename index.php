<?php
require_once __DIR__ . '/config.php';
?>

<!DOCTYPE html>
<html lang="pt-BR">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>Painel de Senhas</title>

  <link rel="stylesheet" href="assets/css/variaveis.css">
  <link rel="stylesheet" href="assets/css/base.css">
  <link rel="stylesheet" href="assets/css/index.css">
  <link rel="stylesheet" href="assets/css/layout.css">
  <link rel="stylesheet" href="assets/css/animacoes.css">
  <link rel="stylesheet" href="assets/css/configuracoes.css">
</head>

<body>

  <!-- ========================================
       Configuração inicial
  ========================================= -->

  <div id="telaConfiguracaoInicial" class="tela-configuracao-inicial">
    <div class="tela-configuracao-inicial__fundo"></div>

    <section class="tela-configuracao-inicial__conteudo" aria-labelledby="tituloConfiguracaoInicial">
      <h2 id="tituloConfiguracaoInicial">
        Selecionar computador
      </h2>

      <p>
        Escolha o computador que será utilizado neste painel.
      </p>

      <div id="mensagemConfiguracao" class="mensagem"></div>

      <label for="selectComputador">
        Computador
      </label>

      <select id="selectComputador">
        <option value="">Selecione um computador</option>
      </select>

      <div class="tela-configuracao-inicial__acoes">
        <button id="btnConfirmarComputador" type="button">
          Confirmar
        </button>

        <button id="btnRecarregarComputadores" type="button">
          Recarregar computadores
        </button>
      </div>
    </section>
  </div>

  <!-- ========================================
       Painel principal
  ========================================= -->

  <main class="painel" id="painelPrincipal" hidden>

    <!-- Botão de configurações -->

    <button type="button" class="painel__configuracoes-botao" id="btnAbrirConfiguracoes"
      aria-label="Abrir configurações" title="Configurações">
      <span aria-hidden="true">⚙</span>
    </button>

    <!-- Conteúdo principal -->

    <section class="painel__conteudo">

      <!-- Chamada atual -->

      <section class="chamada" aria-label="Chamada atual">

        <h2 class="chamada__titulo">
          Senha chamada
        </h2>

        <div class="chamada__informacoes">

          <div class="chamada__paciente">

            <span class="chamada__rotulo" id="rotuloPaciente">
              Paciente
            </span>

            <div id="pacienteAtual">
              Aguardando chamada
            </div>

          </div>

          <div class="chamada__guiche">

            <span class="chamada__rotulo">
              Dirija-se ao guichê
            </span>

            <div id="guicheAtual">
              --
            </div>

          </div>

        </div>

      </section>

      <!-- Histórico -->

      <section class="historico" aria-label="Últimas chamadas">

        <h2 class="historico__titulo" id="tituloHistorico">
          Últimas chamadas
        </h2>

        <div id="historicoLista" class="historico__lista">
          <!-- Os registros serão inseridos pelo JavaScript -->
        </div>

      </section>

    </section>

    <!-- ========================================
         Fundo do painel de configurações
    ========================================= -->

    <div class="configuracoes__fundo" id="configuracoesBackdrop" hidden></div>

    <!-- ========================================
         Painel lateral de configurações
    ========================================= -->

    <aside class="configuracoes" id="painelConfiguracoes" aria-label="Configurações do painel" hidden>

      <header class="configuracoes__cabecalho">

        <h2 class="configuracoes__titulo">
          Configurações
        </h2>

        <button type="button" class="configuracoes__fechar" id="btnFecharConfiguracoes"
          aria-label="Fechar configurações">
          &times;
        </button>

      </header>

      <nav class="configuracoes__abas" aria-label="Seções de configuração">
        <button type="button" class="configuracoes__aba configuracoes__aba--ativa" data-aba="geral"
          aria-selected="true">Geral</button>
        <button type="button" class="configuracoes__aba" data-aba="chamada"
          aria-selected="false">Chamada</button>
        <button type="button" class="configuracoes__aba" data-aba="historico"
          aria-selected="false">Histórico</button>
      </nav>

      <div class="configuracoes__conteudo">

        <div data-painel-aba="geral">

          <section class="configuracoes__secao">

            <h3 class="configuracoes__subtitulo">
              Conexão
            </h3>

            <div class="configuracoes__informacao">

              <span>Computador</span>

              <strong id="conexao">
                Aguardando conexão...
              </strong>

            </div>

            <div class="configuracoes__informacao">

              <span>Status</span>

              <strong id="status"></strong>

            </div>

          </section>

          <section class="configuracoes__secao">

            <h3 class="configuracoes__subtitulo">
              Computador
            </h3>

            <p class="configuracoes__descricao">
              Altere o computador utilizado para identificar
              as máquinas de chamada deste painel.
            </p>

            <button type="button" class="configuracoes__botao" id="btnTrocarComputador">
              Trocar computador
            </button>

          </section>

          <section class="configuracoes__secao">

            <h3 class="configuracoes__subtitulo">
              Filas monitoradas
            </h3>

            <p class="configuracoes__descricao">
              Selecione as filas de senha que este painel deve anunciar.
            </p>

            <div id="mensagemFilas" class="mensagem"></div>

            <div id="listaFilas" class="configuracoes__filas"></div>

            <button type="button" class="configuracoes__botao" id="btnSalvarFilas" disabled>
              Salvar filas
            </button>

          </section>

          <section class="configuracoes__secao">

            <h3 class="configuracoes__subtitulo">
              Aparência
            </h3>

            <div class="configuracoes__campo">
              <label for="selectTema">Tema</label>
              <select id="selectTema">
                <option value="padrao">Padrão</option>
                <option value="natal">Natal</option>
                <option value="outubro-rosa">Outubro Rosa</option>
                <option value="novembro-azul">Novembro Azul</option>
              </select>
            </div>

            <div class="configuracoes__campo">
              <label for="tituloPainel">Título do painel</label>
              <input type="text" id="tituloPainel" maxlength="100">
            </div>

            <div class="configuracoes__campo">
              <label for="fonteFamilia">Fonte</label>
              <input type="text" id="fonteFamilia" maxlength="100" placeholder="Arial, sans-serif">
            </div>

            <div class="configuracoes__campo">
              <label for="espacamento">Espaçamento (px)</label>
              <input type="number" id="espacamento" min="0" max="100" step="1">
            </div>

            <div class="configuracoes__campo">
              <label for="corFundo">Cor de fundo</label>
              <div class="configuracoes__cor">
                <input type="color" id="corFundo" value="#ffffff">
                <label class="configuracoes__cor-padrao">
                  <input type="checkbox" id="corFundoPadrao" checked>
                  Padrão do tema
                </label>
              </div>
            </div>

            <div class="configuracoes__campo">
              <label for="corTexto">Cor do texto (paciente)</label>
              <div class="configuracoes__cor">
                <input type="color" id="corTexto" value="#222222">
                <label class="configuracoes__cor-padrao">
                  <input type="checkbox" id="corTextoPadrao" checked>
                  Padrão do tema
                </label>
              </div>
            </div>

            <div class="configuracoes__campo">
              <label for="corPrimaria">Cor do guichê</label>
              <div class="configuracoes__cor">
                <input type="color" id="corPrimaria" value="#005baa">
                <label class="configuracoes__cor-padrao">
                  <input type="checkbox" id="corPrimariaPadrao" checked>
                  Padrão do tema
                </label>
              </div>
            </div>

            <div class="configuracoes__campo">
              <label for="corSecundaria">Cor de fundo do histórico</label>
              <div class="configuracoes__cor">
                <input type="color" id="corSecundaria" value="#eeeeee">
                <label class="configuracoes__cor-padrao">
                  <input type="checkbox" id="corSecundariaPadrao" checked>
                  Padrão do tema
                </label>
              </div>
            </div>

            <div class="configuracoes__campo">
              <label for="corDestaque">Cor de destaque</label>
              <div class="configuracoes__cor">
                <input type="color" id="corDestaque" value="#ffcc00">
                <label class="configuracoes__cor-padrao">
                  <input type="checkbox" id="corDestaquePadrao" checked>
                  Padrão do tema
                </label>
              </div>
            </div>

            <div class="configuracoes__campo">
              <label for="corHistorico">Cor da lista do histórico</label>
              <div class="configuracoes__cor">
                <input type="color" id="corHistorico" value="#f5f5f5">
                <label class="configuracoes__cor-padrao">
                  <input type="checkbox" id="corHistoricoPadrao" checked>
                  Padrão do tema
                </label>
              </div>
            </div>

            <div class="configuracoes__campo">
              <label for="corBorda">Cor das bordas</label>
              <div class="configuracoes__cor">
                <input type="color" id="corBorda" value="#dddddd">
                <label class="configuracoes__cor-padrao">
                  <input type="checkbox" id="corBordaPadrao" checked>
                  Padrão do tema
                </label>
              </div>
            </div>

          </section>

        </div>

        <div data-painel-aba="chamada" hidden>

          <section class="configuracoes__secao">

            <h3 class="configuracoes__subtitulo">
              Chamada atual
            </h3>

            <div class="configuracoes__campo">
              <label for="tituloChamada">Rótulo do paciente</label>
              <input type="text" id="tituloChamada" maxlength="100">
            </div>

            <div class="configuracoes__campo">
              <label for="selectAnimacao">Animação</label>
              <select id="selectAnimacao">
                <option value="zoom">Zoom</option>
                <option value="fade">Fade</option>
                <option value="slide">Deslizar</option>
              </select>
            </div>

            <div class="configuracoes__campo">
              <label for="duracaoChamada">Duração do destaque (segundos)</label>
              <input type="number" id="duracaoChamada" min="3" max="30" step="1">
            </div>

            <div class="configuracoes__campo">
              <label for="tamanhoPaciente">Tamanho do nome (px)</label>
              <input type="number" id="tamanhoPaciente" min="12" max="200" step="1">
            </div>

            <div class="configuracoes__campo">
              <label for="tamanhoGuiche">Tamanho do guichê (px)</label>
              <input type="number" id="tamanhoGuiche" min="12" max="120" step="1">
            </div>

          </section>

        </div>

        <div data-painel-aba="historico" hidden>

          <section class="configuracoes__secao">

            <h3 class="configuracoes__subtitulo">
              Histórico
            </h3>

            <div class="configuracoes__campo">
              <label for="quantidadeHistorico">Quantidade de chamadas</label>
              <input type="number" id="quantidadeHistorico" min="2" max="5" step="1">
            </div>

            <div class="configuracoes__campo">
              <label for="campoTituloHistorico">Título</label>
              <input type="text" id="campoTituloHistorico" maxlength="100">
            </div>

            <div class="configuracoes__campo">
              <label for="tamanhoHistorico">Tamanho do texto (px)</label>
              <input type="number" id="tamanhoHistorico" min="10" max="80" step="1">
            </div>

            <div class="configuracoes__campo configuracoes__campo--checkbox">
              <label>
                <input type="checkbox" id="mostrarHorario" checked>
                Mostrar horário das chamadas
              </label>
            </div>

          </section>

        </div>

      </div>

      <footer class="configuracoes__acoes">

        <div id="mensagemAdmin" class="mensagem"></div>

        <div class="configuracoes__acoes-botoes">
          <button type="button" class="configuracoes__botao configuracoes__botao--secundario"
            id="btnTestarConfiguracoes" disabled>Testar</button>
          <button type="button" class="configuracoes__botao configuracoes__botao--secundario"
            id="btnCancelarConfiguracoes" disabled>Cancelar</button>
          <button type="button" class="configuracoes__botao"
            id="btnConfirmarConfiguracoes" disabled>Confirmar e salvar</button>
        </div>

      </footer>

    </aside>

    <button type="button" class="botao-voltar-configuracoes" id="btnVoltarConfiguracoes" hidden>
      Voltar às configurações
    </button>

  </main>

  <!-- ========================================
       JavaScript
  ========================================= -->

  <script src="assets/js/api.js"></script>
  <script src="assets/js/configuracao-painel.js"></script>
  <script src="assets/js/configuracoes-admin.js"></script>
  <script src="assets/js/chamadas.js"></script>
  <script src="assets/js/fila.js"></script>
  <script src="assets/js/audio.js"></script>
  <script src="assets/js/historico.js"></script>
  <script src="assets/js/aparencia.js"></script>
  <script src="assets/js/interface.js"></script>
  <script src="assets/js/painel.js"></script>
  <script src="assets/js/sincronizacao.js"></script>

</body>

</html>
