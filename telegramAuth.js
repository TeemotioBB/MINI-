// ========== MIDDLEWARE DE AUTENTICAÇÃO TELEGRAM ==========
const crypto = require('crypto');

/**
 * Valida os dados do Telegram Web App
 * Documentação: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function validateTelegramWebAppData(initData) {
    try {
        const BOT_TOKEN = process.env.BOT_TOKEN;
        
        if (!BOT_TOKEN) {
            throw new Error('BOT_TOKEN não configurado');
        }

        // Parse initData
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        urlParams.delete('hash');

        // Ordena os parâmetros alfabeticamente
        const dataCheckString = Array.from(urlParams.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        // Cria secret key
        const secretKey = crypto
            .createHmac('sha256', 'WebAppData')
            .update(BOT_TOKEN)
            .digest();

        // Calcula hash esperado
        const calculatedHash = crypto
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');

        // Compara hashes
        return hash === calculatedHash;

    } catch (error) {
        console.error('Erro ao validar dados do Telegram:', error);
        return false;
    }
}

/**
 * Extrai dados do usuário do initData
 */
function extractUserData(initData) {
    try {
        const urlParams = new URLSearchParams(initData);
        const userJson = urlParams.get('user');
        
        if (!userJson) {
            return null;
        }

        const user = JSON.parse(userJson);
        
        return {
            telegram_id: user.id,
            first_name: user.first_name,
            last_name: user.last_name || '',
            username: user.username || '',
            language_code: user.language_code || 'pt',
            photo_url: user.photo_url || null
        };

    } catch (error) {
        console.error('Erro ao extrair dados do usuário:', error);
        return null;
    }
}

/**
 * Middleware para proteger rotas (valida Telegram Auth)
 */
function requireTelegramAuth(req, res, next) {
    try {
        // Pega initData do header ou body
        const initData = req.headers['x-telegram-init-data'] || req.body.initData;

        if (!initData) {
            return res.status(401).json({ 
                error: 'Autenticação necessária',
                code: 'MISSING_AUTH'
            });
        }

        // Valida dados
        const isValid = validateTelegramWebAppData(initData);

        if (!isValid) {
            return res.status(401).json({ 
                error: 'Dados inválidos',
                code: 'INVALID_AUTH'
            });
        }

        // Extrai dados do usuário
        const userData = extractUserData(initData);

        if (!userData) {
            return res.status(401).json({ 
                error: 'Não foi possível extrair dados do usuário',
                code: 'INVALID_USER_DATA'
            });
        }

        // Adiciona dados do usuário à requisição
        req.telegramUser = userData;

        next();

    } catch (error) {
        console.error('Erro no middleware de autenticação:', error);
        res.status(500).json({ error: 'Erro na autenticação' });
    }
}

/**
 * Middleware OPCIONAL de autenticação (não bloqueia se não tiver)
 */
function optionalTelegramAuth(req, res, next) {
    try {
        const initData = req.headers['x-telegram-init-data'] || req.body.initData;

        if (initData) {
            const isValid = validateTelegramWebAppData(initData);
            
            if (isValid) {
                const userData = extractUserData(initData);
                if (userData) {
                    req.telegramUser = userData;
                }
            }
        }

        next();

    } catch (error) {
        console.error('Erro no middleware opcional:', error);
        next();
    }
}

module.exports = {
    validateTelegramWebAppData,
    extractUserData,
    requireTelegramAuth,
    optionalTelegramAuth
};
