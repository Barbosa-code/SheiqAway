<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../middleware.php';

require_method('POST');

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    $input = $_POST;
}

$email = trim((string)($input['email'] ?? ''));
$password = (string)($input['password'] ?? '');

if ($email === '' || $password === '') {
    json_response(['error' => 'Email e password sao obrigatorios.'], 422);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_response(['error' => 'Email invalido.'], 422);
}

$pdo = get_pdo();

$stmt = $pdo->prepare('SELECT id, nome, email, password_hash, ativo FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$user = $stmt->fetch();
if ($user && password_verify($password, $user['password_hash'])) {
    if ((int)($user['ativo'] ?? 1) !== 1) {
        json_response(['error' => 'Conta desativada.'], 403);
    }
    $_SESSION['user'] = [
        'id' => (int)$user['id'],
        'nome' => $user['nome'],
        'email' => $user['email'],
        'role' => 'user',
    ];
    json_response(['ok' => true, 'user' => $_SESSION['user']]);
}

$stmt = $pdo->prepare('SELECT id, nome, email, password_hash FROM admin_users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$admin = $stmt->fetch();
if ($admin && password_verify($password, $admin['password_hash'])) {
    $_SESSION['user'] = [
        'id' => (int)$admin['id'],
        'nome' => $admin['nome'],
        'email' => $admin['email'],
        'role' => 'admin',
    ];
    json_response(['ok' => true, 'user' => $_SESSION['user']]);
}

json_response(['error' => 'Credenciais invalidas.'], 401);
