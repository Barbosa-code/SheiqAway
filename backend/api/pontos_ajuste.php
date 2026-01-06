<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../middleware.php';

require_login();
require_method('POST');

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    $input = $_POST;
}

$delta = (int)($input['delta'] ?? 0);
if ($delta === 0) {
    json_response(['ok' => true, 'pontos' => null]);
}

$pdo = get_pdo();
$stmt = $pdo->prepare('SELECT pontos FROM pontos_fidelizacao WHERE user_id = ?');
$stmt->execute([current_user_id()]);
$row = $stmt->fetch();

if (!$row) {
    $novo = max(0, $delta);
    $stmt = $pdo->prepare('INSERT INTO pontos_fidelizacao (user_id, pontos) VALUES (?, ?)');
    $stmt->execute([current_user_id(), $novo]);
    json_response(['ok' => true, 'pontos' => $novo]);
}

$atual = (int)($row['pontos'] ?? 0);
$novo = max(0, $atual + $delta);
$stmt = $pdo->prepare('UPDATE pontos_fidelizacao SET pontos = ? WHERE user_id = ?');
$stmt->execute([$novo, current_user_id()]);

json_response(['ok' => true, 'pontos' => $novo]);
