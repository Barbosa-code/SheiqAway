<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../middleware.php';

require_login();
require_method('GET');

$pdo = get_pdo();
$stmt = $pdo->prepare('SELECT pontos FROM pontos_fidelizacao WHERE user_id = ?');
$stmt->execute([current_user_id()]);
$row = $stmt->fetch();

json_response([
    'ok' => true,
    'pontos' => (int)($row['pontos'] ?? 0),
]);
