// ========== ROTA DE UPLOAD DE FOTOS ==========
const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

// ⚠️ CREDENCIAIS DIRETAS - para debug (em produção, use variáveis de ambiente!)
cloudinary.config({
    cloud_name: 'dx5ki2s1d',
    api_key: '568959253727239',
    api_secret: 'ffQsNQcYcSgE3VFdoLrsBYGXov4'
});

console.log('✅ Cloudinary configurado com cloud_name:', 'dx5ki2s1d');

// Configuração do Multer (aceita até 4 fotos, SEM limite de tamanho por arquivo)
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        // fileSize: 5 * 1024 * 1024, // COMENTADO = SEM LIMITE DE TAMANHO POR FOTO
        files: 4 // Máximo 4 arquivos simultâneos
    },
    fileFilter: (req, file, cb) => {
        console.log('📁 Arquivo recebido:', file.originalname, 'Tipo:', file.mimetype, 'Tamanho:', file.size + ' bytes');
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas imagens são permitidas!'), false);
        }
    }
});

// Log de debug para confirmar configuração (aparece no console do Railway ao iniciar)
console.log('⚙️ Multer configurado:');
console.log('   - Limite de tamanho por arquivo: SEM LIMITE (fileSize comentado)');
console.log('   - Limite de quantidade de arquivos: 4');

// ========== UPLOAD DE FOTO ÚNICA ==========
router.post('/photo', upload.single('photo'), async (req, res) => {
    console.log('🚀 Iniciando upload de foto única...');
    
    try {
        if (!req.file) {
            console.log('❌ Nenhum arquivo recebido');
            return res.status(400).json({ error: 'Nenhuma foto enviada' });
        }
        console.log('📦 Arquivo recebido:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        });
        const telegram_id = req.body.telegram_id || 'unknown';
        console.log('👤 Telegram ID:', telegram_id);

        // Faz upload para Cloudinary
        console.log('☁️ Enviando para Cloudinary...');
        
        const uploadPromise = new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: 'spark-dating/profiles',
                    public_id: `user_${telegram_id}_${Date.now()}`,
                    transformation: [
                        { width: 800, height: 1000, crop: 'fill', gravity: 'face' },
                        { quality: 'auto:good' },
                        { fetch_format: 'auto' }
                    ]
                },
                (error, result) => {
                    if (error) {
                        console.log('❌ Erro Cloudinary:', error);
                        reject(error);
                    } else {
                        console.log('✅ Upload Cloudinary sucesso:', result.secure_url);
                        resolve(result);
                    }
                }
            );
            
            stream.write(req.file.buffer);
            stream.end();
        });
        const result = await uploadPromise;

        // Tenta atualizar no banco (opcional - não falha se der erro)
        try {
            if (global.pool && telegram_id !== 'unknown') {
                await global.pool.query(
                    'UPDATE users SET photo_url = $1, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = $2',
                    [result.secure_url, telegram_id]
                );
                console.log('💾 Banco atualizado (foto única)');
            }
        } catch (dbError) {
            console.log('⚠️ Erro ao atualizar banco (ignorado):', dbError.message);
        }

        res.json({
            success: true,
            url: result.secure_url,
            public_id: result.public_id
        });
    } catch (error) {
        console.error('❌ Erro no upload único:', error);
        res.status(500).json({
            error: 'Erro ao fazer upload da foto',
            details: error.message
        });
    }
});

// ========== UPLOAD DE MÚLTIPLAS FOTOS ==========
router.post('/photos', upload.array('photos', 4), async (req, res) => {
    console.log('🚀 Iniciando upload múltiplo...');
    
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Nenhuma foto enviada' });
        }
        const telegram_id = req.body.telegram_id || 'unknown';
        console.log('👤 Telegram ID:', telegram_id);
        console.log('📦 Arquivos recebidos:', req.files.length);

        // Upload de todas as fotos em paralelo
        const uploadPromises = req.files.map((file, index) => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'spark-dating/profiles',
                        public_id: `user_${telegram_id}_photo_${index}_${Date.now()}`,
                        transformation: [
                            { width: 800, height: 1000, crop: 'fill', gravity: 'face' },
                            { quality: 'auto:good' },
                            { fetch_format: 'auto' }
                        ]
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result.secure_url);
                    }
                );
                
                stream.write(file.buffer);
                stream.end();
            });
        });
        const urls = await Promise.all(uploadPromises);
        console.log('✅ Todas as fotos enviadas:', urls.length);

        // Tenta atualizar no banco
        try {
            if (global.pool && telegram_id !== 'unknown') {
                await global.pool.query(
                    'UPDATE users SET photos = $1, photo_url = $2, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = $3',
                    [urls, urls[0], telegram_id]
                );
                console.log('💾 Banco atualizado (múltiplas fotos)');
            }
        } catch (dbError) {
            console.log('⚠️ Erro ao atualizar banco (ignorado):', dbError.message);
        }

        res.json({
            success: true,
            urls: urls,
            count: urls.length
        });
    } catch (error) {
        console.error('❌ Erro no upload múltiplo:', error);
        res.status(500).json({
            error: 'Erro ao fazer upload das fotos',
            details: error.message
        });
    }
});

// ========== DELETAR FOTO ==========
router.delete('/photo', async (req, res) => {
    try {
        const { telegram_id, public_id } = req.body;
        if (!public_id) {
            return res.status(400).json({ error: 'public_id é obrigatório' });
        }
        // Deleta do Cloudinary
        await cloudinary.uploader.destroy(public_id);
        console.log('🗑️ Foto deletada do Cloudinary:', public_id);
        res.json({
            success: true,
            message: 'Foto deletada'
        });
    } catch (error) {
        console.error('❌ Erro ao deletar foto:', error);
        res.status(500).json({ error: 'Erro ao deletar foto' });
    }
});

// ========== ROTA DE TESTE ==========
router.get('/test', (req, res) => {
    res.json({
        status: 'ok',
        cloudinary: {
            cloud_name: 'dx5ki2s1d',
            configured: true
        },
        message: 'Upload service funcionando!'
    });
});

module.exports = router;
