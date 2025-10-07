// Configuração do Firebase
// IMPORTANTE: Substitua com suas próprias credenciais do Firebase
// Para obter suas credenciais:
// 1. Acesse https://console.firebase.google.com/
// 2. Crie um novo projeto ou selecione um existente
// 3. Vá em Configurações do Projeto > Seus Apps
// 4. Adicione um app da Web
// 5. Copie as configurações aqui

const firebaseConfig = {
    apiKey: "AIzaSyDpXxH1Ea0ZnioNJDNuqW8rhJNAMgP4bdI",
    authDomain: "tatuagem-c68be.firebaseapp.com",
    projectId: "tatuagem-c68be",
    storageBucket: "tatuagem-c68be.firebasestorage.app",
    messagingSenderId: "536365329275",
    appId: "1:536365329275:web:72ffb6df35edff3bceebde",
    measurementId: "G-Q35DS218Y7"
};


// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referências aos serviços do Firebase
const db = firebase.firestore();
const storage = firebase.storage();

// Referência à coleção de agendamentos
const appointmentsCollection = db.collection('appointments');

console.log('Firebase inicializado com sucesso!');
