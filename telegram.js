// Inicializa o Telegram Web App
const tg = window.Telegram.WebApp;

// Expande o app pra tela cheia
tg.expand();

// Pega dados do usuário do Telegram
const telegramUser = tg.initDataUnsafe?.user;

if (telegramUser) {
    console.log('👤 Usuário do Telegram:', telegramUser);
    console.log('Nome:', telegramUser.first_name);
    console.log('Username:', telegramUser.username);
    console.log('ID:', telegramUser.id);
    console.log('Foto:', telegramUser.photo_url);
    
    // Você pode usar esses dados no app
    // Por exemplo, no perfil.js:
    // userData.name = telegramUser.first_name;
    // userData.photo = telegramUser.photo_url;
}

// Configura o botão de voltar do Telegram
tg.BackButton.onClick(() => {
    window.history.back();
});

// Mostra o botão de voltar quando necessário
if (window.location.pathname !== '/index.html') {
    tg.BackButton.show();
}
