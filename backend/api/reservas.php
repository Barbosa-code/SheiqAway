<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../middleware.php';
require_once __DIR__ . '/external_api.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_login();

    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        $input = $_POST;
    }

    $viagemId = (int)($input['viagemId'] ?? 0);
    $passageiros = $input['passageiros'] ?? [];
    $origem = trim((string)($input['origem'] ?? ''));
    $destino = trim((string)($input['destino'] ?? ''));
    $dataPartida = trim((string)($input['data_partida'] ?? $input['data'] ?? ''));
    if ($dataPartida !== '') {
        if (preg_match('/^\d{4}-\d{2}-\d{2}T/', $dataPartida)) {
            $dt = date_create($dataPartida);
            if ($dt instanceof DateTimeInterface) {
                $dataPartida = $dt->format('Y-m-d');
            } else {
                $dataPartida = substr($dataPartida, 0, 10);
            }
        } elseif (preg_match('/^\d{4}-\d{2}-\d{2}/', $dataPartida)) {
            $dataPartida = substr($dataPartida, 0, 10);
        }
    }
    $precoTotal = (float)($input['preco_total'] ?? $input['preco'] ?? 0);
    $companhia = trim((string)($input['companhia'] ?? $input['provider'] ?? ''));
    $pontosUsados = (int)($input['pontos_usados'] ?? 0);
    $totalPago = (float)($input['total_pago'] ?? $precoTotal);

    if ($viagemId <= 0 || !is_array($passageiros) || count($passageiros) === 0) {
        json_response(['error' => 'Dados de reserva incompletos.'], 422);
    }
    if ($origem === '' || $destino === '' || $dataPartida === '' || $precoTotal <= 0) {
        json_response(['error' => 'Detalhes da viagem em falta.'], 422);
    }

    $payload = [
        'viagemId' => $viagemId,
        'passageiros' => $passageiros,
    ];

    $apiRes = external_request('POST', '/api/reservas', [], $payload);
    if (($apiRes['status'] ?? 0) === 0) {
        json_response(['error' => 'Falha ao contactar a API externa.'], 502);
    }
    if ((int)$apiRes['status'] >= 400) {
        json_response(['error' => 'Erro da API externa.', 'details' => $apiRes['body']], (int)$apiRes['status']);
    }

    $apiBody = $apiRes['body'];
    $apiReservaId = null;
    if (is_array($apiBody)) {
        $apiReservaId =
            $apiBody['id'] ??
            $apiBody['reservaId'] ??
            ($apiBody['reserva']['id'] ?? null);
    }

    $pdo = get_pdo();
    $stmt = $pdo->prepare('INSERT INTO reservas (user_id, api_reserva_id, viagem_id, companhia, origem, destino, data_partida, preco_total, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        current_user_id(),
        $apiReservaId !== null ? (int)$apiReservaId : null,
        $viagemId,
        $companhia !== '' ? $companhia : null,
        $origem,
        $destino,
        $dataPartida,
        $precoTotal,
        'confirmada',
    ]);
    $reservaId = (int)$pdo->lastInsertId();

    $stmtPass = $pdo->prepare('INSERT INTO passageiros (reserva_id, nome, data_nascimento, email) VALUES (?, ?, ?, ?)');
    foreach ($passageiros as $p) {
        $nome = trim((string)($p['nome'] ?? ''));
        $dataNasc = trim((string)($p['data_nascimento'] ?? ''));
        $email = trim((string)($p['email'] ?? ''));
        if ($nome === '' || $dataNasc === '' || $email === '') {
            continue;
        }
        $stmtPass->execute([$reservaId, $nome, $dataNasc, $email]);
    }

    if ($pontosUsados > 0) {
        $stmt = $pdo->prepare('SELECT pontos FROM pontos_fidelizacao WHERE user_id = ?');
        $stmt->execute([current_user_id()]);
        $row = $stmt->fetch();
        $atual = (int)($row['pontos'] ?? 0);
        $pontosUsados = min($pontosUsados, $atual);
        if ($pontosUsados > 0) {
            $stmt = $pdo->prepare('UPDATE pontos_fidelizacao SET pontos = pontos - ? WHERE user_id = ?');
            $stmt->execute([$pontosUsados, current_user_id()]);
        }
    }

    $pontosGanho = (int)floor(max(0, $totalPago));
    if ($pontosGanho > 0) {
        $stmt = $pdo->prepare('UPDATE pontos_fidelizacao SET pontos = pontos + ? WHERE user_id = ?');
        $stmt->execute([$pontosGanho, current_user_id()]);
    }

    json_response([
        'ok' => true,
        'api' => $apiBody,
        'reserva_id' => $reservaId,
        'pontos_usados' => $pontosUsados,
        'pontos_ganhos' => $pontosGanho,
    ], 201);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    require_login();

    $useApi = filter_var($_GET['api'] ?? false, FILTER_VALIDATE_BOOLEAN);
    if ($useApi) {
        $email = trim((string)($_GET['email'] ?? $_SESSION['user']['email'] ?? ''));
        $query = [];
        if ($email !== '') {
            $query['email'] = $email;
        }

        $apiRes = external_request('GET', '/api/reservas', $query);
        if (($apiRes['status'] ?? 0) === 0) {
            json_response(['error' => 'Falha ao contactar a API externa.'], 502);
        }
        if ((int)$apiRes['status'] >= 400) {
            json_response(['error' => 'Erro da API externa.', 'details' => $apiRes['body']], (int)$apiRes['status']);
        }

        json_response(['ok' => true, 'data' => $apiRes['body']]);
    }

    $pdo = get_pdo();
    $params = [];
    $sql = 'SELECT * FROM reservas';

    if (($_SESSION['user']['role'] ?? '') !== 'admin') {
        $sql .= ' WHERE user_id = ?';
        $params[] = current_user_id();
    }
    $sql .= ' ORDER BY created_at DESC';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $reservas = $stmt->fetchAll();

    if (!$reservas) {
        json_response(['ok' => true, 'data' => []]);
    }

    $stmtPass = $pdo->prepare('SELECT * FROM passageiros WHERE reserva_id = ? ORDER BY id ASC');
    foreach ($reservas as &$reserva) {
        $stmtPass->execute([$reserva['id']]);
        $reserva['passageiros'] = $stmtPass->fetchAll();
    }

    json_response(['ok' => true, 'data' => $reservas]);
}

json_response(['error' => 'Method not allowed'], 405);
