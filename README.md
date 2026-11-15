# 🌸 Mini Mundo Fofo — APK para Android

Jogo 3D de blocos fofinhos: mundo aberto gerado automaticamente, construção,
coleta, animais domesticáveis, culinária, fotos, emotes, poses de casal,
ciclo de dia e noite e multiplayer por sala privada com código de convite.

## Baixar o APK pronto

A cada envio de código, o APK é gerado automaticamente em **Actions → Gerar APK → Artifacts**.

## Instalar no celular

1. Baixe o arquivo `mini-mundo-fofo.apk`.
2. Abra o arquivo no Android e permita "instalar de fontes desconhecidas".
3. O jogo abre em tela cheia, na horizontal.

## Compilar na sua máquina

```bash
npm install
npx cap sync android
cd android && ./gradlew assembleDebug
# APK em android/app/build/outputs/apk/debug/
```

## Multiplayer

Dentro do app, a conexão é direta entre celulares (P2P, via PeerJS).
Um jogador cria a sala, o outro digita o código de 6 letras.
Os dois precisam estar com internet.
