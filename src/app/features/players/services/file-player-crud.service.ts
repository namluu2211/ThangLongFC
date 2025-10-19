import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { Player } from '../player-utils';

/**
 * FilePlayerCrudService
 * Uses dev-only Node server (players-file-server.js) for CRUD operations on players.json.
 * Falls back to client-side localStorage manipulation if server unreachable.
 */
@Injectable({ providedIn: 'root' })
export class FilePlayerCrudService {
  private readonly baseUrl = 'http://localhost:5055/players';
  private enabled = environment.features?.fileCrud === true;

  async getAll(): Promise<Player[]> {
    if(!this.enabled) return this.getFromLocalFallback();
    try { const resp = await fetch(this.baseUrl); if(!resp.ok) throw new Error('Failed'); return await resp.json(); } catch { return this.getFromLocalFallback(); }
  }
  async create(player: { firstName: string; lastName?: string; position?: string }): Promise<Player | null> {
    if(!this.enabled) return this.createLocal(player);
    try { const resp = await fetch(this.baseUrl, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(player) }); if(!resp.ok) throw new Error('Create failed'); return await resp.json(); } catch { return this.createLocal(player); }
  }
  async update(id: number, updates: Partial<Player> | Partial<{ firstName: string; lastName?: string; position?: string; height?: number; weight?: number; dateOfBirth?: string; avatar?: string; note?: string; }>): Promise<Player | null> {
    if(!this.enabled) return this.updateLocal(id, updates);
    try { const resp = await fetch(`${this.baseUrl}/${id}`, { method:'PUT', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(updates) }); if(!resp.ok) throw new Error('Update failed'); return await resp.json(); } catch { return this.updateLocal(id, updates); }
  }
  async delete(id: number): Promise<boolean> {
    if(!this.enabled) return this.deleteLocal(id);
    try { const resp = await fetch(`${this.baseUrl}/${id}`, { method:'DELETE' }); if(!resp.ok) throw new Error('Delete failed'); await resp.json(); return true; } catch { return this.deleteLocal(id); }
  }

  // Local fallback (persist into localStorage only, not players.json)
  private getFromLocalFallback(): Player[] { try { const raw = localStorage.getItem('players_file_fallback'); return raw? JSON.parse(raw): []; } catch { return []; } }
  private saveLocal(players: Player[]): void { try { localStorage.setItem('players_file_fallback', JSON.stringify(players)); } catch { /* ignore */ } }
  private createLocal(p: { firstName: string; lastName?: string; position?: string }): Player { const players = this.getFromLocalFallback(); const newPlayer: Player = { id: players.length? Math.max(...players.map(x=>x.id))+1:1, firstName: p.firstName, lastName: p.lastName||'', position: p.position||'Chưa xác định' }; players.push(newPlayer); this.saveLocal(players); return newPlayer; }
  private updateLocal(id: number, u: Partial<Player>): Player | null { const players = this.getFromLocalFallback(); const idx = players.findIndex(p=>p.id===id); if(idx===-1) return null; players[idx] = { ...players[idx], ...u, id }; this.saveLocal(players); return players[idx]; }
  private deleteLocal(id: number): boolean { const players = this.getFromLocalFallback(); const idx = players.findIndex(p=>p.id===id); if(idx===-1) return false; players.splice(idx,1); this.saveLocal(players); return true; }
}
