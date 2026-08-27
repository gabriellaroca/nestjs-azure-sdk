# Changelog

Todas as alterações relevantes deste projeto serão documentadas aqui.

## 2.0.0 (2026-08-27)

### Features

- módulos independentes para Service Bus, Blob Storage e Queue Storage;
- configuração síncrona e assíncrona compatível com o contêiner do NestJS;
- listeners declarativos para múltiplas filas e subscriptions;
- retry e poison queue para Queue Storage;
- autenticação por connection string, credencial customizada ou `DefaultAzureCredential`;
- shutdown seguro de senders, receivers e workers.

### Breaking Changes

- removida a API 1.x que instanciava filas fora do contêiner de dependências do NestJS;
- pacote distribuído como ESM e com requisito mínimo de Node.js 22.
