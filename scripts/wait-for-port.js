#!/usr/bin/env node
const net = require('net');
const port = Number(process.env.WAIT_PORT || 4200);
const timeoutMs = Number(process.env.WAIT_TIMEOUT || 300000); // 5 min
const intervalMs = 2000;
const start = Date.now();

function check(){
  const socket = net.createConnection(port, '127.0.0.1');
  socket.on('connect', () => { socket.end(); process.stdout.write(`Port ${port} ready\n`); process.exit(0); });
  socket.on('error', () => {
    socket.destroy();
    if(Date.now() - start > timeoutMs){
      console.error(`Timeout waiting for port ${port}`);
      process.exit(1);
    }
    setTimeout(check, intervalMs);
  });
}
check();
