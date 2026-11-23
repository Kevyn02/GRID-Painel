<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/config.php';
include '../../../classes/conexao/conexaoTasy.php';


/*
|--------------------------------------------------------------------------
| Conexão com o banco
|--------------------------------------------------------------------------
|
| A conexão será reutilizada de:
| grid/classes/conexao/
|
| A implementação desta função depende da identificação da classe
| e do método existentes nessa pasta.
|
| Não criar uma segunda conexão independente.
|
*/

function grid_conexao(): mixed
{
  global $conectTasy;

  if (!isset($conectTasy) || !$conectTasy) {
    throw new Exception('Conexão com o TASY não disponível.');
  }

  return $conectTasy;
}

/*
|--------------------------------------------------------------------------
| Respostas JSON
|--------------------------------------------------------------------------
*/

function grid_responder(
  array $dados,
  int $status = 200
): never {

  http_response_code($status);

  header('Content-Type: application/json; charset=utf-8');

  header('Cache-Control: no-store');

  echo json_encode(
    $dados,
    JSON_UNESCAPED_UNICODE |
    JSON_UNESCAPED_SLASHES
  );

  exit;
}

/*
|--------------------------------------------------------------------------
| Validação de métodos HTTP
|--------------------------------------------------------------------------
*/

function grid_validar_metodo(string $metodo): void
{
  if ($_SERVER['REQUEST_METHOD'] !== $metodo) {

    grid_responder([
      'sucesso' => false,
      'mensagem' => 'Método não permitido.',
    ], 405);
  }
}

/*
|--------------------------------------------------------------------------
| Leitura do corpo JSON
|--------------------------------------------------------------------------
*/

function grid_receber_json(): array
{
  $conteudo = file_get_contents('php://input');

  $dados = json_decode($conteudo, true);

  if (!is_array($dados)) {

    grid_responder([
      'sucesso' => false,
      'mensagem' => 'Requisição inválida.',
    ], 400);
  }

  return $dados;
}

/*
|--------------------------------------------------------------------------
| Validação de identificadores
|--------------------------------------------------------------------------
*/

function grid_validar_id(mixed $valor): int
{
  $id = filter_var($valor, FILTER_VALIDATE_INT);

  if ($id === false || $id <= 0) {

    grid_responder([
      'sucesso' => false,
      'mensagem' => 'Identificador inválido.',
    ], 400);
  }

  return $id;
}

/*
|--------------------------------------------------------------------------
| Tratamento de exceções
|--------------------------------------------------------------------------
*/

function grid_tratar_erro(Throwable $erro): never
{
  error_log('[GRID Painel] ' . $erro->getMessage());

  grid_responder([
    'sucesso' => false,
    'mensagem' => 'Não foi possível concluir a operação.',
  ], 500);
}
