<?php
declare(strict_types=1);

require_once __DIR__ . '/../middleware.php';
require_once __DIR__ . '/external_api.php';
require_once __DIR__ . '/../config/db.php';

require_method('GET');

$comEscala = filter_var($_GET['com_escala'] ?? $_GET['comEscala'] ?? false, FILTER_VALIDATE_BOOLEAN);
$companhias = filter_var($_GET['companhias'] ?? false, FILTER_VALIDATE_BOOLEAN);
$sigla = trim((string)($_GET['sigla'] ?? ''));

$path = '/api/viagens';
$query = [];

if ($companhias) {
    $path = '/api/companhias';
} elseif ($sigla !== '') {
    $path = '/api/companhias/' . rawurlencode($sigla) . '/viagens';
} elseif ($comEscala) {
    $path = '/api/viagens/com-escala';
}

if (strpos($path, '/api/viagens') === 0 || strpos($path, '/api/companhias/') === 0) {
    $origem = trim((string)($_GET['origem'] ?? ''));
    $destino = trim((string)($_GET['destino'] ?? ''));
    $data = trim((string)($_GET['data'] ?? ''));

    if ($origem !== '') {
        $query['origem'] = $origem;
    }
    if ($destino !== '') {
        $query['destino'] = $destino;
    }
    if ($data !== '') {
        $query['data'] = $data;
    }
}

$response = external_request('GET', $path, $query);

if (($response['status'] ?? 0) === 0) {
    json_response(['error' => 'Falha ao contactar a API externa.'], 502);
}

$status = (int)$response['status'];
if ($status >= 400) {
    json_response(['error' => 'Erro da API externa.', 'details' => $response['body']], $status);
}

$body = $response['body'];
if (is_array($body)) {
    $ids = [];
    foreach ($body as $item) {
        if (is_array($item) && isset($item['id'])) {
            $ids[] = (int)$item['id'];
        }
    }
    $ids = array_values(array_unique(array_filter($ids)));

    if ($ids) {
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $pdo = get_pdo();
        $stmt = $pdo->prepare(
            "SELECT * FROM promocoes
             WHERE ativa = 1 AND viagem_id IN ($placeholders)"
        );
        $stmt->execute($ids);
        $promos = $stmt->fetchAll();

        $byViagem = [];
        foreach ($promos as $promo) {
            $byViagem[(int)$promo['viagem_id']][] = $promo;
        }

        foreach ($body as &$item) {
            if (!is_array($item) || !isset($item['id'])) {
                continue;
            }
            $viagemId = (int)$item['id'];
            if (empty($byViagem[$viagemId])) {
                continue;
            }
            $preco = (float)($item['preco'] ?? 0);
            $precoFinal = $preco;
            $promoAplicada = null;

            foreach ($byViagem[$viagemId] as $promo) {
                $percentual = (float)($promo['percentual_desconto'] ?? 0);
                if ($percentual <= 0) {
                    continue;
                }
                $precoFinal = max(0, $preco * (1 - ($percentual / 100)));
                $promoAplicada = $promo;
                break;
            }

            if ($promoAplicada) {
                $item['preco_original'] = $preco;
                $item['preco_final'] = round($precoFinal, 2);
                $item['promocao_id'] = (int)$promoAplicada['id'];
                $item['desconto_percentual'] = (float)$promoAplicada['percentual_desconto'];
            }
        }
        unset($item);
    }
}

json_response(['ok' => true, 'data' => $body]);
