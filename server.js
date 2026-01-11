// ========== IMPORTS ==========
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
require('dotenv').config();

const path = require('path');

const uploadRoutes = require('./upload');
const { requireTelegramAuth, optionalTelegramAuth } = require('./telegramAuth');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== CONFIGURAÇÃO DO BANCO ==========
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Testa conexão
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Erro ao conectar no banco:', err.stack);
    } else {
        console.log('✅ Conectado ao PostgreSQL!');
        release();
    }
});

// Exporta pool para usar nas rotas
global.pool = pool;

// ========== MIDDLEWARES ==========
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors({
    origin: '*',
    credentials: true
})); 
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api/', limiter);

// Logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ========== SERVIR FRONTEND ==========
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/perfil.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'perfil.html'));
});

app.get('/chat.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'chat.html'));
});

app.get('/likes.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'likes.html'));
});

// ========== ROTAS DE UPLOAD ==========
app.use('/api/upload', optionalTelegramAuth, uploadRoutes);

// ========== ROTAS DE USUÁRIOS ==========

// GET - Buscar perfil por Telegram ID (público)
app.get('/api/users/:telegramId', async (req, res) => {
    try {
        const { telegramId } = req.params;
        
        const result = await pool.query(
            'SELECT * FROM users WHERE telegram_id = $1',
            [telegramId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST - Criar ou atualizar usuário
app.post('/api/users', optionalTelegramAuth, async (req, res) => {
    try {
        const { 
            telegram_id,
            name, age, gender, bio, city, 
            photo_url, photos, pref_gender, pref_age_min, pref_age_max 
        } = req.body;
        
        // Pega telegram_id do auth ou do body
        const finalTelegramId = req.telegramUser?.telegram_id || telegram_id;
        
        if (!finalTelegramId) {
            return res.status(400).json({ error: 'telegram_id é obrigatório' });
        }
        
        // Validações
        if (!name || !age) {
            return res.status(400).json({ error: 'Campos obrigatórios: name, age' });
        }
        
        if (age < 18 || age > 99) {
            return res.status(400).json({ error: 'Idade deve estar entre 18 e 99' });
        }
        
        console.log('📝 Salvando usuário:', { telegram_id: finalTelegramId, name, age, gender });
        
        // Upsert
        const result = await pool.query(`
            INSERT INTO users (
                telegram_id, name, age, gender, bio, city, photo_url, photos,
                pref_gender, pref_age_min, pref_age_max, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
            ON CONFLICT (telegram_id) 
            DO UPDATE SET
                name = EXCLUDED.name,
                age = EXCLUDED.age,
                gender = EXCLUDED.gender,
                bio = EXCLUDED.bio,
                city = EXCLUDED.city,
                photo_url = EXCLUDED.photo_url,
                photos = EXCLUDED.photos,
                pref_gender = EXCLUDED.pref_gender,
                pref_age_min = EXCLUDED.pref_age_min,
                pref_age_max = EXCLUDED.pref_age_max,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `, [
            finalTelegramId, name, age, gender || 'feminino', bio, city, photo_url, 
            photos, pref_gender || 'masculino', pref_age_min || 18, pref_age_max || 99
        ]);
        
        console.log('✅ Usuário salvo:', result.rows[0].id);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao salvar usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET - Buscar perfis para swipe
app.get('/api/users/:telegramId/discover', optionalTelegramAuth, async (req, res) => {
    try {
        const { telegramId } = req.params;
        const { limit = 10 } = req.query;
        
        // Pega telegram_id do auth ou do parâmetro
        const finalTelegramId = req.telegramUser?.telegram_id || telegramId;
        
        console.log('🔍 Buscando perfis para:', finalTelegramId);
        
        // Busca usuário atual
        const userResult = await pool.query(
            'SELECT * FROM users WHERE telegram_id = $1',
            [finalTelegramId]
        );
        
        if (userResult.rows.length === 0) {
            console.log('⚠️ Usuário não encontrado, retornando todos os perfis');
            // Se usuário não existe, retorna perfis genéricos
            const genericResult = await pool.query(`
                SELECT * FROM users 
                WHERE is_active = TRUE 
                ORDER BY RANDOM() 
                LIMIT $1
            `, [parseInt(limit)]);
            
            return res.json(genericResult.rows);
        }
        
        const user = userResult.rows[0];
        console.log('👤 Usuário encontrado:', user.name, '| Preferência:', user.pref_gender);
        
        // Monta query baseada nas preferências
        let query;
        let params;
        
        if (user.pref_gender === 'todos' || !user.pref_gender) {
            // Se quer ver todos os gêneros
            query = `
                SELECT u.* 
                FROM users u
                WHERE u.id != $1
                  AND u.is_active = TRUE
                  AND u.age BETWEEN $2 AND $3
                  AND u.id NOT IN (
                      SELECT to_user_id FROM likes WHERE from_user_id = $1
                  )
                ORDER BY RANDOM()
                LIMIT $4
            `;
            params = [
                user.id,
                user.pref_age_min || 18,
                user.pref_age_max || 99,
                parseInt(limit)
            ];
        } else {
            // Se tem preferência de gênero específica
            query = `
                SELECT u.* 
                FROM users u
                WHERE u.id != $1
                  AND u.is_active = TRUE
                  AND u.gender = $2
                  AND u.age BETWEEN $3 AND $4
                  AND u.id NOT IN (
                      SELECT to_user_id FROM likes WHERE from_user_id = $1
                  )
                ORDER BY RANDOM()
                LIMIT $5
            `;
            params = [
                user.id,
                user.pref_gender,
                user.pref_age_min || 18,
                user.pref_age_max || 99,
                parseInt(limit)
            ];
        }
        
        const result = await pool.query(query, params);
        
        console.log('✅ Perfis encontrados:', result.rows.length);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar perfis:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ========== ROTAS DE LIKES ==========

// POST - Dar like/dislike
app.post('/api/likes', optionalTelegramAuth, async (req, res) => {
    try {
        const { to_telegram_id, type } = req.body;
        const from_telegram_id = req.telegramUser?.telegram_id || req.body.from_telegram_id;
        
        if (!from_telegram_id) {
            return res.status(400).json({ error: 'from_telegram_id é obrigatório' });
        }
        
        if (!['like', 'superlike', 'dislike'].includes(type)) {
            return res.status(400).json({ error: 'Tipo inválido' });
        }
        
        console.log('❤️ Like:', from_telegram_id, '->', to_telegram_id, '(', type, ')');
        
        // Busca IDs
        const fromUser = await pool.query(
            'SELECT id, is_premium, daily_likes, daily_super_likes FROM users WHERE telegram_id = $1',
            [from_telegram_id]
        );
        
        const toUser = await pool.query(
            'SELECT id FROM users WHERE telegram_id = $1',
            [to_telegram_id]
        );
        
        if (fromUser.rows.length === 0 || toUser.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        const from = fromUser.rows[0];
        const to = toUser.rows[0];
        
        // Verifica limites (apenas se não for premium)
        if (!from.is_premium) {
            if (type === 'like' && from.daily_likes >= 10) {
                return res.status(403).json({ 
                    error: 'Limite de likes atingido',
                    code: 'LIMIT_REACHED'
                });
            }
            
            if (type === 'superlike') {
                return res.status(403).json({ 
                    error: 'Super Like é recurso Premium',
                    code: 'PREMIUM_REQUIRED'
                });
            }
        }
        
        // Registra like
        const result = await pool.query(`
            INSERT INTO likes (from_user_id, to_user_id, type)
            VALUES ($1, $2, $3)
            ON CONFLICT (from_user_id, to_user_id) 
            DO UPDATE SET type = EXCLUDED.type
            RETURNING *
        `, [from.id, to.id, type]);
        
        // Atualiza contador (apenas para usuários não premium)
        if (type === 'like' && !from.is_premium) {
            await pool.query(
                'UPDATE users SET daily_likes = daily_likes + 1 WHERE id = $1',
                [from.id]
            );
        }
        
        // Verifica match
        const matchCheck = await pool.query(
            'SELECT check_match($1, $2) as has_match',
            [from.id, to.id]
        );
        
        const hasMatch = matchCheck.rows[0].has_match;
        
        console.log('✅ Like registrado! Match:', hasMatch);
        
        res.json({
            like: result.rows[0],
            match: hasMatch,
            remaining_likes: from.is_premium ? 'unlimited' : Math.max(0, 10 - from.daily_likes - 1)
        });
    } catch (error) {
        console.error('Erro ao dar like:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET - Buscar likes recebidos
app.get('/api/likes/received', optionalTelegramAuth, async (req, res) => {
    try {
        const telegram_id = req.telegramUser?.telegram_id || req.query.telegram_id;
        
        if (!telegram_id) {
            return res.status(400).json({ error: 'telegram_id é obrigatório' });
        }
        
        const userResult = await pool.query(
            'SELECT id, is_premium FROM users WHERE telegram_id = $1',
            [telegram_id]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        const user = userResult.rows[0];
        
        // Verifica se é premium (para ver likes)
        if (!user.is_premium) {
            return res.status(403).json({ 
                error: 'Recurso Premium',
                code: 'PREMIUM_REQUIRED'
            });
        }
        
        const result = await pool.query(`
            SELECT u.*, l.type, l.created_at as liked_at
            FROM likes l
            JOIN users u ON l.from_user_id = u.id
            WHERE l.to_user_id = $1
              AND l.type IN ('like', 'superlike')
            ORDER BY l.created_at DESC
        `, [user.id]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Erro:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// ========== ROTAS DE MATCHES ==========

// GET - Matches do usuário
app.get('/api/matches', optionalTelegramAuth, async (req, res) => {
    try {
        const telegram_id = req.telegramUser?.telegram_id || req.query.telegram_id;
        
        if (!telegram_id) {
            return res.status(400).json({ error: 'telegram_id é obrigatório' });
        }
        
        const userResult = await pool.query(
            'SELECT id FROM users WHERE telegram_id = $1',
            [telegram_id]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        const userId = userResult.rows[0].id;
        
        const result = await pool.query(`
            SELECT * FROM matches_with_last_message
            WHERE user1_id = $1 OR user2_id = $1
            ORDER BY last_message_at DESC
        `, [userId]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Erro:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// ========== ROTAS DE CHAT ==========

// GET - Mensagens
app.get('/api/matches/:matchId/messages', optionalTelegramAuth, async (req, res) => {
    try {
        const { matchId } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        
        const result = await pool.query(`
            SELECT m.*, u.name as sender_name, u.photo_url as sender_photo
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.match_id = $1
            ORDER BY m.created_at DESC
            LIMIT $2 OFFSET $3
        `, [matchId, limit, offset]);
        
        res.json(result.rows.reverse());
    } catch (error) {
        console.error('Erro:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// POST - Enviar mensagem
app.post('/api/matches/:matchId/messages', optionalTelegramAuth, async (req, res) => {
    try {
        const { matchId } = req.params;
        const { content, telegram_id } = req.body;
        const final_telegram_id = req.telegramUser?.telegram_id || telegram_id;
        
        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Mensagem vazia' });
        }
        
        if (!final_telegram_id) {
            return res.status(400).json({ error: 'telegram_id é obrigatório' });
        }
        
        const senderResult = await pool.query(
            'SELECT id FROM users WHERE telegram_id = $1',
            [final_telegram_id]
        );
        
        if (senderResult.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        const senderId = senderResult.rows[0].id;
        
        const result = await pool.query(`
            INSERT INTO messages (match_id, sender_id, content)
            VALUES ($1, $2, $3)
            RETURNING *
        `, [matchId, senderId, content.trim()]);
        
        await pool.query(
            'UPDATE matches SET last_message_at = CURRENT_TIMESTAMP WHERE id = $1',
            [matchId]
        );
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// ========== HEALTH CHECK ==========
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    } catch (error) {
        res.status(500).json({ status: 'error', error: error.message });
    }
});

// ========== DEBUG - Listar usuários ==========
app.get('/api/debug/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, telegram_id, name, age, gender, pref_gender, is_active FROM users ORDER BY id');
        res.json({
            count: result.rows.length,
            users: result.rows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== ERROR HANDLERS ==========
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Algo deu errado!' });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
});

// ========== INICIAR ==========
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});
