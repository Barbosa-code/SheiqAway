<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../middleware.php';

require_login();
require_admin();
require_method('GET');

$pdo = get_pdo();

$topClientes = $pdo->query(
    'SELECT u.id, u.nome, u.email, COUNT(r.id) AS total_reservas
     FROM users u
     LEFT JOIN reservas r ON r.user_id = u.id
     GROUP BY u.id
     ORDER BY total_reservas DESC
     LIMIT 5'
)->fetchAll();

$topDestinos = $pdo->query(
    'SELECT destino, COUNT(*) AS total
     FROM reservas
     GROUP BY destino
     ORDER BY total DESC
     LIMIT 5'
)->fetchAll();

$porCompanhia = $pdo->query(
    'SELECT companhia, COUNT(*) AS total
     FROM reservas
     GROUP BY companhia
     ORDER BY total DESC'
)->fetchAll();

$totalsCancel = $pdo->query(
    "SELECT COUNT(*) AS total_canceladas
     FROM reservas
     WHERE estado = 'cancelada'"
)->fetch();

$avgTicket = $pdo->query(
    'SELECT COALESCE(AVG(preco_total), 0) AS ticket_medio
     FROM reservas'
)->fetch();

$totals = $pdo->query(
    'SELECT COUNT(*) AS total_reservas,
            COALESCE(SUM(preco_total), 0) AS receita_total
     FROM reservas'
)->fetch();

$totalsUsers = $pdo->query(
    'SELECT COUNT(*) AS total_users FROM users'
)->fetch();

$hoje = $pdo->query(
    'SELECT COUNT(*) AS reservas_hoje,
            COALESCE(SUM(preco_total), 0) AS receita_hoje
     FROM reservas
     WHERE DATE(created_at) = CURDATE()'
)->fetch();

$mes = $pdo->query(
    'SELECT COUNT(*) AS reservas_mes,
            COALESCE(SUM(preco_total), 0) AS receita_mes
     FROM reservas
     WHERE YEAR(created_at) = YEAR(CURDATE())
       AND MONTH(created_at) = MONTH(CURDATE())'
)->fetch();

$ultimosDias = $pdo->query(
    'SELECT DATE(created_at) AS dia, COUNT(*) AS total
     FROM reservas
     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
     GROUP BY DATE(created_at)
     ORDER BY dia ASC'
)->fetchAll();

$reservasPorMes = $pdo->query(
    "SELECT DATE_FORMAT(created_at, '%Y-%m') AS mes, COUNT(*) AS total
     FROM reservas
     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 11 MONTH)
     GROUP BY DATE_FORMAT(created_at, '%Y-%m')
     ORDER BY mes ASC"
)->fetchAll();

$novosUsersPorMes = $pdo->query(
    "SELECT DATE_FORMAT(created_at, '%Y-%m') AS mes, COUNT(*) AS total
     FROM users
     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 11 MONTH)
     GROUP BY DATE_FORMAT(created_at, '%Y-%m')
     ORDER BY mes ASC"
)->fetchAll();

$companhiasPorReceita = $pdo->query(
    "SELECT companhia, COALESCE(SUM(preco_total), 0) AS receita
     FROM reservas
     GROUP BY companhia
     ORDER BY receita DESC
     LIMIT 5"
)->fetchAll();

$destinosPorReceita = $pdo->query(
    "SELECT destino, COALESCE(SUM(preco_total), 0) AS receita
     FROM reservas
     GROUP BY destino
     ORDER BY receita DESC
     LIMIT 5"
)->fetchAll();

json_response([
    'ok' => true,
    'top_clientes' => $topClientes,
    'top_destinos' => $topDestinos,
    'reservas_por_companhia' => $porCompanhia,
    'total_reservas' => (int)($totals['total_reservas'] ?? 0),
    'receita_total' => (float)($totals['receita_total'] ?? 0),
    'total_canceladas' => (int)($totalsCancel['total_canceladas'] ?? 0),
    'ticket_medio' => (float)($avgTicket['ticket_medio'] ?? 0),
    'total_users' => (int)($totalsUsers['total_users'] ?? 0),
    'reservas_hoje' => (int)($hoje['reservas_hoje'] ?? 0),
    'receita_hoje' => (float)($hoje['receita_hoje'] ?? 0),
    'reservas_mes' => (int)($mes['reservas_mes'] ?? 0),
    'receita_mes' => (float)($mes['receita_mes'] ?? 0),
    'reservas_ultimos_dias' => $ultimosDias,
    'reservas_por_mes' => $reservasPorMes,
    'novos_users_por_mes' => $novosUsersPorMes,
    'companhias_por_receita' => $companhiasPorReceita,
    'destinos_por_receita' => $destinosPorReceita,
]);
