<?php
// Receives the "Say hello" form (JSON), saves it, and emails it to you.
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function reply(int $status, array $body): void {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') reply(405, ['error' => 'Method not allowed.']);

$cfg = require __DIR__ . '/config.php';
$dataDir = __DIR__ . '/data';

// ---- Rate limit (per IP) ----
function rate_limited(array $cfg, string $dir): bool {
    $file = $dir . '/rate.json';
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $now = time();
    $fh = @fopen($file, 'c+');
    if (!$fh) return false;
    flock($fh, LOCK_EX);
    $all = json_decode((string)stream_get_contents($fh), true) ?: [];
    foreach ($all as $k => $times) {
        $all[$k] = array_values(array_filter($times, fn($t) => $now - $t < $cfg['rate_window']));
        if (!$all[$k]) unset($all[$k]);
    }
    $limited = count($all[$ip] ?? []) >= $cfg['rate_max'];
    if (!$limited) $all[$ip][] = $now;
    ftruncate($fh, 0); rewind($fh);
    fwrite($fh, json_encode($all));
    flock($fh, LOCK_UN); fclose($fh);
    return $limited;
}
if (rate_limited($cfg, $dataDir)) reply(429, ['error' => 'Too many messages. Try again in a few minutes.']);

// ---- Read and validate ----
function len(string $s): int {   // character count, works with or without mbstring
    return function_exists('mb_strlen') ? mb_strlen($s, 'UTF-8') : (int)preg_match_all('/./su', $s);
}
$raw = file_get_contents('php://input', false, null, 0, 10241);
if ($raw === false || strlen($raw) > 10240) reply(413, ['error' => 'Message is too large.']);
$b = json_decode($raw, true);
if (!is_array($b)) reply(400, ['error' => 'Invalid request.']);
if (!empty($b['website'])) reply(201, ['ok' => true]);   // hidden trap field: bots fill it in, people don't

$get = fn(string $k): string => isset($b[$k]) && is_string($b[$k]) ? trim($b[$k]) : '';
$name = $get('name'); $location = $get('location'); $email = $get('email'); $message = $get('message');
$subscribe = ($b['subscribe'] ?? false) === true;

$errors = [];
if ($name === '') $errors['name'] = 'Enter your name.';
elseif (len($name) > 100) $errors['name'] = 'Name is too long.';
if ($location === '') $errors['location'] = 'Enter your location.';
elseif (len($location) > 100) $errors['location'] = 'Location is too long.';
if ($email === '') $errors['email'] = 'Enter your email address.';
elseif (strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) $errors['email'] = 'Enter a valid email address.';
if ($message === '') $errors['message'] = 'Write a message.';
elseif (len($message) > 2000) $errors['message'] = 'Message must be under 2000 characters.';
if ($errors) reply(400, ['error' => 'Check the form.', 'fields' => $errors]);

// ---- Save a copy ----
$record = [
    'id' => bin2hex(random_bytes(8)), 'receivedAt' => gmdate('c'),
    'name' => $name, 'location' => $location, 'email' => $email,
    'message' => $message, 'subscribe' => $subscribe,
];
$saved = @file_put_contents($dataDir . '/messages.jsonl',
    json_encode($record, JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX) !== false;

// ---- Email ----
function clean(string $s): string { return trim(preg_replace('/[\r\n]+/', ' ', $s)); }
function enc(string $s): string { return '=?UTF-8?B?' . base64_encode($s) . '?='; }

function smtp_expect($fp, array $codes): string {
    $resp = '';
    while (($line = fgets($fp, 515)) !== false) {
        $resp .= $line;
        if (strlen($line) < 4 || $line[3] !== '-') break;   // last line of reply
    }
    if (!in_array((int)substr($resp, 0, 3), $codes, true)) throw new RuntimeException('SMTP: ' . trim($resp));
    return $resp;
}
function smtp_cmd($fp, string $cmd, array $codes): string {
    fwrite($fp, $cmd . "\r\n");
    return smtp_expect($fp, $codes);
}

function send_mail(array $cfg, array $r): void {
    $subject = 'Shivoham website: message from ' . clean($r['name']);
    $text = "Name: {$r['name']}\nLocation: {$r['location']}\nEmail: {$r['email']}\n"
          . 'Newsletter: ' . ($r['subscribe'] ? 'Yes' : 'No') . "\n\n" . $r['message'] . "\n";
    $headers = [
        'From: ' . enc('Website form') . ' <' . $cfg['smtp_user'] . '>',
        'To: <' . $cfg['mail_to'] . '>',
        'Reply-To: ' . enc(clean($r['name'])) . ' <' . $r['email'] . '>',
        'Subject: ' . enc($subject),
        'Date: ' . date('r'),
        'Message-ID: <' . bin2hex(random_bytes(8)) . '@' . (explode('@', $cfg['smtp_user'])[1] ?? 'localhost') . '>',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
    ];
    $body = chunk_split(base64_encode($text), 76, "\r\n");

    // No SMTP password set: fall back to PHP's built-in mail().
    if ($cfg['smtp_pass'] === '') {
        $h = implode("\r\n", [$headers[0], $headers[2], $headers[4], $headers[5], $headers[6], $headers[7], $headers[8]]);
        if (!mail($cfg['mail_to'], enc($subject), $body, $h)) throw new RuntimeException('mail() failed');
        return;
    }

    $port = (int)$cfg['smtp_port'];
    $ssl = $port === 465;
    $fp = @stream_socket_client(($ssl ? 'ssl://' : 'tcp://') . $cfg['smtp_host'] . ':' . $port, $en, $es, 15);
    if (!$fp) throw new RuntimeException("SMTP connect failed: $es");
    stream_set_timeout($fp, 15);
    try {
        smtp_expect($fp, [220]);
        smtp_cmd($fp, 'EHLO ' . ($_SERVER['SERVER_NAME'] ?? 'localhost'), [250]);
        if (!$ssl) {
            smtp_cmd($fp, 'STARTTLS', [220]);
            if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) throw new RuntimeException('STARTTLS failed');
            smtp_cmd($fp, 'EHLO ' . ($_SERVER['SERVER_NAME'] ?? 'localhost'), [250]);
        }
        smtp_cmd($fp, 'AUTH LOGIN', [334]);
        smtp_cmd($fp, base64_encode($cfg['smtp_user']), [334]);
        smtp_cmd($fp, base64_encode($cfg['smtp_pass']), [235]);
        smtp_cmd($fp, 'MAIL FROM:<' . $cfg['smtp_user'] . '>', [250]);
        smtp_cmd($fp, 'RCPT TO:<' . $cfg['mail_to'] . '>', [250, 251]);
        smtp_cmd($fp, 'DATA', [354]);
        smtp_cmd($fp, implode("\r\n", $headers) . "\r\n\r\n" . $body . '.', [250]);
        @smtp_cmd($fp, 'QUIT', [221]);
    } finally {
        fclose($fp);
    }
}

$mailed = true;
try { send_mail($cfg, $record); }
catch (Throwable $e) { $mailed = false; error_log('Say hello form email failed: ' . $e->getMessage()); }

if (!$saved && !$mailed) reply(500, ['error' => 'Could not send your message. Please try again later.']);
reply(201, ['ok' => true, 'subscribed' => $subscribe]);
