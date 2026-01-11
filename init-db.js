// ========== SCRIPT PARA INICIALIZAR O BANCO ==========
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDatabase() {
    try {
        console.log('🚀 Iniciando criação do banco de dados...\n');

        // 1. Criar tabela de usuários
        console.log('📝 Criando tabela users...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id BIGSERIAL PRIMARY KEY,
                telegram_id BIGINT UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                age INTEGER CHECK (age >= 18 AND age <= 99),
                gender VARCHAR(20) CHECK (gender IN ('masculino', 'feminino', 'outro')),
                bio TEXT,
                city VARCHAR(100),
                photo_url TEXT,
                photos TEXT[],
                
                pref_gender VARCHAR(20),
                pref_age_min INTEGER DEFAULT 18,
                pref_age_max INTEGER DEFAULT 99,
                pref_distance INTEGER DEFAULT 50,
                
                latitude DECIMAL(10, 8),
                longitude DECIMAL(11, 8),
                
                is_premium BOOLEAN DEFAULT FALSE,
                premium_until TIMESTAMP,
                
                daily_likes INTEGER DEFAULT 0,
                daily_super_likes INTEGER DEFAULT 0,
                last_reset_date DATE DEFAULT CURRENT_DATE,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE
            )
        `);
        console.log('✅ Tabela users criada!\n');

        // 2. Criar índices para users
        console.log('📝 Criando índices para users...');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_users_gender ON users(gender)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_users_city ON users(city)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active)');
        console.log('✅ Índices criados!\n');

        // 3. Criar tabela de likes
        console.log('📝 Criando tabela likes...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS likes (
                id BIGSERIAL PRIMARY KEY,
                from_user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
                to_user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
                type VARCHAR(20) CHECK (type IN ('like', 'superlike', 'dislike')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(from_user_id, to_user_id)
            )
        `);
        console.log('✅ Tabela likes criada!\n');

        // 4. Índices para likes
        console.log('📝 Criando índices para likes...');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_likes_from ON likes(from_user_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_likes_to ON likes(to_user_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_likes_type ON likes(type)');
        console.log('✅ Índices criados!\n');

        // 5. Criar tabela de matches
        console.log('📝 Criando tabela matches...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS matches (
                id BIGSERIAL PRIMARY KEY,
                user1_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
                user2_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE,
                UNIQUE(user1_id, user2_id),
                CHECK (user1_id < user2_id)
            )
        `);
        console.log('✅ Tabela matches criada!\n');

        // 6. Índices para matches
        console.log('📝 Criando índices para matches...');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_matches_user1 ON matches(user1_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_matches_user2 ON matches(user2_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_matches_active ON matches(is_active)');
        console.log('✅ Índices criados!\n');

        // 7. Criar tabela de mensagens
        console.log('📝 Criando tabela messages...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id BIGSERIAL PRIMARY KEY,
                match_id BIGINT REFERENCES matches(id) ON DELETE CASCADE,
                sender_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tabela messages criada!\n');

        // 8. Índices para messages
        console.log('📝 Criando índices para messages...');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_messages_match ON messages(match_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)');
        console.log('✅ Índices criados!\n');

        // 9. Criar função check_match
        console.log('📝 Criando função check_match...');
        await pool.query(`
            CREATE OR REPLACE FUNCTION check_match(user1 BIGINT, user2 BIGINT)
            RETURNS BOOLEAN AS $$
            DECLARE
                has_mutual_like BOOLEAN;
            BEGIN
                SELECT EXISTS (
                    SELECT 1 
                    FROM likes l1
                    JOIN likes l2 ON l1.from_user_id = l2.to_user_id 
                                 AND l1.to_user_id = l2.from_user_id
                    WHERE l1.from_user_id = user1 
                      AND l1.to_user_id = user2
                      AND l1.type IN ('like', 'superlike')
                      AND l2.type IN ('like', 'superlike')
                ) INTO has_mutual_like;
                
                RETURN has_mutual_like;
            END;
            $$ LANGUAGE plpgsql;
        `);
        console.log('✅ Função check_match criada!\n');

        // 10. Criar função auto_create_match
        console.log('📝 Criando função auto_create_match...');
        await pool.query(`
            CREATE OR REPLACE FUNCTION auto_create_match()
            RETURNS TRIGGER AS $$
            DECLARE
                smaller_id BIGINT;
                larger_id BIGINT;
            BEGIN
                IF check_match(NEW.from_user_id, NEW.to_user_id) THEN
                    IF NEW.from_user_id < NEW.to_user_id THEN
                        smaller_id := NEW.from_user_id;
                        larger_id := NEW.to_user_id;
                    ELSE
                        smaller_id := NEW.to_user_id;
                        larger_id := NEW.from_user_id;
                    END IF;
                    
                    INSERT INTO matches (user1_id, user2_id)
                    VALUES (smaller_id, larger_id)
                    ON CONFLICT (user1_id, user2_id) DO NOTHING;
                END IF;
                
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);
        console.log('✅ Função auto_create_match criada!\n');

        // 11. Criar trigger para match automático
        console.log('📝 Criando trigger para match...');
        await pool.query(`DROP TRIGGER IF EXISTS trigger_auto_match ON likes`);
        await pool.query(`
            CREATE TRIGGER trigger_auto_match
            AFTER INSERT ON likes
            FOR EACH ROW
            WHEN (NEW.type IN ('like', 'superlike'))
            EXECUTE FUNCTION auto_create_match()
        `);
        console.log('✅ Trigger criado!\n');

        // 12. Criar view matches_with_last_message
        console.log('📝 Criando view matches_with_last_message...');
        await pool.query(`DROP VIEW IF EXISTS matches_with_last_message`);
        await pool.query(`
            CREATE VIEW matches_with_last_message AS
            SELECT 
                m.id as match_id,
                m.user1_id,
                m.user2_id,
                m.created_at as matched_at,
                m.last_message_at,
                msg.content as last_message,
                msg.sender_id as last_sender_id,
                u1.name as user1_name,
                u1.photo_url as user1_photo,
                u2.name as user2_name,
                u2.photo_url as user2_photo
            FROM matches m
            LEFT JOIN LATERAL (
                SELECT content, sender_id 
                FROM messages 
                WHERE match_id = m.id 
                ORDER BY created_at DESC 
                LIMIT 1
            ) msg ON TRUE
            JOIN users u1 ON m.user1_id = u1.id
            JOIN users u2 ON m.user2_id = u2.id
            WHERE m.is_active = TRUE
        `);
        console.log('✅ View criada!\n');

        // 13. Função reset_daily_limits
        console.log('📝 Criando função reset_daily_limits...');
        await pool.query(`
            CREATE OR REPLACE FUNCTION reset_daily_limits()
            RETURNS void AS $$
            BEGIN
                UPDATE users
                SET 
                    daily_likes = 0,
                    daily_super_likes = 0,
                    last_reset_date = CURRENT_DATE
                WHERE last_reset_date < CURRENT_DATE;
            END;
            $$ LANGUAGE plpgsql;
        `);
        console.log('✅ Função reset_daily_limits criada!\n');

        console.log('🎉 ========================================');
        console.log('🎉 BANCO DE DADOS CRIADO COM SUCESSO!');
        console.log('🎉 ========================================\n');

    } catch (error) {
        console.error('❌ Erro ao criar banco:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Executa
initDatabase()
    .then(() => {
        console.log('✅ Script finalizado!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Falha:', error);
        process.exit(1);
    });
