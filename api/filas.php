<?php

require_once __DIR__ . '/_bootstrap.php';

function grid_filias_responder(int $status, array $dados): never
{
  http_response_code($status);

  header('Content-Type: application/json; charset=utf-8');

  echo json_encode(
    $dados,
    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
  );

  exit;
}

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

  grid_filias_responder(200, [
    'sucesso' => true,
    'filas' => $filas
  ]);

} catch (Throwable $e) {
  error_log('[GRID] Erro ao consultar filas: ' . $e->getMessage());

  grid_filias_responder(500, [
    'sucesso' => false,
    'mensagem' => 'Não foi possível carregar as filas.'
  ]);
}
