<?php

declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

date_default_timezone_set('America/Sao_Paulo');

/**
 * Valida um identificador numérico positivo.
 */
function grid_chamada_validar_id(mixed $valor): int
{
  $id = filter_var($valor, FILTER_VALIDATE_INT);

  if ($id === false || $id <= 0) {
    throw new InvalidArgumentException(
      'Identificador inválido.'
    );
  }

  return $id;
}

/**
 * Obtém os identificadores das máquinas enviados pelo JavaScript.
 *
 * Aceita:
 * maquinas[]=805&maquinas[]=796
 *
 * Ou:
 * maquinas=805,796
 */
function grid_chamada_obter_maquinas(): array
{
  $valores = $_GET['maquinas'] ?? [];

  if (is_string($valores)) {
    $valores = explode(',', $valores);
  }

  if (!is_array($valores)) {
    throw new InvalidArgumentException(
      'Lista de máquinas inválida.'
    );
  }

  if (count($valores) > 100) {
    throw new InvalidArgumentException(
      'Quantidade de máquinas excede o limite permitido.'
    );
  }

  $maquinas = [];

  foreach ($valores as $valor) {
    $id = grid_chamada_validar_id($valor);

    $maquinas[] = $id;
  }

  return array_values(array_unique($maquinas));
}

/**
 * Carrega a configuração salva do computador.
 */
function grid_chamada_carregar_configuracao(int $computador): array
{
  $caminho = GRID_PAINEIS . '/' . $computador . '.json';

  if (!is_file($caminho)) {
    return [
      'geral' => [
        'filas' => []
      ],
      'historico' => [
        'quantidade' => 4
      ]
    ];
  }

  $conteudo = file_get_contents($caminho);

  if ($conteudo === false) {
    throw new RuntimeException(
      'Não foi possível carregar a configuração.'
    );
  }

  $config = json_decode($conteudo, true);

  if (!is_array($config)) {
    throw new RuntimeException(
      'Arquivo de configuração inválido.'
    );
  }

  return $config;
}

/**
 * Obtém e valida as filas selecionadas.
 */
function grid_chamada_obter_filas(array $config): array
{
  $filas = $config['geral']['filas'] ?? [];

  if (!is_array($filas)) {
    throw new RuntimeException(
      'Configuração de filas inválida.'
    );
  }

  $resultado = [];

  foreach ($filas as $fila) {
    $resultado[] = grid_chamada_validar_id($fila);
  }

  return array_values(array_unique($resultado));
}

/**
 * Obtém a quantidade de chamadas anteriores.
 */
function grid_chamada_obter_quantidade_historico(array $config): int
{
  $quantidade = filter_var(
    $config['historico']['quantidade'] ?? 4,
    FILTER_VALIDATE_INT
  );

  if (
    $quantidade === false ||
    $quantidade < 2 ||
    $quantidade > 5
  ) {
    throw new RuntimeException(
      'Quantidade de chamadas do histórico inválida.'
    );
  }

  return $quantidade;
}

/**
 * Cria os parâmetros dinâmicos para uma cláusula IN.
 */
function grid_chamada_criar_in(
  string $prefixo,
  array $valores,
  array &$parametros
): string {
  $placeholders = [];

  foreach ($valores as $indice => $valor) {
    $nome = ':' . $prefixo . '_' . $indice;

    $placeholders[] = $nome;

    $parametros[$nome] = $valor;
  }

  return implode(', ', $placeholders);
}

/**
 * Executa uma consulta utilizando parâmetros vinculados.
 */
function grid_chamada_executar(
  PDO $pdo,
  string $sql,
  array $parametros
): PDOStatement {
  $stmt = $pdo->prepare($sql);

  foreach ($parametros as $nome => $valor) {
    $stmt->bindValue(
      $nome,
      $valor,
      PDO::PARAM_INT
    );
  }

  $stmt->execute();

  return $stmt;
}

