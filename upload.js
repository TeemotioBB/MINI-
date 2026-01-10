// ========== ROTA DE UPLOAD DE FOTOS ==========
const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { Pool } = require('pg');

// Configuração do PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Configuração do Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configuração do Multer (aceita até 4 fotos)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB máximo
        files: 4 // Máximo 4 fotos
    },
    fileFilter: (req, file, cb) => {
        // Aceita apenas imagens
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas imagens são permitidas!'), false);
        }
    }
});

// ========== UPLOAD DE FOTO ÚNICA ==========
router.post('/photo', upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhuma foto enviada' });
        }

        const { telegram_id } = req.body;

        if (!telegram_id) {
            return res.status(400).json({ error: 'telegram_id é obrigatório' });
        }

        // Faz upload para Cloudinary
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
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            
            stream.write(req.file.buffer);
            stream.end();
        });

        const result = await uploadPromise;

        // Atualiza URL da foto no banco
        await pool.query(
            'UPDATE users SET photo_url = $1, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = $2',
            [result.secure_url, telegram_id]
        );

        res.json({
            success: true,
            url: result.secure_url,
            public_id: result.public_id
        });

    } catch (error) {
        console.error('Erro no upload:', error);
        res.status(500).json({ error: 'Erro ao fazer upload da foto' });
    }
});

// ========== UPLOAD DE MÚLTIPLAS FOTOS ==========
router.post('/photos', upload.array('photos', 4), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Nenhuma foto enviada' });
        }

        const { telegram_id } = req.body;

        if (!telegram_id) {
            return res.status(400).json({ error: 'telegram_id é obrigatório' });
        }

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

        // Atualiza array de fotos no banco
        await pool.query(
            'UPDATE users SET photos = $1, photo_url = $2, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = $3',
            [urls, urls[0], telegram_id]
        );

        res.json({
            success: true,
            urls: urls,
            count: urls.length
        });

    } catch (error) {
        console.error('Erro no upload múltiplo:', error);
        res.status(500).json({ error: 'Erro ao fazer upload das fotos' });
    }
});

// ========== DELETAR FOTO ==========
router.delete('/photo', async (req, res) => {
    try {
        const { telegram_id, public_id } = req.body;

        if (!telegram_id || !public_id) {
            return res.status(400).json({ error: 'telegram_id e public_id são obrigatórios' });
        }

        // Deleta do Cloudinary
        await cloudinary.uploader.destroy(public_id);

        // Busca fotos atuais
        const result = await pool.query(
            'SELECT photos FROM users WHERE telegram_id = $1',
            [telegram_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Remove a foto do array
        let photos = result.rows[0].photos || [];
        const urlToRemove = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/v`;
        photos = photos.filter(url => !url.includes(public_id));

        // Atualiza no banco
        await pool.query(
            'UPDATE users SET photos = $1, photo_url = $2, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = $3',
            [photos, photos[0] || null, telegram_id]
        );

        res.json({
            success: true,
            remaining: photos.length
        });

    } catch (error) {
        console.error('Erro ao deletar foto:', error);
        res.status(500).json({ error: 'Erro ao deletar foto' });
    }
});

module.exports = router;