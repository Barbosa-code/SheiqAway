<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../middleware.php';

require_method('GET');

$pdo = get_pdo();

$stmt = $pdo->query(
    'SELECT p.*, GROUP_CONCAT(pv.viagem_id) AS viagens
     FROM pacotes p
     LEFT JOIN pacotes_viagens pv ON pv.pacote_id = p.id
     WHERE p.ativa = 1
     GROUP BY p.id
     ORDER BY p.created_at DESC'
);
$data = $stmt->fetchAll();

foreach ($data as &$row) {
    $ids = array_filter(array_map('trim', explode(',', (string)($row['viagens'] ?? ''))));
    $row['viagens'] = array_values(array_filter(array_map('intval', $ids)));
}

json_response(['ok' => true, 'data' => $data]);
