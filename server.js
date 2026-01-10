// ========== IMPORTS ==========
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
require('dotenv').config();

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

// ========== MIDDLEWARES ==========
app.use(helmet()); // Segurança
app.use(cors()); // CORS
app.use(express.json()); // Parse JSON
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100 // 100 requests por IP
});
app.use('/api/', limiter);

// Logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ========== ROTAS DE USUÁRIOS ==========

// GET - Buscar perfil por Telegram ID
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
app.post('/api/users', async (req, res) => {
    try {
        const { 
            telegram_id, name, age, gender, bio, city, 
            photo_url, photos, pref_gender, pref_age_min, pref_age_max 
        } = req.body;
        
        // Validações
        if (!telegram_id || !name || !age) {
            return res.status(400).json({ error: 'Campos obrigatórios: telegram_id, name, age' });
        }
        
        if (age < 18 || age > 99) {
            return res.status(400).json({ error: 'Idade deve estar entre 18 e 99' });
        }
        
        // Upsert (insert ou update)
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
            telegram_id, name, age, gender, bio, city, photo_url, 
            photos, pref_gender, pref_age_min, pref_age_max
        ]);
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao salvar usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET - Buscar perfis para swipe
app.get('/api/users/:telegramId/discover', async (req, res) => {
    try {
        const { telegramId } = req.params;
        const { limit = 10 } = req.query;
        
        // Busca usuário atual
        const userResult = await pool.query(
            'SELECT * FROM users WHERE telegram_id = $1',
            [telegramId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        const user = userResult.rows[0];
        
        // Busca perfis compatíveis (que o usuário ainda não viu)
        const result = await pool.query(`
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
        `, [
            user.id,
            user.pref_gender || 'feminino',
            user.pref_age_min || 18,
            user.pref_age_max || 99,
            parseInt(limit)
        ]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar perfis:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ========== ROTAS DE LIKES ==========

// POST - Dar like/dislike
app.post('/api/likes', async (req, res) => {
    try {
        const { from_telegram_id, to_telegram_id, type } = req.body;
        
        if (!['like', 'superlike', 'dislike'].includes(type)) {
            return res.status(400).json({ error: 'Tipo inválido. Use: like, superlike ou dislike' });
        }
        
        // Busca IDs dos usuários
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
        
        // Verifica limites (apenas para FREE)
        if (!from.is_premium) {
            if (type === 'like' && from.daily_likes >= 10) {
                return res.status(403).json({ 
                    error: 'Limite de likes atingido',
                    code: 'LIMIT_REACHED',
                    limit: 10,
                    used: from.daily_likes
                });
            }
            
            if (type === 'superlike') {
                return res.status(403).json({ 
                    error: 'Super Like é recurso Premium',
                    code: 'PREMIUM_REQUIRED'
                });
            }
        }
        
        // Registra o like
        const result = await pool.query(`
            INSERT INTO likes (from_user_id, to_user_id, type)
            VALUES ($1, $2, $3)
            ON CONFLICT (from_user_id, to_user_id) 
            DO UPDATE SET type = EXCLUDED.type, created_at = CURRENT_TIMESTAMP
            RETURNING *
        `, [from.id, to.id, type]);
        
        // Atualiza contador (apenas para likes, não dislikes)
        if (type === 'like' && !from.is_premium) {
            await pool.query(
                'UPDATE users SET daily_likes = daily_likes + 1 WHERE id = $1',
                [from.id]
            );
        }
        
        // Verifica se formou match
        const matchCheck = await pool.query(
            'SELECT check_match($1, $2) as has_match',
            [from.id, to.id]
        );
        
        const hasMatch = matchCheck.rows[0].has_match;
        
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
app.get('/api/likes/received/:telegramId', async (req, res) => {
    try {
        const { telegramId } = req.params;
        
        // Busca usuário
        const userResult = await pool.query(
            'SELECT id, is_premium FROM users WHERE telegram_id = $1',
            [telegramId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        const user = userResult.rows[0];
        
        // Se não é premium, retorna bloqueado
        if (!user.is_premium) {
            return res.status(403).json({ 
                error: 'Recurso Premium',
                code: 'PREMIUM_REQUIRED',
                count: 0
            });
        }
        
        // Busca likes recebidos
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
        console.error('Erro ao buscar likes recebidos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ========== ROTAS DE MATCHES ==========

// GET - Buscar matches do usuário
app.get('/api/matches/:telegramId', async (req, res) => {
    try {
        const { telegramId } = req.params;
        
        const userResult = await pool.query(
            'SELECT id FROM users WHERE telegram_id = $1',
            [telegramId]
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
        console.error('Erro ao buscar matches:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ========== ROTAS DE CHAT ==========

// GET - Buscar mensagens de um match
app.get('/api/matches/:matchId/messages', async (req, res) => {
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
        
        res.json(result.rows.reverse()); // Mais antigas primeiro
    } catch (error) {
        console.error('Erro ao buscar mensagens:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST - Enviar mensagem
app.post('/api/matches/:matchId/messages', async (req, res) => {
    try {
        const { matchId } = req.params;
        const { sender_telegram_id, content } = req.body;
        
        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Mensagem não pode estar vazia' });
        }
        
        // Busca sender ID
        const senderResult = await pool.query(
            'SELECT id FROM users WHERE telegram_id = $1',
            [sender_telegram_id]
        );
        
        if (senderResult.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        const senderId = senderResult.rows[0].id;
        
        // Insere mensagem
        const result = await pool.query(`
            INSERT INTO messages (match_id, sender_id, content)
            VALUES ($1, $2, $3)
            RETURNING *
        `, [matchId, senderId, content.trim()]);
        
        // Atualiza last_message_at no match
        await pool.query(
            'UPDATE matches SET last_message_at = CURRENT_TIMESTAMP WHERE id = $1',
            [matchId]
        );
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ========== ROTAS DE ADMIN/UTILS ==========

// POST - Resetar limites diários (CRON JOB)
app.post('/api/admin/reset-limits', async (req, res) => {
    try {
        const { secret } = req.body;
        
        // Protege com secret key
        if (secret !== process.env.ADMIN_SECRET) {
            return res.status(401).json({ error: 'Não autorizado' });
        }
        
        await pool.query('SELECT reset_daily_limits()');
        
        res.json({ message: 'Limites resetados com sucesso' });
    } catch (error) {
        console.error('Erro ao resetar limites:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET - Health check
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    } catch (error) {
        res.status(500).json({ status: 'error', error: error.message });
    }
});

// ========== TRATAMENTO DE ERROS ==========
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Algo deu errado!' });
});

// 404
app.use((req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
});

// ========== INICIAR SERVIDOR ==========
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});
