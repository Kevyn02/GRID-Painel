<?php

require_once __DIR__ . '/_bootstrap.php';

function grid_config_responder(int $status, array $dados): never
{
  http_response_code($status);

  header('Content-Type: application/json; charset=utf-8');

  echo json_encode(
    $dados,
    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
  );

  exit;
}

function grid_config_padrao(): array
{
  return [
    'versao' => 1,
    'tema' => 'padrao',
    'geral' => [
      'computador' => null,
      'filas' => []
    ],
    'chamada' => [],
    'historico' => [
      'quantidade' => 4
    ]
  ];
}

function grid_config_validar_computador(mixed $valor): int
{
  $id = filter_var($valor, FILTER_VALIDATE_INT);

  if ($id === false || $id <= 0) {
    throw new InvalidArgumentException(
      'Identificador do computador inválido.'
    );
  }

  return $id;
}

function grid_config_caminho(int $computador): string
{
  return GRID_PAINEIS . '/' . $computador . '.json';
}

function grid_config_carregar(int $computador): array
{
  $caminho = grid_config_caminho($computador);

  if (!is_file($caminho)) {
    $config = grid_config_padrao();
    $config['geral']['computador'] = $computador;

    return $config;
  }

  $conteudo = file_get_contents($caminho);

  if ($conteudo === false) {
    throw new RuntimeException(
      'Não foi possível ler a configuração do painel.'
    );
  }

  $config = json_decode($conteudo, true);

  if (!is_array($config)) {
    throw new RuntimeException(
      'O arquivo de configuração está inválido.'
    );
  }

  return array_replace_recursive(
    grid_config_padrao(),
    $config
  );
}

function grid_config_validar(array $config, int $computador): array
{
  if (
    !isset($config['geral']) ||
    !is_array($config['geral'])
  ) {
    throw new InvalidArgumentException(
      'Configuração geral inválida.'
    );
  }

  $filas = $config['geral']['filas'] ?? [];

  if (!is_array($filas)) {
    throw new InvalidArgumentException(
      'A lista de filas é inválida.'
    );
  }

  $filasValidadas = [];

  foreach ($filas as $fila) {
    $id = filter_var($fila, FILTER_VALIDATE_INT);

    if ($id === false || $id <= 0) {
      throw new InvalidArgumentException(
        'Foi encontrado um identificador de fila inválido.'
      );
    }

    $filasValidadas[] = $id;
  }

  $filasValidadas = array_values(
    array_unique($filasValidadas)
  );

  $historico = $config['historico'] ?? [];

  if (!is_array($historico)) {
    throw new InvalidArgumentException(
      'Configuração do histórico inválida.'
    );
  }

  $quantidade = filter_var(
    $historico['quantidade'] ?? 4,
    FILTER_VALIDATE_INT
  );

  if (
    $quantidade === false ||
    $quantidade < 2 ||
    $quantidade > 5
  ) {
    throw new InvalidArgumentException(
      'A quantidade do histórico deve estar entre 2 e 5.'
    );
  }

  $config['geral']['computador'] = $computador;
  $config['geral']['filas'] = $filasValidadas;
  $config['historico']['quantidade'] = $quantidade;

  return $config;
}

function grid_config_salvar(int $computador, array $config): void
{
  if (!is_dir(GRID_PAINEIS)) {
    if (!mkdir(GRID_PAINEIS, 0775, true) && !is_dir(GRID_PAINEIS)) {
      throw new RuntimeException(
        'Não foi possível criar o diretório de configurações.'
      );
    }
  }

  if (!is_writable(GRID_PAINEIS)) {
    throw new RuntimeException(
      'O diretório de configurações não permite gravação.'
    );
  }

  $caminho = grid_config_caminho($computador);

  if (is_file($caminho)) {
    if (!is_dir(GRID_BACKUPS)) {
      mkdir(GRID_BACKUPS, 0775, true);
    }

    $backup = GRID_BACKUPS
      . '/'
      . $computador
      . '_'
      . date('Ymd_His')
      . '.json';

    if (!copy($caminho, $backup)) {
      throw new RuntimeException(
        'Não foi possível criar o backup da configuração.'
      );
    }
  }

  $config['versao'] = ((int) ($config['versao'] ?? 0)) + 1;

  $json = json_encode(
    $config,
    JSON_PRETTY_PRINT |
    JSON_UNESCAPED_UNICODE |
    JSON_UNESCAPED_SLASHES
  );

  if ($json === false) {
    throw new RuntimeException(
      'Não foi possível gerar o arquivo JSON.'
    );
  }

  $temporario = tempnam(GRID_PAINEIS, 'grid_');

  if ($temporario === false) {
    throw new RuntimeException(
      'Não foi possível criar o arquivo temporário.'
    );
  }

  try {
    if (file_put_contents($temporario, $json, LOCK_EX) === false) {
      throw new RuntimeException(
        'Não foi possível gravar a configuração.'
      );
    }

    if (!rename($temporario, $caminho)) {
      throw new RuntimeException(
        'Não foi possível atualizar a configuração.'
      );
    }
  } finally {
    if (is_file($temporario)) {
      unlink($temporario);
    }
  }
}

try {
  $metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

  if ($metodo === 'GET') {
    $computador = grid_config_validar_computador(
      $_GET['computador'] ?? null
    );

    $config = grid_config_carregar($computador);

    grid_config_responder(200, [
      'sucesso' => true,
      'configuracoes' => $config
    ]);
  }

  if ($metodo === 'POST') {
    $dados = json_decode(
      file_get_contents('php://input'),
      true
    );

    if (!is_array($dados)) {
      throw new InvalidArgumentException(
        'Corpo da requisição inválido.'
      );
    }

    $computador = grid_config_validar_computador(
      $dados['computador'] ?? null
    );

    if (
      !isset($dados['configuracoes']) ||
      !is_array($dados['configuracoes'])
    ) {
      throw new InvalidArgumentException(
        'Configurações não informadas.'
      );
    }

    // Carrega a configuração atual para preservar
    // propriedades que ainda não são editadas pela interface.
    $atual = grid_config_carregar($computador);
    $config = array_replace_recursive(
      $atual,
      $dados['configuracoes']
    );

    if (isset($dados['configuracoes']['geral']['filas'])) {
      $config['geral']['filas'] =
        $dados['configuracoes']['geral']['filas'];
    }

    $config = grid_config_validar(
      $config,
      $computador
    );

    grid_config_salvar($computador, $config);

    grid_config_responder(200, [
      'sucesso' => true,
      'mensagem' => 'Configurações salvas com sucesso.',
      'configuracoes' => $config
    ]);
  }

  grid_config_responder(405, [
    'sucesso' => false,
    'mensagem' => 'Método não permitido.'
  ]);

} catch (InvalidArgumentException $e) {
  grid_config_responder(400, [
    'sucesso' => false,
    'mensagem' => $e->getMessage()
  ]);

} catch (Throwable $e) {
  error_log('[GRID] Erro nas configurações: ' . $e->getMessage());

  grid_config_responder(500, [
    'sucesso' => false,
    'mensagem' => 'Não foi possível processar as configurações.'
  ]);
}
