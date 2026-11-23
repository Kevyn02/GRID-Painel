<?php

declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

try {

  grid_validar_metodo('GET');

  $pdo = grid_conexao();

  $sql = "
        SELECT
            NR_SEQUENCIA,
            NM_COMPUTADOR
        FROM
            COMPUTADOR
        WHERE
            CD_ESTABELECIMENTO = :estabelecimento
            AND IE_TIPO = 'M'
            AND IE_SITUACAO = 'A'
        ORDER BY
            NM_COMPUTADOR
    ";

  $stmt = $pdo->prepare($sql);

  $stmt->bindValue(
    ':estabelecimento',
    GRID_ESTABELECIMENTO,
    PDO::PARAM_INT
  );

  $stmt->execute();

  $computadores = [];

  while ($row = $stmt->fetch()) {

    $computadores[] = [
      'id' => (int) $row['NR_SEQUENCIA'],
      'nome' => trim($row['NM_COMPUTADOR']),
    ];
  }

  grid_responder([
    'sucesso' => true,
    'computadores' => $computadores,
  ]);

} catch (Throwable $erro) {

  grid_tratar_erro($erro);
}
