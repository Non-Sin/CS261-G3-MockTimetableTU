CREATE TABLE items (
    id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    name        NVARCHAR(100) NOT NULL,
    description NVARCHAR(500) NULL,
    created_at  DATETIME2     NOT NULL,
    updated_at  DATETIME2     NOT NULL
);