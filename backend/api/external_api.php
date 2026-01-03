<?php
declare(strict_types=1);

const EXTERNAL_API_BASE = 'http://vsgate-http.dei.isep.ipp.pt:10901';

function external_request(string $method, string $path, array $query = [], $body = null): array
{
    $url = rtrim(EXTERNAL_API_BASE, '/') . $path;
    if (!empty($query)) {
        $url .= '?' . http_build_query($query);
    }

    $ch = curl_init($url);
    $headers = [];

    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, strtoupper($method));
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);

    if ($body !== null) {
        $payload = json_encode($body);
        $headers[] = 'Content-Type: application/json';
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    }

    if (!empty($headers)) {
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    }

    $raw = curl_exec($ch);
    $err = curl_error($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($err) {
        return ['status' => 0, 'error' => $err, 'body' => null];
    }

    $decoded = json_decode((string)$raw, true);
    $bodyOut = json_last_error() === JSON_ERROR_NONE ? $decoded : $raw;

    return ['status' => $status, 'body' => $bodyOut, 'raw' => $raw];
}
