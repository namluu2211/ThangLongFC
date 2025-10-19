#!/usr/bin/env node
/**
 * Lightweight file-based CRUD server for src/assets/players.json.
 * Development only; not for production deployment.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'src', 'assets', 'players.json');
const PORT = process.env.PLAYERS_FILE_PORT || 5055;

function readPlayers(){
  try { const raw = fs.readFileSync(DATA_PATH, 'utf8'); return JSON.parse(raw); } catch(e){ return []; }
}
function writePlayers(players){ fs.writeFileSync(DATA_PATH, JSON.stringify(players, null, 2)); }
function send(res, status, data){ const body = JSON.stringify(data); res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }); res.end(body); }

function parseBody(req){ return new Promise(resolve => { let acc=''; req.on('data', chunk => acc+=chunk); req.on('end', ()=>{ try{ resolve(acc? JSON.parse(acc):{});}catch{ resolve({}); } }); }); }

const server = http.createServer(async (req,res)=>{
  if(req.method==='OPTIONS'){ send(res,200,{ ok:true }); return; }
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const parts = url.pathname.split('/').filter(Boolean); // players / :id
  if(parts[0] !== 'players'){ send(res,404,{ error:'Not Found' }); return; }

  // GET /players
  if(req.method==='GET' && parts.length===1){ return send(res,200, readPlayers()); }

  // POST /players
  if(req.method==='POST' && parts.length===1){ const body = await parseBody(req); if(!body.firstName){ return send(res,400,{ error:'firstName required'}); } const players = readPlayers(); const newId = players.length? Math.max(...players.map(p=>p.id||0))+1:1; const newPlayer={ id:newId, firstName:String(body.firstName), lastName: body.lastName? String(body.lastName):'', position: body.position? String(body.position):'Chưa xác định', avatar: body.avatar||'assets/images/default-avatar.svg', DOB: body.DOB||body.dateOfBirth||'', height: body.height||0, weight: body.weight||0, note: body.note||'' }; players.push(newPlayer); writePlayers(players); return send(res,201,newPlayer); }

  // PUT /players/:id
  if(req.method==='PUT' && parts.length===2){ const id = Number(parts[1]); if(Number.isNaN(id)) return send(res,400,{ error:'Invalid id'}); const body = await parseBody(req); const players = readPlayers(); const idx = players.findIndex(p=>Number(p.id)===id); if(idx===-1) return send(res,404,{ error:'Player not found'}); const updated = { ...players[idx], ...body, id }; players[idx]=updated; writePlayers(players); return send(res,200, updated); }

  // DELETE /players/:id
  if(req.method==='DELETE' && parts.length===2){ const id = Number(parts[1]); if(Number.isNaN(id)) return send(res,400,{ error:'Invalid id'}); const players = readPlayers(); const idx = players.findIndex(p=>Number(p.id)===id); if(idx===-1) return send(res,404,{ error:'Player not found'}); const removed = players.splice(idx,1)[0]; writePlayers(players); return send(res,200, removed); }

  send(res,404,{ error:'Unhandled route'});
});

server.listen(PORT, ()=>{ console.log(`📝 players.json CRUD server running at http://localhost:${PORT}`); });
