<?php

declare(strict_types=1);

date_default_timezone_set('America/Sao_Paulo');

/*
|--------------------------------------------------------------------------
| GRID - Caminhos principais
|--------------------------------------------------------------------------
|
| __DIR__ aponta para:
| grid/pages/painel
|
*/

define('GRID_ROOT', __DIR__);

define('GRID_PROJECT_ROOT', dirname(__DIR__, 2));

define(
  'GRID_CONEXAO_DIR',
  GRID_PROJECT_ROOT . '/classes/conexao'
);

/*
|--------------------------------------------------------------------------
| Configurações gerais
|--------------------------------------------------------------------------
*/

define('GRID_ESTABELECIMENTO', 125);

define('GRID_INTERVALO_CHAMADAS', 1000);

define('GRID_INTERVALO_ATUALIZACAO', 1800);

define('GRID_TENTATIVAS_INICIAIS', 5);

define('GRID_HISTORICO_PADRAO', 4);

define('GRID_HISTORICO_MINIMO', 2);

define('GRID_HISTORICO_MAXIMO', 5);

/*
|--------------------------------------------------------------------------
| Diretórios do painel
|--------------------------------------------------------------------------
*/

define('GRID_API', GRID_ROOT . '/api');

define('GRID_ASSETS', GRID_ROOT . '/assets');

define('GRID_CSS', GRID_ASSETS . '/css');

define('GRID_JS', GRID_ASSETS . '/js');

define('GRID_IMAGENS', GRID_ASSETS . '/imagens');

define('GRID_CONFIG', GRID_ROOT . '/config');

define('GRID_PAINEIS', GRID_CONFIG . '/paineis');

define('GRID_TEMAS', GRID_CONFIG . '/temas');

define('GRID_BACKUPS', GRID_CONFIG . '/backups');

/*
|--------------------------------------------------------------------------
| Uploads
|--------------------------------------------------------------------------
*/

define('GRID_UPLOAD_MAXIMO', 5 * 1024 * 1024);

define(
  'GRID_FORMATOS_IMAGEM',
  [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ]
);
