-- ========== TABELA DE USUÁRIOS ==========
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    age INTEGER CHECK (age >= 18 AND age <= 99),
    gender VARCHAR(20) CHECK (gender IN ('masculino', 'feminino', 'outro')),
    bio TEXT,
    city VARCHAR(100),
    photo_url TEXT,
    photos TEXT[], -- Array de URLs das fotos
    
    -- Preferências
    pref_gender VARCHAR(20),
    pref_age_min INTEGER DEFAULT 18,
    pref_age_max INTEGER DEFAULT 99,
    pref_distance INTEGER DEFAULT 50, -- km
    
    -- Localização
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- VIP
    is_premium BOOLEAN DEFAULT FALSE,
    premium_until TIMESTAMP,
    
    -- Limites diários (FREE)
    daily_likes INTEGER DEFAULT 0,
    daily_super_likes INTEGER DEFAULT 0,
    last_reset_date DATE DEFAULT CURRENT_DATE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Índices para performance
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_gender ON users(gender);
CREATE INDEX idx_users_city ON users(city);
CREATE INDEX idx_users_location ON users USING GIST(ll_to_earth(latitude, longitude));
CREATE INDEX idx_users_active ON users(is_active);


-- ========== TABELA DE LIKES ==========
CREATE TABLE likes (
    id BIGSERIAL PRIMARY KEY,
    from_user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    to_user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) CHECK (type IN ('like', 'superlike', 'dislike')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Não pode dar like duplicado
    UNIQUE(from_user_id, to_user_id)
);

-- Índices
CREATE INDEX idx_likes_from ON likes(from_user_id);
CREATE INDEX idx_likes_to ON likes(to_user_id);
CREATE INDEX idx_likes_type ON likes(type);


-- ========== TABELA DE MATCHES ==========
CREATE TABLE matches (
    id BIGSERIAL PRIMARY KEY,
    user1_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    user2_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Garante que não tenha match duplicado
    UNIQUE(user1_id, user2_id),
    
    -- Garante que user1_id < user2_id (ordem consistente)
    CHECK (user1_id < user2_id)
);

-- Índices
CREATE INDEX idx_matches_user1 ON matches(user1_id);
CREATE INDEX idx_matches_user2 ON matches(user2_id);
CREATE INDEX idx_matches_active ON matches(is_active);


-- ========== TABELA DE MENSAGENS ==========
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    match_id BIGINT REFERENCES matches(id) ON DELETE CASCADE,
    sender_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_messages_match ON messages(match_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);


-- ========== TABELA DE BOOSTS ==========
CREATE TABLE boosts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Índices
CREATE INDEX idx_boosts_user ON boosts(user_id);
CREATE INDEX idx_boosts_active ON boosts(is_active, expires_at);


-- ========== TABELA DE PAGAMENTOS ==========
CREATE TABLE payments (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    plan VARCHAR(50) NOT NULL, -- 'premium_monthly', 'boost_1h', etc
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'BRL',
    payment_method VARCHAR(50), -- 'telegram_stars', 'pix', etc
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed
    telegram_payment_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Índices
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);


-- ========== VIEWS ÚTEIS ==========

-- View de perfis completos
CREATE VIEW user_profiles AS
SELECT 
    u.id,
    u.telegram_id,
    u.name,
    u.age,
    u.gender,
    u.bio,
    u.city,
    u.photo_url,
    u.photos,
    u.is_premium,
    u.last_active,
    (SELECT COUNT(*) FROM likes WHERE to_user_id = u.id AND type IN ('like', 'superlike')) as likes_received,
    (SELECT COUNT(*) FROM matches WHERE user1_id = u.id OR user2_id = u.id) as total_matches
FROM users u
WHERE u.is_active = TRUE;


-- View de matches com últimas mensagens
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
WHERE m.is_active = TRUE;


-- ========== FUNÇÕES ÚTEIS ==========

-- Função para resetar likes diários
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


-- Função para verificar match
CREATE OR REPLACE FUNCTION check_match(user1 BIGINT, user2 BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    has_mutual_like BOOLEAN;
BEGIN
    -- Verifica se ambos deram like um no outro
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


-- Função para criar match automaticamente
CREATE OR REPLACE FUNCTION auto_create_match()
RETURNS TRIGGER AS $$
DECLARE
    smaller_id BIGINT;
    larger_id BIGINT;
BEGIN
    -- Verifica se formou match
    IF check_match(NEW.from_user_id, NEW.to_user_id) THEN
        -- Garante ordem consistente (user1_id < user2_id)
        IF NEW.from_user_id < NEW.to_user_id THEN
            smaller_id := NEW.from_user_id;
            larger_id := NEW.to_user_id;
        ELSE
            smaller_id := NEW.to_user_id;
            larger_id := NEW.from_user_id;
        END IF;
        
        -- Cria o match (ignora se já existir)
        INSERT INTO matches (user1_id, user2_id)
        VALUES (smaller_id, larger_id)
        ON CONFLICT (user1_id, user2_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para criar match automaticamente
CREATE TRIGGER trigger_auto_match
AFTER INSERT ON likes
FOR EACH ROW
WHEN (NEW.type IN ('like', 'superlike'))
EXECUTE FUNCTION auto_create_match();


-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para users
CREATE TRIGGER trigger_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();


-- ========== DADOS DE TESTE ==========

-- Inserir usuários de exemplo (REMOVER EM PRODUÇÃO)
INSERT INTO users (telegram_id, name, age, gender, bio, city, photo_url, photos) VALUES
(1001, 'Brenda', 26, 'feminino', 'Amo viajar e conhecer lugares novos ✈️', 'São Paulo', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=500', ARRAY['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=500']),
(1002, 'Lucas', 28, 'masculino', 'Aventureiro nas horas vagas 🏔️', 'São Paulo', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=500', ARRAY['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=500']),
(1003, 'Amanda', 24, 'feminino', 'Amante de café e livros ☕📚', 'Rio de Janeiro', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=500', ARRAY['https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=500']),
(1004, 'Rafael', 30, 'masculino', 'Designer gráfico | Música é vida 🎵', 'São Paulo', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=500', ARRAY['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=500']);


-- ========== COMENTÁRIOS IMPORTANTES ==========

/*
SEGURANÇA:
- Use sempre prepared statements na API
- Valide TODOS os inputs
- Implemente rate limiting
- Use HTTPS obrigatório
- Nunca exponha IDs de Telegram diretamente

PERFORMANCE:
- Todos os índices críticos estão criados
- Use EXPLAIN ANALYZE para queries complexas
- Configure connection pooling no Node.js
- Considere cache (Redis) para dados frequentes

ESCALABILIDADE:
- Railway suporta até 500MB no plano grátis
- Migre para plano pago quando crescer
- Considere sharding por região/cidade

BACKUP:
- Railway faz backup automático
- Configure backups adicionais para segurança
*/
