<?php
declare(strict_types=1);

function get_pdo(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $url = getenv('DATABASE_URL') ?: getenv('DB_URL') ?: '';
    if ($url === '') {
        $url = 'mysql://DSOS_productten:3a99acfeaa5e07bf0597c7ef31fac8e3594f180f@694tv8.h.filess.io:3306/DSOS_productten';
    }

    $parts = parse_url($url);
    $host = $parts['host'] ?? 'localhost';
    $db = isset($parts['path']) ? ltrim($parts['path'], '/') : 'sheiqaway';
    $user = $parts['user'] ?? 'root';
    $pass = $parts['pass'] ?? '';
    $port = $parts['port'] ?? null;
    $charset = getenv('DB_CHARSET') ?: 'utf8mb4';

    $dsn = "mysql:host={$host};dbname={$db};charset={$charset}";
    if ($port) {
        $dsn .= ";port={$port}";
    }

    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];

    try {
        $pdo = new PDO($dsn, $user, $pass, $options);
    } catch (PDOException $e) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'DB connection failed']);
        exit;
    }

    return $pdo;
}
