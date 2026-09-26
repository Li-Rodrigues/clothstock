-- database/migrations/001-viewer-role.sql
--
-- Adiciona o perfil VIEWER ao CHECK de role da tabela users.
--
-- POR QUE ESTA MIGRAÇÃO EXISTE
-- A tabela users foi criada com:
--     role VARCHAR(20) DEFAULT 'OPERATOR' CHECK (role IN ('ADMIN','OPERATOR'))
-- Como o CREATE TABLE usa IF NOT EXISTS, reexecutar database/schema.sql
-- NÃO altera a tabela que já existe: o CHECK antigo continuaria no lugar
-- e qualquer INSERT com role = 'VIEWER' seria recusado pelo PostgreSQL
-- com SQLSTATE 23514 (check_violation).
--
-- SEGURANÇA DA MIGRAÇÃO
-- - Nenhuma tabela é criada, alterada estruturalmente ou removida;
-- - Nenhuma linha é apagada, atualizada ou recriada;
-- - Nenhum dado de produto, fornecedor, categoria, marca ou movimentação
--   é tocado;
-- - Apenas a definição do CHECK é ampliada para aceitar o novo valor.
--
-- IDEMPOTÊNCIA
-- O bloco abaixo é uma no-op quando o CHECK já aceita VIEWER, então o
-- script pode ser executado quantas vezes for preciso.

DO $$
DECLARE
    restricao RECORD;
BEGIN
    -- 1. Remove apenas CHECKs da coluna role que ainda NÃO aceitam VIEWER.
    --    Nenhum outro CHECK (por exemplo, de NOT NULL) é tocado.
    FOR restricao IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'users'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%role%'
          AND pg_get_constraintdef(oid) NOT ILIKE '%VIEWER%'
    LOOP
        EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', restricao.conname);
        RAISE NOTICE 'Constraint % removido da tabela users.', restricao.conname;
    END LOOP;

    -- 2. Recria o CHECKAmpliado apenas se não restou nenhum CHECK de role.
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'users'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%role%'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT users_role_check
            CHECK (role IN ('ADMIN', 'OPERATOR', 'VIEWER'));
        RAISE NOTICE 'Constraint users_role_check criado com ADMIN, OPERATOR e VIEWER.';
    END IF;
END $$;
