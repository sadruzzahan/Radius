<?php
declare(strict_types=1);
require_once __DIR__.'/config.php';

function db(): PDO {
    static $pdo=null;
    if($pdo instanceof PDO) return $pdo;
    $host=env_value('DB_HOST','127.0.0.1');$port=env_value('DB_PORT','3306');$name=env_value('DB_NAME','radius');$user=env_value('DB_USER','root');$pass=env_value('DB_PASSWORD','');
    $dsn="mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";
    $options=[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false];
    $sslMode=strtoupper((string)env_value('DB_SSL_MODE','DISABLED'));
    if($sslMode!=='DISABLED'){
        $caPath=env_value('DB_SSL_CA');
        if($caPath===null||!is_file($caPath)){error_log('Database TLS enabled but DB_SSL_CA is missing or unreadable.');http_response_code(503);exit('RADIUS cannot establish a verified database connection.');}
        $options[PDO::MYSQL_ATTR_SSL_CA]=$caPath;
        $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT]=true;
    }
    try{$pdo=new PDO($dsn,$user,$pass,$options);}catch(PDOException $e){error_log('Database connection failed: '.$e->getMessage());http_response_code(503);exit('RADIUS is temporarily unable to connect to its database.');}
    return $pdo;
}
