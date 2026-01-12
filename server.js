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
        
        console.log('📝 Salvando usuário:', { telegram_id: finalTelegramId, name, age, gender, pref_gender });
        
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

// GET - Buscar perfis para swipe (COM COMPATIBILIDADE MÚTUA!)
app.get('/api/users/:telegramId/discover', optionalTelegramAuth, async (req, res) => {
    try {
        const { telegramId } = req.params;
        const { limit = 10 } = req.query;
        
        const finalTelegramId = req.telegramUser?.telegram_id || telegramId;
        
        console.log('🔍 Buscando perfis para:', finalTelegramId);
        
        // Busca usuário atual
        const userResult = await pool.query(
            'SELECT * FROM users WHERE telegram_id = $1',
            [finalTelegramId]
        );
        
        if (userResult.rows.length === 0) {
            console.log('⚠️ Usuário não encontrado');
            return res.json([]);
        }
        
        const user = userResult.rows[0];
        console.log('👤 Usuário:', user.name, '| Eu sou:', user.gender, '| Quero ver:', user.pref_gender);
        
        // 🔥 QUERY COM COMPATIBILIDADE MÚTUA!
        const query = `
            SELECT u.* 
            FROM users u
            WHERE u.id != $1
              AND u.is_active = TRUE
              
              -- 1️⃣ O gênero DELES é o que EU quero ver?
              AND (
                $2 = 'todos'
                OR u.gender = $2
              )
              
              -- 2️⃣ ELES querem ver o MEU gênero?
              AND (
                u.pref_gender = 'todos'
                OR u.pref_gender = $3
              )
              
              -- 3️⃣ A idade DELES está na faixa que EU quero?
              AND u.age BETWEEN $4 AND $5
              
              -- 4️⃣ A MINHA idade está na faixa que ELES querem?
              AND $6 BETWEEN u.pref_age_min AND u.pref_age_max
              
              -- 5️⃣ Não mostrar quem já dei like/dislike/superlike
              AND NOT EXISTS (
                  SELECT 1 FROM likes WHERE from_user_id = $1 AND to_user_id = u.id
              )
            ORDER BY RANDOM()
            LIMIT $7
        `;
        
        const params = [
            user.id,              // $1 - Meu ID
            user.pref_gender,     // $2 - Gênero que EU quero ver
            user.gender,          // $3 - MEU gênero
            user.pref_age_min || 18,  // $4 - Idade mínima que EU quero
            user.pref_age_max || 99,  // $5 - Idade máxima que EU quero
            user.age,             // $6 - MINHA idade
            parseInt(limit)       // $7 - Limite de resultados
        ];
        
        console.log('🔍 Params:', {
            'Meu ID': params[0],
            'Quero ver': params[1],
            'Eu sou': params[2],
            'Idade min/max que quero': `${params[3]}-${params[4]}`,
            'Minha idade': params[5],
            'Limit': params[6]
        });
        
        const result = await pool.query(query, params);
        
        console.log('✅ Perfis compatíveis encontrados:', result.rows.length);
        
        if (result.rows.length > 0) {
            console.log('📋 Perfis:');
            result.rows.forEach(profile => {
                console.log(`  - ${profile.name}: é ${profile.gender}, quer ver ${profile.pref_gender}`);
            });
        } else {
            console.log('❌ Nenhum perfil compatível encontrado');
        }
        
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar perfis:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ========== ROTAS DE LIKES ==========

// POST - Dar like/dislike (COM MATCH AUTOMÁTICO!)
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
            'SELECT id, name, is_premium, daily_likes, daily_super_likes FROM users WHERE telegram_id = $1',
            [from_telegram_id]
        );
        
        const toUser = await pool.query(
            'SELECT id, name FROM users WHERE telegram_id = $1',
            [to_telegram_id]
        );
        
        if (fromUser.rows.length === 0 || toUser.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        const from = fromUser.rows[0];
        const to = toUser.rows[0];
        
        console.log('👤 De:', from.name, '(ID:', from.id, ')');
        console.log('👤 Para:', to.name, '(ID:', to.id, ')');
        
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
            DO UPDATE SET type = EXCLUDED.type, created_at = CURRENT_TIMESTAMP
            RETURNING *
        `, [from.id, to.id, type]);
        
        console.log('✅ Like registrado no banco!', {
            like_id: result.rows[0].id,
            from_user_id: from.id,
            to_user_id: to.id,
            type: type
        });
        
        // Atualiza contador (apenas para usuários não premium)
        if (type === 'like' && !from.is_premium) {
            await pool.query(
                'UPDATE users SET daily_likes = daily_likes + 1 WHERE id = $1',
                [from.id]
            );
        }
        
        // 🔥 VERIFICA MATCH APENAS PARA LIKES/SUPERLIKES (não para dislikes!)
        if (type === 'like' || type === 'superlike') {
            console.log('🔍 Verificando se há match...');
            console.log('   Checando se ambos deram like:');
            console.log('   - User A (from):', from.id, 'deu', type, 'para User B (to):', to.id);
            console.log('   - Verificando se User B (to):', to.id, 'já deu like/superlike para User A (from):', from.id);
            
            const matchCheck = await pool.query(`
                SELECT COUNT(*) as mutual_likes
                FROM likes l1
                WHERE l1.from_user_id = $1 
                  AND l1.to_user_id = $2
                  AND l1.type IN ('like', 'superlike')
                  AND EXISTS (
                      SELECT 1 FROM likes l2
                      WHERE l2.from_user_id = $2
                        AND l2.to_user_id = $1
                        AND l2.type IN ('like', 'superlike')
                  )
            `, [from.id, to.id]);
            
            const hasMatch = parseInt(matchCheck.rows[0].mutual_likes) > 0;
            
            console.log('💕 Tem match?', hasMatch);
            
            // Debug adicional: verificar likes individuais
            const debugLikes = await pool.query(`
                SELECT from_user_id, to_user_id, type 
                FROM likes 
                WHERE (from_user_id = $1 AND to_user_id = $2)
                   OR (from_user_id = $2 AND to_user_id = $1)
            `, [from.id, to.id]);
            
            console.log('🔎 Likes entre os dois usuários:', debugLikes.rows);
            
            // Se tem match, cria na tabela matches
            if (hasMatch) {
                const smallerId = Math.min(from.id, to.id);
                const largerId = Math.max(from.id, to.id);
                
                console.log('🎉 CRIANDO MATCH!');
                console.log('   User1:', smallerId);
                console.log('   User2:', largerId);
                
                const matchResult = await pool.query(`
                    INSERT INTO matches (user1_id, user2_id)
                    VALUES ($1, $2)
                    ON CONFLICT (user1_id, user2_id) DO UPDATE
                    SET is_active = TRUE, last_message_at = CURRENT_TIMESTAMP
                    RETURNING *
                `, [smallerId, largerId]);
                
                console.log('✅ Match criado! ID:', matchResult.rows[0].id);
                
                res.json({
                    like: result.rows[0],
                    match: true,
                    match_id: matchResult.rows[0].id,
                    remaining_likes: from.is_premium ? 'unlimited' : Math.max(0, 10 - from.daily_likes - 1)
                });
            } else {
                console.log('💚 Like normal, sem match ainda');
                
                res.json({
                    like: result.rows[0],
                    match: false,
                    remaining_likes: from.is_premium ? 'unlimited' : Math.max(0, 10 - from.daily_likes - 1)
                });
            }
        } else {
            // Para dislikes, apenas retorna sucesso sem verificar match
            console.log('👎 Dislike registrado, sem verificação de match');
            
            res.json({
                like: result.rows[0],
                match: false,
                remaining_likes: from.is_premium ? 'unlimited' : Math.max(0, 10 - from.daily_likes)
            });
        }
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
        
        // 🔥 FILTRA USUÁRIOS QUE JÁ TEM MATCH ATIVO
        const result = await pool.query(`
            SELECT u.*, l.type, l.created_at as liked_at
            FROM likes l
            JOIN users u ON l.from_user_id = u.id
            WHERE l.to_user_id = $1
              AND l.type IN ('like', 'superlike')
              AND NOT EXISTS (
                  SELECT 1 FROM matches m
                  WHERE ((m.user1_id = $1 AND m.user2_id = u.id)
                     OR (m.user2_id = $1 AND m.user1_id = u.id))
                     AND m.is_active = TRUE
              )
            ORDER BY l.created_at DESC
        `, [user.id]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Erro:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// ========== ROTAS DE MATCHES ==========

// 🔥 GET - Matches do usuário (COM ÚLTIMA MENSAGEM!)
app.get('/api/matches', optionalTelegramAuth, async (req, res) => {
    try {
        const telegram_id = req.telegramUser?.telegram_id || req.query.telegram_id;
        
        if (!telegram_id) {
            return res.status(400).json({ error: 'telegram_id é obrigatório' });
        }
        
        console.log('🔍 Buscando matches para telegram_id:', telegram_id);
        
        const userResult = await pool.query(
            'SELECT id, name FROM users WHERE telegram_id = $1',
            [telegram_id]
        );
        
        if (userResult.rows.length === 0) {
            console.log('❌ Usuário não encontrado');
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        const userId = userResult.rows[0].id;
        const userName = userResult.rows[0].name;
        
        console.log('👤 Usuário encontrado:', userName, '(ID:', userId, ')');
        console.log('🔍 Buscando matches para user ID:', userId);
        
        // 🔥 Query COM última mensagem usando subquery
        const result = await pool.query(`
            SELECT 
                m.id as match_id,
                m.user1_id,
                m.user2_id,
                m.created_at as matched_at,
                m.last_message_at,
                m.is_active,
                u1.telegram_id as user1_telegram_id,
                u1.name as user1_name,
                u1.age as user1_age,
                u1.photo_url as user1_photo,
                u1.photos as user1_photos,
                u2.telegram_id as user2_telegram_id,
                u2.name as user2_name,
                u2.age as user2_age,
                u2.photo_url as user2_photo,
                u2.photos as user2_photos,
                last_msg.content as last_message_content,
                last_msg.sender_id as last_message_sender_id,
                last_msg.created_at as last_message_time
            FROM matches m
            JOIN users u1 ON m.user1_id = u1.id
            JOIN users u2 ON m.user2_id = u2.id
            LEFT JOIN LATERAL (
                SELECT content, sender_id, created_at
                FROM messages
                WHERE match_id = m.id
                ORDER BY created_at DESC
                LIMIT 1
            ) last_msg ON true
            WHERE (m.user1_id = $1 OR m.user2_id = $1)
              AND m.is_active = TRUE
            ORDER BY COALESCE(last_msg.created_at, m.created_at) DESC
        `, [userId]);
        
        console.log('✅ Matches encontrados:', result.rows.length);
        
        if (result.rows.length > 0) {
            console.log('📋 Matches:');
            result.rows.forEach(match => {
                const otherUser = match.user1_id === userId ? match.user2_name : match.user1_name;
                const lastMsg = match.last_message_content ? match.last_message_content.substring(0, 30) + '...' : 'Novo match!';
                console.log(`  - Match ID ${match.match_id}: ${userName} ↔️ ${otherUser} | Última: "${lastMsg}"`);
            });
        }
        
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Erro ao buscar matches:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// ========== ROTAS DE CHAT ==========

// GET - Mensagens (com suporte a polling via last_id)
app.get('/api/matches/:matchId/messages', optionalTelegramAuth, async (req, res) => {
    try {
        const { matchId } = req.params;
        const { limit = 50, offset = 0, after_id } = req.query;
        
        let query;
        let params;
        
        // 🔥 Se after_id foi passado, busca apenas mensagens mais novas (para polling)
        if (after_id) {
            query = `
                SELECT m.*, u.name as sender_name, u.photo_url as sender_photo
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                WHERE m.match_id = $1 AND m.id > $2
                ORDER BY m.created_at ASC
            `;
            params = [matchId, after_id];
        } else {
            query = `
                SELECT m.*, u.name as sender_name, u.photo_url as sender_photo
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                WHERE m.match_id = $1
                ORDER BY m.created_at DESC
                LIMIT $2 OFFSET $3
            `;
            params = [matchId, limit, offset];
        }
        
        const result = await pool.query(query, params);
        
        // Se não é polling, inverte para ordem cronológica
        const messages = after_id ? result.rows : result.rows.reverse();
        
        res.json(messages);
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


// ========== ADICIONE ESTA ROTA NO SEU server.js ==========
// Cole esta rota ANTES dos "ERROR HANDLERS" (antes da linha app.use((err, req, res, next) => {)

// GET - Contar likes recebidos (para usuários não-premium verem quantos likes têm)
app.get('/api/likes/count', optionalTelegramAuth, async (req, res) => {
    try {
        const telegram_id = req.telegramUser?.telegram_id || req.query.telegram_id;
        
        if (!telegram_id) {
            return res.status(400).json({ error: 'telegram_id é obrigatório' });
        }
        
        console.log('📊 Contando likes para:', telegram_id);
        
        const userResult = await pool.query(
            'SELECT id FROM users WHERE telegram_id = $1',
            [telegram_id]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        const userId = userResult.rows[0].id;
        
        // 🔥 CONTA LIKES RECEBIDOS (excluindo usuários com match ativo)
        const countResult = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE type = 'like') as likes,
                COUNT(*) FILTER (WHERE type = 'superlike') as superlikes,
                COUNT(*) as total
            FROM likes l
            WHERE l.to_user_id = $1 
              AND l.type IN ('like', 'superlike')
              AND NOT EXISTS (
                  SELECT 1 FROM matches m
                  WHERE ((m.user1_id = $1 AND m.user2_id = l.from_user_id)
                     OR (m.user2_id = $1 AND m.user1_id = l.from_user_id))
                     AND m.is_active = TRUE
              )
        `, [userId]);
        
        const counts = countResult.rows[0];
        
        console.log('✅ Contagem de likes:', counts);
        
        res.json({
            count: parseInt(counts.total) || 0,
            likes: parseInt(counts.likes) || 0,
            superlikes: parseInt(counts.superlikes) || 0
        });
        
    } catch (error) {
        console.error('❌ Erro ao contar likes:', error);
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

// ========== DEBUG - Resetar likes e matches ==========
app.get('/api/debug/reset-likes', async (req, res) => {
    try {
        console.log('🔄 Resetando likes e matches...');
        
        const likesResult = await pool.query('DELETE FROM likes');
        console.log('🗑️ Likes deletados:', likesResult.rowCount);
        
        const matchesResult = await pool.query('DELETE FROM matches');
        console.log('🗑️ Matches deletados:', matchesResult.rowCount);
        
        const usersResult = await pool.query('UPDATE users SET daily_likes = 0, daily_super_likes = 0');
        console.log('🔄 Contadores resetados:', usersResult.rowCount);
        
        res.json({
            success: true,
            message: 'Likes e matches resetados com sucesso!',
            deleted: {
                likes: likesResult.rowCount,
                matches: matchesResult.rowCount,
                users_updated: usersResult.rowCount
            }
        });
    } catch (error) {
        console.error('❌ Erro ao resetar:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== DEBUG - Resetar likes de um usuário específico ==========
app.get('/api/debug/reset-likes/:telegramId', async (req, res) => {
    try {
        const { telegramId } = req.params;
        
        console.log('🔄 Resetando likes do usuário:', telegramId);
        
        const userResult = await pool.query('SELECT id FROM users WHERE telegram_id = $1', [telegramId]);
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        const userId = userResult.rows[0].id;
        
        const likesResult = await pool.query('DELETE FROM likes WHERE from_user_id = $1', [userId]);
        console.log('🗑️ Likes deletados:', likesResult.rowCount);
        
        const matchesResult = await pool.query(
            'DELETE FROM matches WHERE user1_id = $1 OR user2_id = $1',
            [userId]
        );
        console.log('🗑️ Matches deletados:', matchesResult.rowCount);
        
        await pool.query('UPDATE users SET daily_likes = 0, daily_super_likes = 0 WHERE id = $1', [userId]);
        
        res.json({
            success: true,
            message: `Likes do usuário ${telegramId} resetados!`,
            deleted: {
                likes: likesResult.rowCount,
                matches: matchesResult.rowCount
            }
        });
    } catch (error) {
        console.error('❌ Erro ao resetar:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== DEBUG - RESET COMPLETO DOS 2 USUÁRIOS DE TESTE ==========
app.get('/api/debug/reset-my-test-users', async (req, res) => {
    try {
        const testUserIds = [8542013089, 1293602874];
        
        console.log('🔥 RESETANDO USUÁRIOS DE TESTE:', testUserIds);
        
        let result = {
            success: true,
            users_reset: [],
            likes_deleted: 0,
            matches_deleted: 0,
            profiles_cleaned: 0
        };
        
        for (const telegramId of testUserIds) {
            console.log('\n┌────────────────────────────────');
            console.log('🧹 Limpando usuário:', telegramId);
            
            const userResult = await pool.query(
                'SELECT id, name, daily_likes, daily_super_likes FROM users WHERE telegram_id = $1',
                [telegramId]
            );
            
            if (userResult.rows.length === 0) {
                console.log('⚠️ Usuário não encontrado no banco');
                result.users_reset.push({
                    telegram_id: telegramId,
                    status: 'not_found',
                    message: 'Usuário não existe no banco'
                });
                continue;
            }
            
            const userId = userResult.rows[0].id;
            const userName = userResult.rows[0].name;
            const oldLikes = userResult.rows[0].daily_likes;
            const oldSuperLikes = userResult.rows[0].daily_super_likes;
            
            console.log('👤 Encontrado:', userName, '(ID:', userId, ')');
            console.log('📊 Limites ANTES:', { daily_likes: oldLikes, daily_super_likes: oldSuperLikes });
            
            const likesResult = await pool.query(
                'DELETE FROM likes WHERE from_user_id = $1 OR to_user_id = $1',
                [userId]
            );
            console.log('🗑️ Likes deletados:', likesResult.rowCount);
            result.likes_deleted += likesResult.rowCount;
            
            const matchesResult = await pool.query(
                'DELETE FROM matches WHERE user1_id = $1 OR user2_id = $1',
                [userId]
            );
            console.log('🗑️ Matches deletados:', matchesResult.rowCount);
            result.matches_deleted += matchesResult.rowCount;
            
            const cleanResult = await pool.query(`
                UPDATE users SET
                    name = 'Usuário Teste',
                    bio = NULL,
                    city = NULL,
                    photo_url = NULL,
                    photos = NULL,
                    daily_likes = 0,
                    daily_super_likes = 0,
                    last_reset_date = CURRENT_DATE
                WHERE id = $1
                RETURNING name, daily_likes, daily_super_likes
            `, [userId]);
            
            console.log('🧹 Perfil limpo:', cleanResult.rows[0].name);
            console.log('🔄 Limites DEPOIS:', {
                daily_likes: cleanResult.rows[0].daily_likes,
                daily_super_likes: cleanResult.rows[0].daily_super_likes
            });
            result.profiles_cleaned++;
            
            result.users_reset.push({
                telegram_id: telegramId,
                user_id: userId,
                status: 'reset_success',
                old_name: userName,
                new_name: 'Usuário Teste',
                old_daily_likes: oldLikes,
                old_daily_super_likes: oldSuperLikes,
                daily_likes: cleanResult.rows[0].daily_likes,
                daily_super_likes: cleanResult.rows[0].daily_super_likes
            });
            
            console.log('✅ Usuário resetado com sucesso!');
        }
        
        console.log('\n┌────────────────────────────────');
        console.log('🎉 RESET COMPLETO!');
        console.log('└────────────────────────────────\n');
        
        res.json(result);
    } catch (error) {
        console.error('❌ Erro ao resetar:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== DEBUG - RESETAR APENAS OS LIMITES DOS USUÁRIOS DE TESTE ==========
app.get('/api/debug/reset-limits-only', async (req, res) => {
    try {
        const testUserIds = [8542013089, 1293602874];
        
        console.log('🔄 RESETANDO APENAS LIMITES DE:', testUserIds);
        
        let result = {
            success: true,
            users_updated: []
        };
        
        for (const telegramId of testUserIds) {
            console.log('\n┌────────────────────────────────');
            console.log('🔄 Resetando limites de:', telegramId);
            
            const userResult = await pool.query(`
                UPDATE users 
                SET 
                    daily_likes = 0,
                    daily_super_likes = 0,
                    last_reset_date = CURRENT_DATE
                WHERE telegram_id = $1
                RETURNING id, telegram_id, name, daily_likes, daily_super_likes, last_reset_date, is_premium
            `, [telegramId]);
            
            if (userResult.rows.length === 0) {
                console.log('⚠️ Usuário não encontrado:', telegramId);
                result.users_updated.push({
                    telegram_id: telegramId,
                    status: 'not_found'
                });
            } else {
                const user = userResult.rows[0];
                console.log('✅ Limites resetados:', user.name);
                console.log('📊 Novo status:', {
                    daily_likes: user.daily_likes,
                    daily_super_likes: user.daily_super_likes,
                    last_reset_date: user.last_reset_date,
                    is_premium: user.is_premium
                });
                
                result.users_updated.push({
                    telegram_id: user.telegram_id,
                    user_id: user.id,
                    name: user.name,
                    status: 'success',
                    daily_likes: user.daily_likes,
                    daily_super_likes: user.daily_super_likes,
                    last_reset_date: user.last_reset_date,
                    is_premium: user.is_premium
                });
            }
        }
        
        console.log('\n┌────────────────────────────────');
        console.log('🎉 LIMITES RESETADOS COM SUCESSO!');
        console.log('└────────────────────────────────\n');
        
        res.json(result);
    } catch (error) {
        console.error('❌ Erro ao resetar limites:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== DEBUG - VERIFICAR STATUS DOS LIMITES ==========
app.get('/api/debug/check-limits/:telegramId', async (req, res) => {
    try {
        const { telegramId } = req.params;
        
        console.log('🔍 Verificando limites de:', telegramId);
        
        const result = await pool.query(`
            SELECT 
                id,
                telegram_id,
                name,
                daily_likes,
                daily_super_likes,
                last_reset_date,
                is_premium,
                created_at,
                updated_at
            FROM users 
            WHERE telegram_id = $1
        `, [telegramId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Usuário não encontrado',
                telegram_id: telegramId 
            });
        }
        
        const user = result.rows[0];
        
        const maxLikes = user.is_premium ? Infinity : 10;
        const maxSuperLikes = user.is_premium ? 5 : 0;
        
        const remainingLikes = user.is_premium ? 'unlimited' : Math.max(0, maxLikes - user.daily_likes);
        const remainingSuperLikes = user.is_premium ? (maxSuperLikes - user.daily_super_likes) : 0;
        
        const response = {
            user: {
                id: user.id,
                telegram_id: user.telegram_id,
                name: user.name,
                is_premium: user.is_premium
            },
            limits: {
                daily_likes: {
                    used: user.daily_likes,
                    max: maxLikes,
                    remaining: remainingLikes
                },
                daily_super_likes: {
                    used: user.daily_super_likes,
                    max: maxSuperLikes,
                    remaining: remainingSuperLikes
                },
                last_reset_date: user.last_reset_date
            },
            status: {
                can_like: user.is_premium || user.daily_likes < maxLikes,
                can_super_like: user.is_premium && user.daily_super_likes < maxSuperLikes,
                needs_reset: user.last_reset_date < new Date().toISOString().split('T')[0]
            },
            timestamps: {
                created_at: user.created_at,
                updated_at: user.updated_at
            }
        };
        
        console.log('✅ Status do usuário:', response);
        
        res.json(response);
        
    } catch (error) {
        console.error('❌ Erro ao verificar limites:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== DEBUG - RESETAR LIKES DOS USUÁRIOS DE TESTE ==========
app.get('/api/debug/reset-test-users-likes', async (req, res) => {
    try {
        const testUserIds = [8542013089, 1293602874];
        
        console.log('🔄 Resetando likes entre usuários de teste...');
        
        let result = {
            success: true,
            likes_deleted: 0
        };
        
        const users = await pool.query(
            'SELECT id FROM users WHERE telegram_id = ANY($1)',
            [testUserIds]
        );
        
        if (users.rows.length < 2) {
            return res.status(404).json({ error: 'Usuários de teste não encontrados' });
        }
        
        const userIds = users.rows.map(u => u.id);
        
        const deleteLikes = await pool.query(`
            DELETE FROM likes 
            WHERE (from_user_id = ANY($1) AND to_user_id = ANY($1))
        `, [userIds]);
        
        result.likes_deleted = deleteLikes.rowCount;
        
        console.log('✅ Likes deletados:', result.likes_deleted);
        
        res.json(result);
    } catch (error) {
        console.error('❌ Erro:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== ADMIN: RESET LIKES ENTRE DOIS USUÁRIOS DE TESTE ==========
app.post('/api/admin/reset-likes-between-users', async (req, res) => {
    const { secret, telegram_id1, telegram_id2 } = req.body;

    if (secret !== process.env.ADMIN_SECRET) {
        return res.status(403).json({ error: 'Acesso negado' });
    }

    try {
        // Busca os user_ids dos telegram_ids
        const user1Result = await pool.query('SELECT id FROM users WHERE telegram_id = $1', [telegram_id1]);
        const user2Result = await pool.query('SELECT id FROM users WHERE telegram_id = $1', [telegram_id2]);

        if (user1Result.rows.length === 0 || user2Result.rows.length === 0) {
            return res.status(404).json({ error: 'Um ou mais usuários não encontrados' });
        }

        const user1Id = user1Result.rows[0].id;
        const user2Id = user2Result.rows[0].id;

        // Deleta likes mútuos
        const likesResult = await pool.query(`
            DELETE FROM likes 
            WHERE (from_user_id = $1 AND to_user_id = $2)
            OR (from_user_id = $2 AND to_user_id = $1)
        `, [user1Id, user2Id]);

        // Deleta matches relacionados
        const smallerId = Math.min(user1Id, user2Id);
        const largerId = Math.max(user1Id, user2Id);
        
        const matchesResult = await pool.query(`
            DELETE FROM matches 
            WHERE user1_id = $1 AND user2_id = $2
        `, [smallerId, largerId]);

        console.log('🧹 Likes resetados entre', telegram_id1, 'e', telegram_id2);
        console.log('   - Likes deletados:', likesResult.rowCount);
        console.log('   - Matches deletados:', matchesResult.rowCount);
        
        res.json({ 
            success: true, 
            likes_deleted: likesResult.rowCount,
            matches_deleted: matchesResult.rowCount
        });
    } catch (error) {
        console.error('❌ Erro ao resetar likes:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST - Ativar Premium (para testes ou após pagamento confirmado)
app.post('/api/users/:telegramId/premium', optionalTelegramAuth, async (req, res) => {
    try {
        const { telegramId } = req.params;
        const { action, duration_days = 30, secret } = req.body;
        
        // 🔒 SEGURANÇA: Em produção, valide o pagamento antes!
        // Por enquanto, aceita secret para testes
        const ADMIN_SECRET = process.env.ADMIN_SECRET || 'spark_admin_2024';
        
        if (secret !== ADMIN_SECRET) {
            // Em produção, aqui você validaria o pagamento PIX/Telegram Stars
            console.log('⚠️ Tentativa de ativar premium sem autorização');
            return res.status(403).json({ 
                error: 'Não autorizado',
                code: 'UNAUTHORIZED'
            });
        }
        
        console.log('💎 Requisição Premium:', { telegramId, action, duration_days });
        
        const userResult = await pool.query(
            'SELECT id, name, is_premium, premium_until FROM users WHERE telegram_id = $1',
            [telegramId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        const user = userResult.rows[0];
        
        if (action === 'activate') {
            // Calcula data de expiração
            const premiumUntil = new Date();
            premiumUntil.setDate(premiumUntil.getDate() + duration_days);
            
            const result = await pool.query(`
                UPDATE users 
                SET 
                    is_premium = TRUE,
                    premium_until = $1,
                    daily_likes = 0,
                    daily_super_likes = 0,
                    updated_at = CURRENT_TIMESTAMP
                WHERE telegram_id = $2
                RETURNING id, name, is_premium, premium_until
            `, [premiumUntil, telegramId]);
            
            console.log('✅ Premium ATIVADO para:', user.name);
            console.log('📅 Válido até:', premiumUntil);
            
            res.json({
                success: true,
                message: 'Premium ativado com sucesso!',
                user: {
                    id: result.rows[0].id,
                    name: result.rows[0].name,
                    is_premium: result.rows[0].is_premium,
                    premium_until: result.rows[0].premium_until
                },
                benefits: {
                    unlimited_likes: true,
                    super_likes_per_day: 5,
                    boosts_per_week: 1,
                    can_see_likes: true
                }
            });
            
        } else if (action === 'deactivate') {
            const result = await pool.query(`
                UPDATE users 
                SET 
                    is_premium = FALSE,
                    premium_until = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE telegram_id = $1
                RETURNING id, name, is_premium
            `, [telegramId]);
            
            console.log('📉 Premium DESATIVADO para:', user.name);
            
            res.json({
                success: true,
                message: 'Premium desativado',
                user: {
                    id: result.rows[0].id,
                    name: result.rows[0].name,
                    is_premium: result.rows[0].is_premium
                }
            });
            
        } else {
            return res.status(400).json({ error: 'Ação inválida. Use "activate" ou "deactivate"' });
        }
        
    } catch (error) {
        console.error('❌ Erro ao gerenciar premium:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// GET - Verificar status Premium
app.get('/api/users/:telegramId/premium', optionalTelegramAuth, async (req, res) => {
    try {
        const { telegramId } = req.params;
        
        const result = await pool.query(`
            SELECT 
                id, name, is_premium, premium_until,
                daily_likes, daily_super_likes
            FROM users 
            WHERE telegram_id = $1
        `, [telegramId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        const user = result.rows[0];
        
        // Verifica se premium expirou
        let isPremiumActive = user.is_premium;
        if (user.is_premium && user.premium_until) {
            if (new Date(user.premium_until) < new Date()) {
                // Premium expirou, desativa
                await pool.query(
                    'UPDATE users SET is_premium = FALSE WHERE telegram_id = $1',
                    [telegramId]
                );
                isPremiumActive = false;
                console.log('⏰ Premium expirado para:', user.name);
            }
        }
        
        const limits = isPremiumActive ? {
            likes: { used: 0, max: 'unlimited', remaining: 'unlimited' },
            super_likes: { used: user.daily_super_likes, max: 5, remaining: 5 - user.daily_super_likes },
            boosts: { used: 0, max: 1, remaining: 1 }
        } : {
            likes: { used: user.daily_likes, max: 10, remaining: Math.max(0, 10 - user.daily_likes) },
            super_likes: { used: 0, max: 0, remaining: 0 },
            boosts: { used: 0, max: 0, remaining: 0 }
        };
        
        res.json({
            user: {
                id: user.id,
                name: user.name
            },
            premium: {
                is_active: isPremiumActive,
                expires_at: user.premium_until,
                plan: isPremiumActive ? 'PREMIUM' : 'FREE'
            },
            limits: limits,
            benefits: {
                unlimited_likes: isPremiumActive,
                super_likes_enabled: isPremiumActive,
                boosts_enabled: isPremiumActive,
                can_see_likes: isPremiumActive
            }
        });
        
    } catch (error) {
        console.error('❌ Erro ao verificar premium:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// ========== DEBUG - Ativar Premium para testes ==========
app.get('/api/debug/activate-premium/:telegramId', async (req, res) => {
    try {
        const { telegramId } = req.params;
        
        console.log('🧪 DEBUG: Ativando premium para:', telegramId);
        
        const result = await pool.query(`
            UPDATE users 
            SET 
                is_premium = TRUE,
                premium_until = CURRENT_TIMESTAMP + INTERVAL '30 days',
                daily_likes = 0,
                daily_super_likes = 0
            WHERE telegram_id = $1
            RETURNING id, name, is_premium, premium_until
        `, [telegramId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        console.log('✅ Premium ativado via DEBUG para:', result.rows[0].name);
        
        res.json({
            success: true,
            message: 'Premium ativado (DEBUG)!',
            user: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Erro:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== DEBUG - Desativar Premium ==========
app.get('/api/debug/deactivate-premium/:telegramId', async (req, res) => {
    try {
        const { telegramId } = req.params;
        
        console.log('🧪 DEBUG: Desativando premium para:', telegramId);
        
        const result = await pool.query(`
            UPDATE users 
            SET 
                is_premium = FALSE,
                premium_until = NULL
            WHERE telegram_id = $1
            RETURNING id, name, is_premium
        `, [telegramId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        console.log('📉 Premium desativado via DEBUG para:', result.rows[0].name);
        
        res.json({
            success: true,
            message: 'Premium desativado (DEBUG)',
            user: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Erro:', error);
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

