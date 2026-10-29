<?php
// Edit these values. This file is blocked from web access by .htaccess.
return [
    // Where the notification emails go (your inbox).
    'mail_to'   => 'nanda@shivoham.ch',

    // The mailbox (hPanel > Emails) that sends the notifications. Change it if this
    // address is not hosted on Hostinger.
    'smtp_user' => 'nanda@shivoham.ch',
    'smtp_pass' => 'Goal731..',                    // that mailbox's password
    'smtp_host' => 'smtp.hostinger.com',
    'smtp_port' => 465,                   // 465 = SSL, 587 = STARTTLS

    // Rate limit per visitor IP.
    'rate_max'    => 5,
    'rate_window' => 600,                 // seconds
];
