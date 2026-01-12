#!/usr/bin/env node

// ========== SCRIPT DE INICIALIZAÇÃO COM VIP AUTOMÁTICO ==========
// Este script garante que os VIPs automáticos sejam ativados no banco
// toda vez que o servidor iniciar

const { Pool } = require('pg');
require('dotenv').config();

// 👑 IDs que sempre devem ser VIP
const AUTO_VIP_IDS = [
    1293602874  // Seu ID - sempre VIP!
    // Adicione mais IDs aqui se necessário
];

async function ensureAutoVIPs() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        console.log('👑 Verificando VIPs automáticos...');
        
        for (const telegramId of AUTO_VIP_IDS) {
            try {
                const result = await pool.query(`
                    UPDATE users 
                    SET 
                        is_premium = true,
                        premium_until = CURRENT_TIMESTAMP + INTERVAL '100 years',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE telegram_id = $1 AND is_active = true
                    RETURNING telegram_id, name, is_premium
                `, [telegramId]);
                
                if (result.rows.length > 0) {
                    console.log(`✅ VIP garantido para: ${result.rows[0].name} (${telegramId})`);
                } else {
                    console.log(`ℹ️  Usuário ${telegramId} ainda não criou perfil`);
                }
            } catch (error) {
                console.error(`❌ Erro ao garantir VIP para ${telegramId}:`, error.message);
            }
        }
        
        console.log('✅ Verificação de VIPs concluída!\n');
        
    } catch (error) {
        console.error('❌ Erro ao verificar VIPs:', error);
    } finally {
        await pool.end();
    }
}

// Executa a garantia de VIPs e depois inicia o servidor
ensureAutoVIPs()
    .then(() => {
        console.log('🚀 Iniciando servidor...\n');
        // Inicia o servidor principal
        require('./server.js');
    })
    .catch((error) => {
        console.error('❌ Falha crítica:', error);
        process.exit(1);
    });
