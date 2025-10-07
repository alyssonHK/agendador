# 🔥 Configuração Completa do Firebase

## ⚠️ ERRO ATUAL: Storage Unauthorized (403)

Você está recebendo o erro `storage/unauthorized` porque as regras de segurança do Firebase Storage não permitem uploads.

## 🛠️ Como Resolver:

### 1. Configurar Regras do Firebase Storage

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto: **tatuagem-c68be**
3. No menu lateral, clique em **Storage**
4. Clique na aba **Rules** (Regras)
5. **Substitua** as regras existentes por:

```
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      // Permite leitura e escrita para qualquer pessoa (para desenvolvimento)
      allow read, write: if true;
    }
  }
}
```

6. Clique em **Publish** (Publicar)

### 2. Configurar Regras do Firestore Database

1. No Firebase Console, vá em **Firestore Database**
2. Clique na aba **Rules** (Regras)
3. **Substitua** as regras existentes por:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      // Permite leitura e escrita para qualquer pessoa (para desenvolvimento)
      allow read, write: if true;
    }
  }
}
```

4. Clique em **Publish** (Publicar)

---

## 🔒 IMPORTANTE: Segurança

⚠️ **As regras acima são ABERTAS e apenas para DESENVOLVIMENTO/TESTE!**

### Para Produção (Recomendado):

Depois de testar, use regras mais seguras:

#### Storage Rules (Produção):
```
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    match /appointments/{appointmentId}/{fileName} {
      // Permite leitura pública
      allow read: if true;
      
      // Permite escrita apenas de imagens menores que 5MB
      allow write: if request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

#### Firestore Rules (Produção com Autenticação):
```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /appointments/{appointmentId} {
      // Leitura pública
      allow read: if true;
      
      // Escrita apenas para usuários autenticados
      allow create, update, delete: if request.auth != null;
    }
  }
}
```

---

## 📋 Checklist de Configuração

- [ ] Projeto Firebase criado: `tatuagem-c68be`
- [ ] Firestore Database ativado
- [ ] Firebase Storage ativado
- [ ] Regras do Storage configuradas (modo aberto para teste)
- [ ] Regras do Firestore configuradas (modo aberto para teste)
- [ ] Credenciais copiadas para `firebase-config.js`

---

## 🚀 Após Configurar as Regras:

1. **Aguarde 30 segundos** (as regras levam um tempo para propagar)
2. **Recarregue a página** do seu aplicativo
3. **Tente fazer upload novamente**

Se ainda houver erro:
- Verifique se publicou as regras corretamente
- Confirme que está usando o projeto correto no Firebase Console
- Limpe o cache do navegador (Ctrl + Shift + Delete)

---

## 📞 Suporte

Se continuar com problemas:
1. Abra o Console do navegador (F12)
2. Vá na aba "Network"
3. Tente fazer upload novamente
4. Copie a mensagem de erro completa

---

## 🔗 Links Úteis

- [Firebase Console](https://console.firebase.google.com/project/tatuagem-c68be/overview)
- [Storage Rules](https://console.firebase.google.com/project/tatuagem-c68be/storage/rules)
- [Firestore Rules](https://console.firebase.google.com/project/tatuagem-c68be/firestore/rules)
- [Documentação Firebase Storage Rules](https://firebase.google.com/docs/storage/security)
- [Documentação Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
