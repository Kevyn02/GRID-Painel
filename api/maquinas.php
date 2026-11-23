<?php

declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

try {

  grid_validar_metodo('GET');

  $computadorId = grid_validar_id(
    $_GET['computador'] ?? null
  );

  $pdo = grid_conexao();

  /*
  |--------------------------------------------------------------------------
  | Validar computador
  |--------------------------------------------------------------------------
  */

  $sqlComputador = "
        SELECT
            NR_SEQUENCIA
        FROM
            COMPUTADOR
        WHERE
            NR_SEQUENCIA = :computador
            AND CD_ESTABELECIMENTO = :estabelecimento
            AND IE_TIPO = 'M'
            AND IE_SITUACAO = 'A'
    ";

  $stmtComputador = $pdo->prepare($sqlComputador);

  $stmtComputador->bindValue(
    ':computador',
    $computadorId,
    PDO::PARAM_INT
  );

  $stmtComputador->bindValue(
    ':estabelecimento',
    GRID_ESTABELECIMENTO,
    PDO::PARAM_INT
  );

  $stmtComputador->execute();

  if (!$stmtComputador->fetch()) {

    grid_responder([
      'sucesso' => false,
      'mensagem' => 'Computador não encontrado ou inativo.',
    ], 404);
  }

  /*
  |--------------------------------------------------------------------------
  | Buscar máquinas vinculadas
  |--------------------------------------------------------------------------
  */

  $sqlMaquinas = "
        SELECT
            A.NR_SEQUENCIA AS NR_SEQ_MAQUINA_LOCAL_SENHA,
            A.DS_LOCAL,
            A.DS_LOCAL_CURTO,
            A.NR_SEQ_COMPUTADOR,

            COALESCE(
                B.NR_SEQ_COMP_MONITOR,
                A.NR_SEQ_COMP_MONITOR
            ) AS NR_SEQ_COMP_MONITOR

        FROM
            MAQUINA_LOCAL_SENHA A

        LEFT JOIN
            MAQUINA_MONITOR_ADICIONAL B
                ON B.NR_SEQ_LOCAL = A.NR_SEQUENCIA

        WHERE
            A.CD_ESTABELECIMENTO = :estabelecimento
            AND A.IE_SITUACAO = 'A'

            AND COALESCE(
                B.NR_SEQ_COMP_MONITOR,
                A.NR_SEQ_COMP_MONITOR
            ) = :computador

        ORDER BY
            A.DS_LOCAL_CURTO
    ";

  $stmtMaquinas = $pdo->prepare($sqlMaquinas);

  $stmtMaquinas->bindValue(
    ':estabelecimento',
    GRID_ESTABELECIMENTO,
    PDO::PARAM_INT
  );

  $stmtMaquinas->bindValue(
    ':computador',
    $computadorId,
    PDO::PARAM_INT
  );

  $stmtMaquinas->execute();

  $maquinas = [];

  while ($row = $stmtMaquinas->fetch()) {

    $maquinas[] = [
      'id' => (int) $row['NR_SEQ_MAQUINA_LOCAL_SENHA'],

      'nome' => trim(
        $row['DS_LOCAL_CURTO']
        ?: $row['DS_LOCAL']
      ),

      'descricao' => trim($row['DS_LOCAL']),

      'computador' => $row['NR_SEQ_COMPUTADOR'] !== null
        ? (int) $row['NR_SEQ_COMPUTADOR']
        : null,

      'monitor' => $row['NR_SEQ_COMP_MONITOR'] !== null
        ? (int) $row['NR_SEQ_COMP_MONITOR']
        : null,
    ];
  }

  grid_responder([
    'sucesso' => true,
    'computador' => $computadorId,
    'total' => count($maquinas),
    'maquinas' => $maquinas,
  ]);

} catch (Throwable $erro) {

  grid_tratar_erro($erro);
}
