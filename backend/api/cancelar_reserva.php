<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../middleware.php';
require_once __DIR__ . '/external_api.php';

require_login();
require_method('DELETE');

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    $input = $_GET;
}

$apiId = isset($input['id']) ? (int)$input['id'] : 0;
$localId = isset($input['local_id']) ? (int)$input['local_id'] : 0;

$pdo = get_pdo();

if ($apiId <= 0 && $localId > 0) {
    $stmt = $pdo->prepare('SELECT api_reserva_id FROM reservas WHERE id = ?');
    $stmt->execute([$localId]);
    $row = $stmt->fetch();
    if ($row && !empty($row['api_reserva_id'])) {
        $apiId = (int)$row['api_reserva_id'];
    }
}

if ($apiId <= 0 && $localId <= 0) {
    json_response(['error' => 'ID de reserva invalido.'], 422);
}

if ($localId > 0) {
    $stmt = $pdo->prepare('SELECT user_id, api_reserva_id, estado FROM reservas WHERE id = ?');
    $stmt->execute([$localId]);
    $row = $stmt->fetch();
    if (!$row) {
        json_response(['error' => 'Reserva nao encontrada.'], 404);
    }
    if ((int)$row['user_id'] !== current_user_id()) {
        json_response(['error' => 'Sem permissao para cancelar esta reserva.'], 403);
    }
    if (($row['estado'] ?? '') === 'cancelada') {
        json_response(['error' => 'Reserva ja cancelada.'], 409);
    }
    if ($apiId <= 0 && !empty($row['api_reserva_id'])) {
        $apiId = (int)$row['api_reserva_id'];
    }
}

if ($apiId > 0) {
    $apiRes = external_request('DELETE', '/api/reservas/' . $apiId);
    if (($apiRes['status'] ?? 0) === 0) {
        json_response(['error' => 'Falha ao contactar a API externa.'], 502);
    }
    if ((int)$apiRes['status'] >= 400) {
        json_response(['error' => 'Erro da API externa.', 'details' => $apiRes['body']], (int)$apiRes['status']);
    }
}

if ($apiId > 0) {
    $stmt = $pdo->prepare('UPDATE reservas SET estado = ? WHERE api_reserva_id = ?');
    $stmt->execute(['cancelada', $apiId]);
} else {
    $stmt = $pdo->prepare('UPDATE reservas SET estado = ? WHERE id = ?');
    $stmt->execute(['cancelada', $localId]);
}

json_response(['ok' => true]);
