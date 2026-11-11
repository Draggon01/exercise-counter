-- One-time links to set a new password, created by an admin (app.admins). Only the SHA-256 hash of the
-- token is stored, so a database leak does not reveal usable links.
CREATE TABLE password_reset
(
    token_hash VARCHAR(64)  NOT NULL,
    username   VARCHAR(255) NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP    NOT NULL,
    expires_at TIMESTAMP    NOT NULL,
    CONSTRAINT pk_password_reset PRIMARY KEY (token_hash),
    CONSTRAINT fk_password_reset_user FOREIGN KEY (username) REFERENCES users (username) ON DELETE CASCADE
);
CREATE INDEX idx_password_reset_username ON password_reset (username);
