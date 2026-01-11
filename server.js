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
        // ✅ CORRIGIDO: Agora usa NOT EXISTS para filtrar TODOS os perfis que o usuário já interagiu
        // (like, superlike ou dislike), evitando que apareçam novamente
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
              
              -- 5️⃣ Não mostrar quem já dei like/dislike/superlike (qualquer interação)
              -- Usa NOT EXISTS ao invés de NOT IN para melhor performance e correção
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
        
        console.log('📝 Params:', {
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
            
            console.log('🔍 Likes entre os dois usuários:', debugLikes.rows);
            
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
        
        console.log('🔍 Buscando matches para user ID:', userId);
        
        const result = await pool.query(`
            SELECT 
                m.id as match_id,
                m.user1_id,
                m.user2_id,
                m.created_at as matched_at,
                m.last_message_at,
                u1.telegram_id as user1_telegram_id,
                u1.name as user1_name,
                u1.photo_url as user1_photo,
                u2.telegram_id as user2_telegram_id,
                u2.name as user2_name,
                u2.photo_url as user2_photo
            FROM matches m
            JOIN users u1 ON m.user1_id = u1.id
            JOIN users u2 ON m.user2_id = u2.id
            WHERE (m.user1_id = $1 OR m.user2_id = $1)
              AND m.is_active = TRUE
            ORDER BY m.last_message_at DESC
        `, [userId]);
        
        console.log('✅ Matches encontrados:', result.rows.length);
        
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

// ========== DEBUG - Resetar likes e matches ==========
app.get('/api/debug/reset-likes', async (req, res) => {
    try {
        console.log('🔄 Resetando likes e matches...');
        
        // Deleta todos os likes
        const likesResult = await pool.query('DELETE FROM likes');
        console.log('🗑️ Likes deletados:', likesResult.rowCount);
        
        // Deleta todos os matches
        const matchesResult = await pool.query('DELETE FROM matches');
        console.log('🗑️ Matches deletados:', matchesResult.rowCount);
        
        // Reseta contadores
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
        
        // Busca o user_id
        const userResult = await pool.query('SELECT id FROM users WHERE telegram_id = $1', [telegramId]);
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        const userId = userResult.rows[0].id;
        
        // Deleta likes desse usuário
        const likesResult = await pool.query('DELETE FROM likes WHERE from_user_id = $1', [userId]);
        console.log('🗑️ Likes deletados:', likesResult.rowCount);
        
        // Deleta matches desse usuário
        const matchesResult = await pool.query(
            'DELETE FROM matches WHERE user1_id = $1 OR user2_id = $1',
            [userId]
        );
        console.log('🗑️ Matches deletados:', matchesResult.rowCount);
        
        // Reseta contador
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
            console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🧹 Limpando usuário:', telegramId);
            
            // Busca o user_id
            const userResult = await pool.query(
                'SELECT id, name FROM users WHERE telegram_id = $1',
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
            
            console.log('👤 Encontrado:', userName, '(ID:', userId, ')');
            
            // 1. Deleta TODOS os likes (enviados e recebidos)
            const likesResult = await pool.query(
                'DELETE FROM likes WHERE from_user_id = $1 OR to_user_id = $1',
                [userId]
            );
            console.log('🗑️ Matches deletados:', matchesResult.rowCount);
            result.matches_deleted += matchesResult.rowCount;
            
            // 3. LIMPA O PERFIL E RESETA LIMITES (mantém usuário, mas limpa dados)
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
            console.log('🔄 Limites resetados: daily_likes =', cleanResult.rows[0].daily_likes, '| daily_super_likes =', cleanResult.rows[0].daily_super_likes);
            result.profiles_cleaned++;
            
            result.users_reset.push({
                telegram_id: telegramId,
                user_id: userId,
                status: 'reset_success',
                old_name: userName,
                new_name: 'Usuário Teste',
                daily_likes: 0,
                daily_super_likes: 0
            });
            
            console.log('✅ Usuário resetado com sucesso!');
        }
        
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎉 RESET COMPLETO!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        res.json(result);
    } catch (error) {
        console.error('❌ Erro ao resetar:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== DEBUG - RESETAR LIMITE DE LIKES DE NÃO-VIP ==========
app.get('/api/debug/reset-like-limits', async (req, res) => {
    try {
        console.log('🔄 Resetando limites de likes para usuários não-VIP...');
        
        // Reseta daily_likes e daily_super_likes para todos os usuários não premium
        const result = await pool.query(`
            UPDATE users 
            SET 
                daily_likes = 0,
                daily_super_likes = 0,
                last_reset_date = CURRENT_DATE
            WHERE is_premium = FALSE
            RETURNING id, telegram_id, name, daily_likes, daily_super_likes
        `);
        
        console.log('✅ Limites resetados para', result.rowCount, 'usuários não-VIP');
        
        res.json({
            success: true,
            message: `Limites de likes resetados para ${result.rowCount} usuários não-VIP`,
            users_updated: result.rowCount,
            users: result.rows.map(u => ({
                telegram_id: u.telegram_id,
                name: u.name,
                daily_likes: u.daily_likes,
                daily_super_likes: u.daily_super_likes
            }))
        });
    } catch (error) {
        console.error('❌ Erro ao resetar limites:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== DEBUG - RESETAR LIMITES DOS USUÁRIOS DE TESTE ==========
app.get('/api/debug/reset-test-users-limits', async (req, res) => {
    try {
        const testUserIds = [8542013089, 1293602874];
        
        console.log('🔄 Resetando limites de likes dos usuários de teste:', testUserIds);
        
        let result = {
            success: true,
            users_updated: []
        };
        
        for (const telegramId of testUserIds) {
            // Busca e reseta o usuário
            const userResult = await pool.query(`
                UPDATE users 
                SET 
                    daily_likes = 0,
                    daily_super_likes = 0,
                    last_reset_date = CURRENT_DATE
                WHERE telegram_id = $1
                RETURNING id, telegram_id, name, daily_likes, daily_super_likes, is_premium
            `, [telegramId]);
            
            if (userResult.rows.length === 0) {
                console.log('⚠️ Usuário não encontrado:', telegramId);
                result.users_updated.push({
                    telegram_id: telegramId,
                    status: 'not_found'
                });
            } else {
                const user = userResult.rows[0];
                console.log('✅ Limites resetados:', user.name, '(ID:', user.telegram_id, ')');
                result.users_updated.push({
                    telegram_id: user.telegram_id,
                    name: user.name,
                    status: 'success',
                    daily_likes: user.daily_likes,
                    daily_super_likes: user.daily_super_likes,
                    is_premium: user.is_premium
                });
            }
        }
        
        console.log('🎉 Reset de limites completo!');
        
        res.json(result);
    } catch (error) {
        console.error('❌ Erro ao resetar limites:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== DEBUG - DELETAR COMPLETAMENTE OS 2 USUÁRIOS (COMEÇAR DO ZERO) ==========
app.get('/api/debug/delete-my-test-users', async (req, res) => {
    try {
        const testUserIds = [8542013089, 1293602874];
        
        console.log('💣 DELETANDO COMPLETAMENTE USUÁRIOS:', testUserIds);
        console.log('⚠️ ATENÇÃO: Eles terão que criar perfil do zero!');
        
        let result = {
            success: true,
            users_deleted: []
        };
        
        for (const telegramId of testUserIds) {
            console.log('\n🗑️ Deletando:', telegramId);
            
            // Busca usuário
            const userResult = await pool.query(
                'SELECT id, name FROM users WHERE telegram_id = $1',
                [telegramId]
            );
            
            if (userResult.rows.length === 0) {
                console.log('⚠️ Usuário não existe');
                result.users_deleted.push({
                    telegram_id: telegramId,
                    status: 'not_found'
                });
                continue;
            }
            
            const userId = userResult.rows[0].id;
            const userName = userResult.rows[0].name;
            
            console.log('👤 Encontrado:', userName);
            
            // Deleta TUDO relacionado (CASCADE já faz isso automaticamente)
            const deleteResult = await pool.query(
                'DELETE FROM users WHERE id = $1',
                [userId]
            );
            
            console.log('💥 Usuário deletado completamente!');
            
            result.users_deleted.push({
                telegram_id: telegramId,
                user_id: userId,
                old_name: userName,
                status: 'deleted_completely'
            });
        }
        
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('💥 USUÁRIOS DELETADOS!');
        console.log('🆕 Eles vão aparecer como novos usuários ao abrir o app');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        res.json(result);
    } catch (error) {
        console.error('❌ Erro ao deletar:', error);
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
}); Likes deletados:', likesResult.rowCount);
            result.likes_deleted += likesResult.rowCount;
            
            // 2. Deleta TODOS os matches
            const matchesResult = await pool.query(
                'DELETE FROM matches WHERE user1_id = $1 OR user2_id = $1',
                [userId]
            );
            console.log('🗑️
