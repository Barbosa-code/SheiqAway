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
        'SELECT u.id, u.nome, u.email, u.telefone, u.created_at, p.pontos
         FROM users u
         LEFT JOIN pontos_fidelizacao p ON p.user_id = u.id
         ORDER BY u.created_at DESC'
    );
    $users = $stmt->fetchAll();
    json_response(['ok' => true, 'data' => $users]);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    $input = $_POST;
}

if ($method === 'POST') {
    $tipo = trim((string)($input['tipo'] ?? 'user'));
    $nome = trim((string)($input['nome'] ?? ''));
    $email = trim((string)($input['email'] ?? ''));
    $password = (string)($input['password'] ?? '');

    if ($nome === '' || $email === '' || $password === '') {
        json_response(['error' => 'Campos obrigatorios em falta.'], 422);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_response(['error' => 'Email invalido.'], 422);
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);

    if ($tipo === 'admin') {
        $stmt = $pdo->prepare('INSERT INTO admin_users (nome, email, password_hash) VALUES (?, ?, ?)');
        $stmt->execute([$nome, $email, $hash]);
        json_response(['ok' => true, 'admin_id' => (int)$pdo->lastInsertId()], 201);
    }

    $stmt = $pdo->prepare('INSERT INTO users (nome, email, password_hash) VALUES (?, ?, ?)');
    $stmt->execute([$nome, $email, $hash]);
    $userId = (int)$pdo->lastInsertId();

    $stmt = $pdo->prepare('INSERT INTO pontos_fidelizacao (user_id, pontos) VALUES (?, 0)');
    $stmt->execute([$userId]);

    json_response(['ok' => true, 'user_id' => $userId], 201);
}

if ($method === 'PUT') {
    $id = (int)($input['id'] ?? 0);
    $nome = trim((string)($input['nome'] ?? ''));
    $email = trim((string)($input['email'] ?? ''));
    $telefone = trim((string)($input['telefone'] ?? ''));

    if ($id <= 0) {
        json_response(['error' => 'ID invalido.'], 422);
    }

    $stmt = $pdo->prepare('UPDATE users SET nome = ?, email = ?, telefone = ? WHERE id = ?');
    $stmt->execute([$nome, $email, $telefone !== '' ? $telefone : null, $id]);
    json_response(['ok' => true]);
}

if ($method === 'DELETE') {
    $id = (int)($input['id'] ?? ($_GET['id'] ?? 0));
    if ($id <= 0) {
        json_response(['error' => 'ID invalido.'], 422);
    }
    $stmt = $pdo->prepare('DELETE FROM users WHERE id = ?');
    $stmt->execute([$id]);
    json_response(['ok' => true]);
}

json_response(['error' => 'Method not allowed'], 405);
