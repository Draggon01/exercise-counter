-- Secrets the app generates once and keeps across restarts (e.g. the key that signs "stay logged in" cookies).
CREATE TABLE app_secret (
    name  VARCHAR(64)  PRIMARY KEY,
    value VARCHAR(128) NOT NULL
);
