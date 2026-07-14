global
    maxconn 2000

defaults
    log global
    mode tcp
    retries 2
    timeout client 30m
    timeout connect 4s
    timeout server 30m
    timeout check 5s

listen stats
    mode http
    bind *:7000
    stats enable
    stats uri /
    stats refresh 10s

listen postgres_write
    bind *:5000
    option httpchk GET /master
    http-check expect status 200
    default-server inter 3s fall 3 rise 2 on-marked-down shutdown-sessions
    server oti ${NODE1_IP}:5432 maxconn 200 check port 8008
    server ubuntu ${NODE2_IP}:5432 maxconn 200 check port 8008
    server laptop ${NODE3_IP}:5432 maxconn 200 check port 8008

listen postgres_read
    bind *:5001
    option httpchk GET /replica
    http-check expect status 200
    default-server inter 3s fall 3 rise 2 on-marked-down shutdown-sessions
    server oti ${NODE1_IP}:5432 maxconn 200 check port 8008
    server ubuntu ${NODE2_IP}:5432 maxconn 200 check port 8008
    server laptop ${NODE3_IP}:5432 maxconn 200 check port 8008
