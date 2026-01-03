<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../middleware.php';

require_method('POST');

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    $input = $_POST;
}

$nome = trim((string)($input['nome'] ?? $input['username'] ?? ''));
$email = trim((string)($input['email'] ?? ''));
$password = (string)($input['password'] ?? '');
$telefone = trim((string)($input['telefone'] ?? ''));

if ($nome === '' || $email === '' || $password === '') {
    json_response(['error' => 'Campos obrigatorios em falta.'], 422);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_response(['error' => 'Email invalido.'], 422);
}
if (strlen($password) < 6) {
    json_response(['error' => 'Password demasiado curta.'], 422);
}

$pdo = get_pdo();

$stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
if ($stmt->fetch()) {
    json_response(['error' => 'Email ja registado.'], 409);
}

$stmt = $pdo->prepare('SELECT id FROM admin_users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
if ($stmt->fetch()) {
    json_response(['error' => 'Email reservado para admin.'], 409);
}

$hash = password_hash($password, PASSWORD_DEFAULT);

$stmt = $pdo->prepare('INSERT INTO users (nome, email, password_hash, telefone) VALUES (?, ?, ?, ?)');
$stmt->execute([$nome, $email, $hash, $telefone !== '' ? $telefone : null]);
$userId = (int)$pdo->lastInsertId();

$stmt = $pdo->prepare('INSERT INTO pontos_fidelizacao (user_id, pontos) VALUES (?, 0)');
$stmt->execute([$userId]);

$_SESSION['user'] = [
    'id' => $userId,
    'nome' => $nome,
    'email' => $email,
    'role' => 'user',
];

json_response([
    'ok' => true,
    'user' => $_SESSION['user'],
]);
