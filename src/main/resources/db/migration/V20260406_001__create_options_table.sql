CREATE TABLE options
(
    username      VARCHAR(255) NOT NULL,
    auto_collapse BOOLEAN      NOT NULL DEFAULT TRUE,
    CONSTRAINT pk_options PRIMARY KEY (username),
    CONSTRAINT fk_options_user FOREIGN KEY (username) REFERENCES users (username)
);
