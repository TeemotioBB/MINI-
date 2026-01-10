// ========== CLIENTE API PARA O FRONTEND ==========

// ⚙️ CONFIGURAÇÃO - MUDE AQUI A URL DO SEU BACKEND
const API_BASE_URL = 'https://mini-production-cf60.up.railway.app/api';
// Em produção: const API_BASE_URL = 'https://seu-backend.railway.app/api';

// Pega initData do Telegram
function getTelegramInitData() {
    if (window.Telegram && window.Telegram.WebApp) {
        return window.Telegram.WebApp.initData;
    }
    return null;
}

// Função helper para fazer requisições
async function apiRequest(endpoint, options = {}) {
    const initData = getTelegramInitData();
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'X-Telegram-Init-Data': initData || ''
        }
    };

    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, finalOptions);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro na requisição');
        }

        return await response.json();
    } catch (error) {
        console.error('❌ Erro na API:', error);
        throw error;
    }
}

// ========== OBJETO API ==========

const API = {
    // ========== USUÁRIOS ==========

    // Buscar perfil do usuário
    async getMyProfile(telegramId) {
        return apiRequest(`/users/${telegramId}`);
    },

    // Criar/atualizar perfil
    async updateProfile(data) {
        return apiRequest('/users', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    // Buscar perfis para swipe
    async discoverProfiles(telegramId, limit = 10) {
        return apiRequest(`/users/${telegramId}/discover?limit=${limit}`);
    },

    // ========== LIKES ==========

    // Dar like/dislike
    async sendLike(toTelegramId, type = 'like') {
        return apiRequest('/likes', {
            method: 'POST',
            body: JSON.stringify({
                to_telegram_id: toTelegramId,
                type: type // 'like', 'superlike', 'dislike'
            })
        });
    },

    // Buscar likes recebidos (Premium only)
    async getReceivedLikes() {
        return apiRequest('/likes/received');
    },

    // ========== MATCHES ==========

    // Buscar meus matches
    async getMyMatches() {
        return apiRequest('/matches');
    },

    // ========== CHAT ==========

    // Buscar mensagens de um match
    async getMessages(matchId, limit = 50, offset = 0) {
        return apiRequest(`/matches/${matchId}/messages?limit=${limit}&offset=${offset}`);
    },

    // Enviar mensagem
    async sendMessage(matchId, content) {
        return apiRequest(`/matches/${matchId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ content })
        });
    },

    // ========== UPLOAD ==========

    // Upload de foto única
    async uploadPhoto(file, telegramId) {
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('telegram_id', telegramId);

        const initData = getTelegramInitData();

        const response = await fetch(`${API_BASE_URL}/upload/photo`, {
            method: 'POST',
            headers: {
                'X-Telegram-Init-Data': initData || ''
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro no upload');
        }

        return response.json();
    },

    // Upload de múltiplas fotos
    async uploadPhotos(files, telegramId) {
        const formData = new FormData();
        
        for (let i = 0; i < files.length; i++) {
            formData.append('photos', files[i]);
        }
        
        formData.append('telegram_id', telegramId);

        const initData = getTelegramInitData();

        const response = await fetch(`${API_BASE_URL}/upload/photos`, {
            method: 'POST',
            headers: {
                'X-Telegram-Init-Data': initData || ''
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro no upload');
        }

        return response.json();
    },

    // Deletar foto
    async deletePhoto(publicId, telegramId) {
        return apiRequest('/upload/photo', {
            method: 'DELETE',
            body: JSON.stringify({
                public_id: publicId,
                telegram_id: telegramId
            })
        });
    }
};

// ========== EXEMPLOS DE USO ==========

/*
// 1. Buscar meu perfil
const telegramId = window.Telegram.WebApp.initDataUnsafe?.user?.id;
const myProfile = await API.getMyProfile(telegramId);
console.log('Meu perfil:', myProfile);

// 2. Atualizar perfil
await API.updateProfile({
    name: 'João',
    age: 25,
    gender: 'masculino',
    bio: 'Olá!',
    city: 'São Paulo'
});

// 3. Buscar perfis para swipe
const profiles = await API.discoverProfiles(telegramId, 10);
console.log('Perfis encontrados:', profiles);

// 4. Dar like
const result = await API.sendLike(987654321, 'like');
if (result.match) {
    console.log('🎉 Match!');
}

// 5. Enviar mensagem
await API.sendMessage(1, 'Olá! Tudo bem?');

// 6. Upload de foto
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];
const result = await API.uploadPhoto(file, telegramId);
console.log('Foto enviada:', result.url);
*/

console.log('✅ API Client carregado!');
console.log('📡 API URL:', API_BASE_URL);

// Exporta para uso global

window.API = API;
