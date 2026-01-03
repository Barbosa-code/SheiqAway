<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../middleware.php';

require_login();
require_admin();

$pdo = get_pdo();
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'GET') {
    $stmt = $pdo->query('SELECT * FROM promocoes ORDER BY data_inicio DESC');
    $data = $stmt->fetchAll();
    json_response(['ok' => true, 'data' => $data]);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    $input = $_POST;
}

if ($method === 'POST') {
    $viagemId = (int)($input['viagem_id'] ?? 0);
    $percentual = (float)($input['percentual_desconto'] ?? 0);
    $inicio = trim((string)($input['data_inicio'] ?? ''));
    $fim = trim((string)($input['data_fim'] ?? ''));
    if ($inicio === '') {
        $inicio = '1970-01-01';
    }
    if ($fim === '') {
        $fim = '2099-12-31';
    }
    $ativa = isset($input['ativa']) ? (int)!!$input['ativa'] : 1;

    if ($viagemId <= 0 || $percentual <= 0) {
        json_response(['error' => 'Campos obrigatorios em falta.'], 422);
    }
    $stmt = $pdo->prepare('SELECT id FROM promocoes WHERE viagem_id = ? LIMIT 1');
    $stmt->execute([$viagemId]);
    if ($stmt->fetch()) {
        json_response(['error' => 'Ja existe uma promocao para esta viagem.'], 409);
    }

    $stmt = $pdo->prepare('INSERT INTO promocoes (viagem_id, percentual_desconto, data_inicio, data_fim, ativa) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([
        $viagemId,
        $percentual,
        $inicio !== '' ? $inicio : null,
        $fim !== '' ? $fim : null,
        $ativa
    ]);
    json_response(['ok' => true, 'id' => (int)$pdo->lastInsertId()], 201);
}

if ($method === 'PUT') {
    $id = (int)($input['id'] ?? 0);
    if ($id <= 0) {
        json_response(['error' => 'ID invalido.'], 422);
    }
    $viagemId = (int)($input['viagem_id'] ?? 0);
    $percentual = (float)($input['percentual_desconto'] ?? 0);
    $inicio = trim((string)($input['data_inicio'] ?? ''));
    $fim = trim((string)($input['data_fim'] ?? ''));
    if ($inicio === '' || $fim === '') {
        $stmt = $pdo->prepare('SELECT data_inicio, data_fim FROM promocoes WHERE id = ?');
        $stmt->execute([$id]);
        $current = $stmt->fetch();
        if (!$current) {
            json_response(['error' => 'Promocao nao encontrada.'], 404);
        }
        if ($inicio === '') {
            $inicio = (string)$current['data_inicio'];
        }
        if ($fim === '') {
            $fim = (string)$current['data_fim'];
        }
    }
    $ativa = isset($input['ativa']) ? (int)!!$input['ativa'] : 1;

    if ($viagemId <= 0 || $percentual <= 0) {
        json_response(['error' => 'Campos obrigatorios em falta.'], 422);
    }
    $stmt = $pdo->prepare('SELECT id FROM promocoes WHERE viagem_id = ? AND id <> ? LIMIT 1');
    $stmt->execute([$viagemId, $id]);
    if ($stmt->fetch()) {
        json_response(['error' => 'Ja existe uma promocao para esta viagem.'], 409);
    }

    $stmt = $pdo->prepare('UPDATE promocoes SET viagem_id = ?, percentual_desconto = ?, data_inicio = ?, data_fim = ?, ativa = ? WHERE id = ?');
    $stmt->execute([
        $viagemId,
        $percentual,
        $inicio !== '' ? $inicio : null,
        $fim !== '' ? $fim : null,
        $ativa,
        $id
    ]);
    json_response(['ok' => true]);
}

if ($method === 'DELETE') {
    $id = (int)($input['id'] ?? ($_GET['id'] ?? 0));
    if ($id <= 0) {
        json_response(['error' => 'ID invalido.'], 422);
    }
    $stmt = $pdo->prepare('DELETE FROM promocoes WHERE id = ?');
    $stmt->execute([$id]);
    json_response(['ok' => true]);
}

json_response(['error' => 'Method not allowed'], 405);
