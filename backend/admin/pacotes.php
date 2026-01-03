<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../middleware.php';

require_login();
require_admin();

$pdo = get_pdo();
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'GET') {
    $stmt = $pdo->query(
        'SELECT p.*, GROUP_CONCAT(pv.viagem_id) AS viagens
         FROM pacotes p
         LEFT JOIN pacotes_viagens pv ON pv.pacote_id = p.id
         GROUP BY p.id
         ORDER BY p.created_at DESC'
    );
    $data = $stmt->fetchAll();
    json_response(['ok' => true, 'data' => $data]);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    $input = $_POST;
}

if ($method === 'POST') {
    $nome = trim((string)($input['nome'] ?? ''));
    $descricao = trim((string)($input['descricao'] ?? ''));
    $precoTotal = (float)($input['preco_total'] ?? 0);
    $ativa = isset($input['ativa']) ? (int)!!$input['ativa'] : 1;
    $viagens = $input['viagens'] ?? [];

    if ($nome === '' || $precoTotal <= 0) {
        json_response(['error' => 'Campos obrigatorios em falta.'], 422);
    }

    if (!is_array($viagens)) {
        $viagens = array_filter(array_map('trim', explode(',', (string)$viagens)));
    }
    $viagens = array_values(array_filter(array_map('intval', $viagens)));
    $viagens = array_values(array_unique($viagens));
    if (count($viagens) < 2) {
        json_response(['error' => 'O pacote deve ter pelo menos 2 viagens.'], 422);
    }

    $stmt = $pdo->prepare('INSERT INTO pacotes (nome, descricao, preco_total, ativa) VALUES (?, ?, ?, ?)');
    $stmt->execute([
        $nome,
        $descricao !== '' ? $descricao : null,
        $precoTotal,
        $ativa,
    ]);
    $pacoteId = (int)$pdo->lastInsertId();

    $stmt = $pdo->prepare('INSERT INTO pacotes_viagens (pacote_id, viagem_id) VALUES (?, ?)');
    foreach ($viagens as $viagemId) {
        if ($viagemId > 0) {
            $stmt->execute([$pacoteId, $viagemId]);
        }
    }

    json_response(['ok' => true, 'id' => $pacoteId], 201);
}

if ($method === 'PUT') {
    $id = (int)($input['id'] ?? 0);
    if ($id <= 0) {
        json_response(['error' => 'ID invalido.'], 422);
    }
    $nome = trim((string)($input['nome'] ?? ''));
    $descricao = trim((string)($input['descricao'] ?? ''));
    $precoTotal = (float)($input['preco_total'] ?? 0);
    $ativa = isset($input['ativa']) ? (int)!!$input['ativa'] : 1;
    $viagens = $input['viagens'] ?? null;

    if ($nome === '' || $precoTotal <= 0) {
        json_response(['error' => 'Campos obrigatorios em falta.'], 422);
    }

    $stmt = $pdo->prepare('UPDATE pacotes SET nome = ?, descricao = ?, preco_total = ?, ativa = ? WHERE id = ?');
    $stmt->execute([
        $nome,
        $descricao !== '' ? $descricao : null,
        $precoTotal,
        $ativa,
        $id,
    ]);

    if ($viagens !== null) {
        if (!is_array($viagens)) {
            $viagens = array_filter(array_map('trim', explode(',', (string)$viagens)));
        }
        $viagens = array_values(array_filter(array_map('intval', $viagens)));
        $viagens = array_values(array_unique($viagens));
        if (count($viagens) < 2) {
            json_response(['error' => 'O pacote deve ter pelo menos 2 viagens.'], 422);
        }
        $pdo->prepare('DELETE FROM pacotes_viagens WHERE pacote_id = ?')->execute([$id]);
        $stmt = $pdo->prepare('INSERT INTO pacotes_viagens (pacote_id, viagem_id) VALUES (?, ?)');
        foreach ($viagens as $viagemId) {
            if ($viagemId > 0) {
                $stmt->execute([$id, $viagemId]);
            }
        }
    }
    json_response(['ok' => true]);
}

if ($method === 'DELETE') {
    $id = (int)($input['id'] ?? ($_GET['id'] ?? 0));
    if ($id <= 0) {
        json_response(['error' => 'ID invalido.'], 422);
    }
    $stmt = $pdo->prepare('DELETE FROM pacotes WHERE id = ?');
    $stmt->execute([$id]);
    json_response(['ok' => true]);
}

json_response(['error' => 'Method not allowed'], 405);
