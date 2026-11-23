<?php

declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

try {
  grid_validar_metodo('GET');

  $pdo = grid_conexao();

  if (!$pdo instanceof PDO) {
    throw new RuntimeException('Conexão com o TASY não disponível.');
  }

  $sql = "
        SELECT
            a.nr_sequencia AS nr_seq_fila_espera,
            a.ds_fila,
            a.ds_curto
        FROM
            fila_espera_senha a
        WHERE
            a.cd_estabelecimento = :cd_estabelecimento
            AND a.ie_situacao = 'A'
        ORDER BY
            a.ds_fila
    ";

  $stmt = $pdo->prepare($sql);

  $stmt->bindValue(
    ':cd_estabelecimento',
    GRID_ESTABELECIMENTO,
    PDO::PARAM_INT
  );

  $stmt->execute();

  $filas = $stmt->fetchAll(PDO::FETCH_ASSOC);

  $filas = array_map(
    static function (array $fila): array {
      return [
        'id' => (int) $fila['NR_SEQ_FILA_ESPERA'],
        'nome' => $fila['DS_FILA'],
        'nome_curto' => $fila['DS_CURTO']
      ];
    },
    $filas
  );

  grid_responder([
    'sucesso' => true,
    'filas' => $filas
  ]);

} catch (Throwable $e) {
  error_log('[GRID] Erro ao consultar filas: ' . $e->getMessage());

  grid_responder([
    'sucesso' => false,
    'mensagem' => 'Não foi possível carregar as filas.'
  ], 500);
}