try {

  grid_validar_metodo('GET');

  /*
   * ============================================================
   * 1. IDENTIFICAÇÃO DO COMPUTADOR
   * ============================================================
   */

  $computador = grid_chamada_validar_id(
    $_GET['computador'] ?? null
  );

  /*
   * ============================================================
   * 2. MÁQUINAS E CONFIGURAÇÕES
   * ============================================================
   *
   * As máquinas são recebidas da relação já carregada
   * pelo JavaScript.
   *
   * As filas são obtidas do JSON salvo no servidor.
   */

  $maquinas = grid_chamada_obter_maquinas();

  $config = grid_chamada_carregar_configuracao(
    $computador
  );

  $filas = grid_chamada_obter_filas($config);

  $quantidadeHistorico =
    grid_chamada_obter_quantidade_historico($config);

  /*
   * ============================================================
   * 3. TRATAMENTO DE CONFIGURAÇÃO VAZIA
   * ============================================================
   *
   * Não consulta chamadas se não houver filas ou máquinas
   * selecionadas/disponíveis.
   */

  if (empty($filas) || empty($maquinas)) {
    grid_responder([
      'sucesso' => true,
      'servidor' => date('Y-m-d H:i:s'),
      'chamada_atual' => null,
      'ultimas' => []
    ]);
  }

  /*
   * ============================================================
   * 4. CONEXÃO COM O TASY
   * ============================================================
   */

  $pdo = grid_conexao();

  if (!$pdo instanceof PDO) {
    throw new RuntimeException(
      'Conexão com o TASY não disponível.'
    );
  }

  /*
   * ============================================================
   * 5. CHAMADA ATUAL
   * ============================================================
   *
   * Utiliza NR_SEQ_FILA_SENHA.
   *
   * As filas e máquinas são dinâmicas.
   */

  $parametrosAtual = [];

  $inFilasAtual = grid_chamada_criar_in(
    'fila_atual',
    $filas,
    $parametrosAtual
  );

  $inMaquinasAtual = grid_chamada_criar_in(
    'maquina_atual',
    $maquinas,
    $parametrosAtual
  );

  $parametrosAtual[':estabelecimento'] =
    GRID_ESTABELECIMENTO;

  $sqlAtual = "
        SELECT
            A.NR_SEQUENCIA,
            A.NR_SEQ_FILA_SENHA,

            A.CD_SENHA_GERADA,

            UPPER(
                DECODE(
                    C.NM_PESSOA_FISICA,
                    NULL,
                    A.NM_PACIENTE,
                    C.NM_PESSOA_FISICA
                )
            ) AS NM_PACIENTE,

            A.NR_SEQ_LOCAL_SENHA,

            B.DS_LOCAL_CURTO AS DS_MAQUINA_CHAMADA,

            A.DT_PRIMEIRA_CHAMADA,
            A.DT_NOVA_CHAMADA,
            A.DT_CHAMADA,

            A.QT_CHAMADAS,
            A.IE_RECHAMADA,

            A.DT_CHAMADA AS DT_EVENTO,

            TO_CHAR(
                A.DT_CHAMADA,
                'YYYY-MM-DD HH24:MI:SS'
            ) AS DT_EVENTO_STR,

            TO_CHAR(
                A.DT_PRIMEIRA_CHAMADA,
                'YYYY-MM-DD HH24:MI:SS'
            ) AS DT_PRIMEIRA_STR,

            TO_CHAR(
                A.DT_CHAMADA,
                'YYYY-MM-DD HH24:MI:SS'
            ) AS DT_CHAMADA_STR

        FROM PACIENTE_SENHA_FILA A

        INNER JOIN MAQUINA_LOCAL_SENHA B
            ON A.NR_SEQ_LOCAL_SENHA = B.NR_SEQUENCIA

        LEFT JOIN PESSOA_FISICA C
            ON C.CD_PESSOA_FISICA = A.CD_PESSOA_FISICA

        WHERE
            A.CD_ESTABELECIMENTO = :estabelecimento

            AND A.NR_SEQ_FILA_SENHA IN ($inFilasAtual)

            AND B.NR_SEQUENCIA IN ($inMaquinasAtual)

            AND A.DT_CHAMADA IS NOT NULL

            AND TRUNC(A.DT_GERACAO_SENHA) = TRUNC(SYSDATE)

        ORDER BY
            A.DT_CHAMADA DESC,
            A.NR_SEQUENCIA DESC

        FETCH FIRST 1 ROWS ONLY
    ";

  $stmtAtual = grid_chamada_executar(
    $pdo,
    $sqlAtual,
    $parametrosAtual
  );

  $chamadaAtual = $stmtAtual->fetch(PDO::FETCH_ASSOC);

  if (!$chamadaAtual) {
    $chamadaAtual = null;
  }

  /*
   * ============================================================
   * 6. HISTÓRICO
   * ============================================================
   *
   * Utiliza NR_SEQ_FILA_SENHA_ORIGEM.
   *
   * Busca uma chamada adicional para compensar a remoção
   * da chamada atual.
   */

  $parametrosHistorico = [];

  $inFilasHistorico = grid_chamada_criar_in(
    'fila_historico',
    $filas,
    $parametrosHistorico
  );

  $inMaquinasHistorico = grid_chamada_criar_in(
    'maquina_historico',
    $maquinas,
    $parametrosHistorico
  );

  $parametrosHistorico[':estabelecimento'] =
    GRID_ESTABELECIMENTO;

  $limiteBusca = $quantidadeHistorico + 1;

  $sqlHistorico = "
        SELECT
            A.NR_SEQUENCIA,

            A.NR_SEQ_FILA_SENHA,

            A.NR_SEQ_FILA_SENHA_ORIGEM,

            A.CD_SENHA_GERADA,

            UPPER(
                DECODE(
                    C.NM_PESSOA_FISICA,
                    NULL,
                    A.NM_PACIENTE,
                    C.NM_PESSOA_FISICA
                )
            ) AS NM_PACIENTE,

            A.NR_SEQ_LOCAL_SENHA,

            B.DS_LOCAL_CURTO AS DS_MAQUINA_CHAMADA,

            A.DT_PRIMEIRA_CHAMADA,

            A.DT_NOVA_CHAMADA,

            A.DT_CHAMADA,

            A.QT_CHAMADAS,

            A.IE_RECHAMADA,

            NVL(
                A.DT_CHAMADA,
                A.DT_PRIMEIRA_CHAMADA
            ) AS DT_EVENTO,

            TO_CHAR(
                NVL(
                    A.DT_CHAMADA,
                    A.DT_PRIMEIRA_CHAMADA
                ),
                'YYYY-MM-DD HH24:MI:SS'
            ) AS DT_EVENTO_STR,

            TO_CHAR(
                A.DT_PRIMEIRA_CHAMADA,
                'YYYY-MM-DD HH24:MI:SS'
            ) AS DT_PRIMEIRA_STR,

            TO_CHAR(
                A.DT_CHAMADA,
                'YYYY-MM-DD HH24:MI:SS'
            ) AS DT_CHAMADA_STR

        FROM PACIENTE_SENHA_FILA A

        INNER JOIN MAQUINA_LOCAL_SENHA B
            ON A.NR_SEQ_LOCAL_SENHA = B.NR_SEQUENCIA

        LEFT JOIN PESSOA_FISICA C
            ON C.CD_PESSOA_FISICA = A.CD_PESSOA_FISICA

        WHERE
            A.CD_ESTABELECIMENTO = :estabelecimento

            AND A.NR_SEQ_FILA_SENHA_ORIGEM IN ($inFilasHistorico)

            AND A.DT_CHAMADA IS NOT NULL

            AND TRUNC(A.DT_GERACAO_SENHA) = TRUNC(SYSDATE)

            AND TRUNC(A.DT_CHAMADA) = TRUNC(SYSDATE)

            AND B.NR_SEQUENCIA IN ($inMaquinasHistorico)

        ORDER BY
            A.DT_CHAMADA DESC,
            A.NR_SEQUENCIA DESC

        FETCH FIRST {$limiteBusca} ROWS ONLY
    ";

  $stmtHistorico = grid_chamada_executar(
    $pdo,
    $sqlHistorico,
    $parametrosHistorico
  );

  $historicoBanco = $stmtHistorico->fetchAll(
    PDO::FETCH_ASSOC
  );

  /*
   * ============================================================
   * 7. REMOVE A CHAMADA ATUAL DO HISTÓRICO
   * ============================================================
   */

  $ultimas = [];

  foreach ($historicoBanco as $row) {

    if (
      $chamadaAtual
      &&
      isset($chamadaAtual['NR_SEQUENCIA'])
      &&
      isset($row['NR_SEQUENCIA'])
      &&
      $row['NR_SEQUENCIA'] ==
      $chamadaAtual['NR_SEQUENCIA']
      &&
      ($row['DT_CHAMADA_STR'] ?? '') ==
      ($chamadaAtual['DT_CHAMADA_STR'] ?? '')
    ) {
      continue;
    }

    $ultimas[] = $row;

    if (count($ultimas) >= $quantidadeHistorico) {
      break;
    }
  }

  /*
   * ============================================================
   * 8. NORMALIZA A CHAMADA ATUAL
   * ============================================================
   */

  if ($chamadaAtual) {

    $chamadaAtual['id_evento'] =
      ($chamadaAtual['NR_SEQUENCIA'] ?? '')
      . '|'
      . ($chamadaAtual['DT_CHAMADA_STR'] ?? '');

    $chamadaAtual['paciente'] =
      $chamadaAtual['NM_PACIENTE'] ?? '';

    $chamadaAtual['guiche'] =
      $chamadaAtual['DS_MAQUINA_CHAMADA'] ?? '';

    $chamadaAtual['data_evento'] =
      $chamadaAtual['DT_EVENTO_STR'] ?? '';
  }

  /*
   * ============================================================
   * 9. NORMALIZA O HISTÓRICO
   * ============================================================
   */

  foreach ($ultimas as &$row) {

    $row['id_evento'] =
      ($row['NR_SEQUENCIA'] ?? '')
      . '|'
      . ($row['DT_CHAMADA_STR'] ?? '');

    $row['paciente'] =
      $row['NM_PACIENTE'] ?? '';

    $row['guiche'] =
      $row['DS_MAQUINA_CHAMADA'] ?? '';

    $row['data_evento'] =
      $row['DT_EVENTO_STR'] ?? '';
  }

  unset($row);

  /*
   * ============================================================
   * 10. RETORNO
   * ============================================================
   */

  grid_responder([
    'sucesso' => true,

    'servidor' => date('Y-m-d H:i:s'),

    'chamada_atual' => $chamadaAtual,

    'ultimas' => $ultimas
  ]);

} catch (InvalidArgumentException $e) {

  grid_responder([
    'sucesso' => false,
    'mensagem' => $e->getMessage(),
    'chamada_atual' => null,
    'ultimas' => []
  ], 400);

} catch (Throwable $e) {

  error_log(
    '[GRID] Erro ao consultar chamadas: ' . $e->getMessage()
  );

  grid_responder([
    'sucesso' => false,
    'mensagem' => 'Não foi possível consultar as chamadas.',
    'chamada_atual' => null,
    'ultimas' => []
  ], 500);
}
