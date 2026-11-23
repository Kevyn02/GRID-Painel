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

            <span class="chamada__rotulo">
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

        <h2 class="historico__titulo">
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

      <div class="configuracoes__conteudo">

        <!-- Situação da conexão -->

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

        <!-- Configuração do computador -->

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

      </div>
    </aside>

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
