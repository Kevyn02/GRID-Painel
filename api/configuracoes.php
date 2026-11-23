<?php

declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

function grid_config_padrao(): array
{
  return [
    'versao' => 1,
    'tema' => 'padrao',
    'geral' => [
      'computador' => null,
      'filas' => [],
      'titulo' => 'Painel de chamadas',
    ],
    'aparencia' => [
      'cores' => [
        'fundo' => null,
        'texto' => null,
        'primaria' => null,
        'secundaria' => null,
        'destaque' => null,
        'historico' => null,
        'borda' => null,
      ],
      'fontes' => [
        'familia' => null,
        'paciente' => null,
        'guiche' => null,
        'historico' => null,
      ],
      'espacamento' => null,
      'imagens' => [
        'fundo' => null,
        'logo' => null,
      ],
    ],
    'chamada' => [
      'titulo' => 'PACIENTE',
      'animacao' => 'zoom',
      'duracao' => 8,
    ],
    'historico' => [
      'quantidade' => GRID_HISTORICO_PADRAO,
      'titulo' => 'ÚLTIMAS CHAMADAS',
      'mostrar_horario' => true,
    ],
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

function grid_config_texto(
  mixed $valor,
  string $padrao,
  int $maximo,
  string $campo
): string {
  if ($valor === null) {
    return $padrao;
  }

  if (!is_string($valor)) {
    throw new InvalidArgumentException("O campo {$campo} é inválido.");
  }

  $texto = trim($valor);

  if (
    $texto === '' ||
    mb_strlen($texto) > $maximo ||
    preg_match('/[\x00-\x1F\x7F]/u', $texto)
  ) {
    throw new InvalidArgumentException("O campo {$campo} é inválido.");
  }

  return $texto;
}

function grid_config_slug(
  mixed $valor,
  string $padrao,
  string $campo
): string {
  if ($valor === null) {
    return $padrao;
  }

  if (!is_string($valor) || !preg_match('/^[a-z0-9_-]{1,40}$/', $valor)) {
    throw new InvalidArgumentException("O campo {$campo} é inválido.");
  }

  return $valor;
}

function grid_config_cor(mixed $valor, string $campo): ?string
{
  if ($valor === null || $valor === '') {
    return null;
  }

  if (
    !is_string($valor) ||
    !preg_match(
      '/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/',
      trim($valor)
    )
  ) {
    throw new InvalidArgumentException(
      "O campo {$campo} deve ser uma cor hexadecimal."
    );
  }

  return strtolower(trim($valor));
}

function grid_config_numero(
  mixed $valor,
  float $minimo,
  float $maximo,
  string $campo
): int|float|null {
  if ($valor === null || $valor === '') {
    return null;
  }

  if (!is_numeric($valor)) {
    throw new InvalidArgumentException("O campo {$campo} é inválido.");
  }

  $numero = (float) $valor;

  if ($numero < $minimo || $numero > $maximo) {
    throw new InvalidArgumentException(
      "O campo {$campo} deve estar entre {$minimo} e {$maximo}."
    );
  }

  return $numero == (int) $numero ? (int) $numero : $numero;
}

function grid_config_fonte(mixed $valor, string $campo): ?string
{
  if ($valor === null || $valor === '') {
    return null;
  }

  if (!is_string($valor)) {
    throw new InvalidArgumentException("O campo {$campo} é inválido.");
  }

  $fonte = trim($valor);

  if (
    $fonte === '' ||
    mb_strlen($fonte) > 100 ||
    !preg_match('/^[a-zA-Z0-9\s,\'"-]+$/', $fonte)
  ) {
    throw new InvalidArgumentException("O campo {$campo} é inválido.");
  }

  return $fonte;
}

function grid_config_imagem(mixed $valor, string $campo): ?string
{
  if ($valor === null || $valor === '') {
    return null;
  }

  if (!is_string($valor)) {
    throw new InvalidArgumentException("O campo {$campo} é inválido.");
  }

  $caminho = trim($valor);

  if (
    $caminho === '' ||
    mb_strlen($caminho) > 500 ||
    str_contains($caminho, '..') ||
    str_contains($caminho, '\\') ||
    preg_match('/["\'();<>]/', $caminho) ||
    !preg_match('#^assets/imagens/[a-zA-Z0-9/_\-.]+$#', $caminho)
  ) {
    throw new InvalidArgumentException(
      "O campo {$campo} deve referenciar uma imagem em assets/imagens/."
    );
  }

  return $caminho;
}

function grid_config_bool(mixed $valor, bool $padrao, string $campo): bool
{
  if ($valor === null) {
    return $padrao;
  }

  if (is_bool($valor)) {
    return $valor;
  }

  if ($valor === 1 || $valor === '1' || $valor === 'true') {
    return true;
  }

  if ($valor === 0 || $valor === '0' || $valor === 'false') {
    return false;
  }

  throw new InvalidArgumentException("O campo {$campo} é inválido.");
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
  $padrao = grid_config_padrao();

  $geral = $config['geral'] ?? [];
  $aparencia = $config['aparencia'] ?? [];
  $chamada = $config['chamada'] ?? [];
  $historico = $config['historico'] ?? [];

  foreach (
    [
      'geral' => $geral,
      'aparencia' => $aparencia,
      'chamada' => $chamada,
      'historico' => $historico,
    ] as $secao => $valor
  ) {
    if (!is_array($valor)) {
      throw new InvalidArgumentException(
        "A seção {$secao} da configuração é inválida."
      );
    }
  }

  $filas = $geral['filas'] ?? [];

  if (!is_array($filas)) {
    throw new InvalidArgumentException('A lista de filas é inválida.');
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

  $filasValidadas = array_values(array_unique($filasValidadas));

  $cores = $aparencia['cores'] ?? [];
  $fontes = $aparencia['fontes'] ?? [];
  $imagens = $aparencia['imagens'] ?? [];

  foreach (
    [
      'aparencia.cores' => $cores,
      'aparencia.fontes' => $fontes,
      'aparencia.imagens' => $imagens,
    ] as $secao => $valor
  ) {
    if (!is_array($valor)) {
      throw new InvalidArgumentException(
        "A seção {$secao} da configuração é inválida."
      );
    }
  }

  $quantidade = filter_var(
    $historico['quantidade'] ?? GRID_HISTORICO_PADRAO,
    FILTER_VALIDATE_INT
  );

  if (
    $quantidade === false ||
    $quantidade < GRID_HISTORICO_MINIMO ||
    $quantidade > GRID_HISTORICO_MAXIMO
  ) {
    throw new InvalidArgumentException(
      'A quantidade do histórico deve estar entre 2 e 5.'
    );
  }

  $duracao = filter_var(
    $chamada['duracao'] ?? 8,
    FILTER_VALIDATE_INT
  );

  if ($duracao === false || $duracao < 3 || $duracao > 30) {
    throw new InvalidArgumentException(
      'A duração da chamada deve estar entre 3 e 30 segundos.'
    );
  }

  $coresValidadas = [];

  foreach (array_keys($padrao['aparencia']['cores']) as $nome) {
    $coresValidadas[$nome] = grid_config_cor(
      $cores[$nome] ?? null,
      "aparencia.cores.{$nome}"
    );
  }

  $imagensValidadas = [];

  foreach (array_keys($padrao['aparencia']['imagens']) as $nome) {
    $imagensValidadas[$nome] = grid_config_imagem(
      $imagens[$nome] ?? null,
      "aparencia.imagens.{$nome}"
    );
  }

  return [
    'versao' => (int) ($config['versao'] ?? 0),
    'tema' => grid_config_slug(
      $config['tema'] ?? null,
      $padrao['tema'],
      'tema'
    ),
    'geral' => [
      'computador' => $computador,
      'filas' => $filasValidadas,
      'titulo' => grid_config_texto(
        $geral['titulo'] ?? null,
        $padrao['geral']['titulo'],
        100,
        'geral.titulo'
      ),
    ],
    'aparencia' => [
      'cores' => $coresValidadas,
      'fontes' => [
        'familia' => grid_config_fonte(
          $fontes['familia'] ?? null,
          'aparencia.fontes.familia'
        ),
        'paciente' => grid_config_numero(
          $fontes['paciente'] ?? null,
          12,
          200,
          'aparencia.fontes.paciente'
        ),
        'guiche' => grid_config_numero(
          $fontes['guiche'] ?? null,
          12,
          120,
          'aparencia.fontes.guiche'
        ),
        'historico' => grid_config_numero(
          $fontes['historico'] ?? null,
          10,
          80,
          'aparencia.fontes.historico'
        ),
      ],
      'espacamento' => grid_config_numero(
        $aparencia['espacamento'] ?? null,
        0,
        100,
        'aparencia.espacamento'
      ),
      'imagens' => $imagensValidadas,
    ],
    'chamada' => [
      'titulo' => grid_config_texto(
        $chamada['titulo'] ?? null,
        $padrao['chamada']['titulo'],
        100,
        'chamada.titulo'
      ),
      'animacao' => grid_config_slug(
        $chamada['animacao'] ?? null,
        $padrao['chamada']['animacao'],
        'chamada.animacao'
      ),
      'duracao' => $duracao,
    ],
    'historico' => [
      'quantidade' => $quantidade,
      'titulo' => grid_config_texto(
        $historico['titulo'] ?? null,
        $padrao['historico']['titulo'],
        100,
        'historico.titulo'
      ),
      'mostrar_horario' => grid_config_bool(
        $historico['mostrar_horario'] ?? null,
        true,
        'historico.mostrar_horario'
      ),
    ],
  ];
}

function grid_config_limpar_backups(int $computador): void
{
  $arquivos = glob(GRID_BACKUPS . '/' . $computador . '_*.json') ?: [];

  rsort($arquivos, SORT_STRING);

  foreach (array_slice($arquivos, 20) as $antigo) {
    if (is_file($antigo)) {
      @unlink($antigo);
    }
  }
}

function grid_config_salvar(int $computador, array $config): array
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

  grid_config_limpar_backups($computador);

  return $config;
}

try {
  $metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

  if ($metodo === 'GET') {
    $computador = grid_config_validar_computador(
      $_GET['computador'] ?? null
    );

    $config = grid_config_carregar($computador);

    grid_responder([
      'sucesso' => true,
      'configuracoes' => $config,
    ]);
  }

  if ($metodo === 'POST') {
    $dados = grid_receber_json();

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

    $config = grid_config_salvar($computador, $config);

    grid_responder([
      'sucesso' => true,
      'mensagem' => 'Configurações salvas com sucesso.',
      'configuracoes' => $config,
    ]);
  }

  grid_responder([
    'sucesso' => false,
    'mensagem' => 'Método não permitido.'
  ], 405);

} catch (InvalidArgumentException $e) {
  grid_responder([
    'sucesso' => false,
    'mensagem' => $e->getMessage()
  ], 400);

} catch (Throwable $e) {
  error_log('[GRID] Erro nas configurações: ' . $e->getMessage());

  grid_responder([
    'sucesso' => false,
    'mensagem' => 'Não foi possível processar as configurações.'
  ], 500);
}