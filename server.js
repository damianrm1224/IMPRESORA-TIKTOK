import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import pkg from 'tiktok-live-connector';
const { WebcastPushConnection } = pkg;

const USER = process.env.TIKTOK_USER;      // tu usuario, sin @
const PORT = process.env.PORT || 3000;

const app = express();
const http = createServer(app);
const io = new Server(http);

app.use(express.static('public'));

// Para probar sin estar en vivo: /test?user=ana&gift=Rosa&count=3
// Solo funciona si defines ENABLE_TEST=1
if (process.env.ENABLE_TEST === '1') {
  app.get('/test', (req, res) => {
    io.emit('gift', {
      user: String(req.query.user || 'demo').slice(0, 30),
      name: String(req.query.user || 'demo').slice(0, 30),
      avatar: String(req.query.avatar || '').startsWith('https://') ? String(req.query.avatar) : '',
      gift: String(req.query.gift || 'Rosa').slice(0, 30),
      count: Number(req.query.count) || 1
    });
    res.send('ok');
  });
}

function connect() {
  const tiktok = new WebcastPushConnection(USER);

  tiktok.connect()
    .then(() => console.log(`Conectado al live de @${USER}`))
    .catch(e => {
      console.error('No se pudo conectar (¿estás en vivo?):', e.message);
      setTimeout(connect, 15000);
    });

  tiktok.on('gift', d => {
    // Regalos con racha: esperar a que termine para no duplicar
    if (d.giftType === 1 && !d.repeatEnd) return;
    io.emit('gift', {
      user: d.uniqueId,
      name: d.nickname,
      avatar: d.profilePictureUrl,
      gift: d.giftName,
      count: d.repeatCount || 1
    });
  });

  tiktok.on('disconnected', () => setTimeout(connect, 10000));
}

if (USER) connect();
else console.warn('Falta la variable TIKTOK_USER');

http.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
