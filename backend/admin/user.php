<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../middleware.php';

require_login();
require_admin();
require_method('GET');

$userId = (int)($_GET['id'] ?? 0);
if ($userId <= 0) {
    json_response(['error' => 'ID invalido.'], 422);
}

$pdo = get_pdo();

$stmt = $pdo->prepare(
    'SELECT u.id, u.nome, u.email, u.telefone, u.ativo, u.created_at, p.pontos
     FROM users u
     LEFT JOIN pontos_fidelizacao p ON p.user_id = u.id
     WHERE u.id = ?
     LIMIT 1'
);
$stmt->execute([$userId]);
$user = $stmt->fetch();
if (!$user) {
    json_response(['error' => 'Utilizador nao encontrado.'], 404);
}

$stmt = $pdo->prepare(
    'SELECT * FROM reservas WHERE user_id = ? ORDER BY created_at DESC'
);
$stmt->execute([$userId]);
$reservas = $stmt->fetchAll();

if ($reservas) {
    $stmtPass = $pdo->prepare(
        'SELECT * FROM passageiros WHERE reserva_id = ? ORDER BY id ASC'
    );
    foreach ($reservas as &$reserva) {
        $stmtPass->execute([$reserva['id']]);
        $reserva['passageiros'] = $stmtPass->fetchAll();
    }
}

json_response([
    'ok' => true,
    'user' => $user,
    'reservas' => $reservas ?: [],
]);
