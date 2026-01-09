// Lista de perfis para o app
const profiles = [
  {
      id: 1,
      name: "Brenda",
      age: 26,
      gender: "feminino",
      photos: [
          "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=500",
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=500",
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=500"
      ],
      bio: "Chama lá no insta @brendahonoratoo_",
      verified: true
  },
  {
      id: 2,
      name: "Lucas",
      age: 28,
      gender: "masculino",
      photos: [
          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=500",
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=500",
          "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=500",
          "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=500"
      ],
      bio: "Aventureiro nas horas vagas 🏔️",
      verified: true
  },
  {
      id: 3,
      name: "Amanda",
      age: 24,
      gender: "feminino",
      photos: [
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=500",
          "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=500"
      ],
      bio: "Amante de café e livros ☕📚",
      verified: false
  },
  {
      id: 4,
      name: "Rafael",
      age: 30,
      gender: "masculino",
      photos: [
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=500",
          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=500",
          "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=500"
      ],
      bio: "Designer gráfico | Música é vida 🎵",
      verified: true
  },
  {
      id: 5,
      name: "Júlia",
      age: 22,
      gender: "feminino",
      photos: [
          "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=500",
          "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=500",
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=500",
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=500"
      ],
      bio: "Viciada em séries e pizza 🍕",
      verified: true
  },
  {
      id: 6,
      name: "Felipe",
      age: 27,
      gender: "masculino",
      photos: [
          "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=500"
      ],
      bio: "Dev front-end 💻 | Gamer nas horas vagas",
      verified: false
  },
  {
      id: 7,
      name: "Camila",
      age: 25,
      gender: "feminino",
      photos: [
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=500",
          "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=500",
          "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=500"
      ],
      bio: "Fitness lover 💪 | Nutricionista",
      verified: true
  },
  {
      id: 8,
      name: "Pedro",
      age: 29,
      gender: "masculino",
      photos: [
          "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=500",
          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=500"
      ],
      bio: "Fotógrafo | Viajante do mundo 📸✈️",
      verified: true
  }
];

// Variável para controlar qual perfil está sendo exibido
let currentProfileIndex = 0;
