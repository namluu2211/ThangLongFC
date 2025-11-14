/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { FilePlayerCrudService } from '../file-player-crud.service';
import { Player } from '../../player-utils';

describe('FilePlayerCrudService', () => {
  let service: FilePlayerCrudService;
  const mockPlayers: Player[] = [
    { id: 1, firstName: 'John', lastName: 'Doe', position: 'Tiền đạo' },
    { id: 2, firstName: 'Jane', lastName: 'Smith', position: 'Thủ môn' }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FilePlayerCrudService]
    });
    service = TestBed.inject(FilePlayerCrudService);
    
    // Clear localStorage before each test
    localStorage.clear();
    
    // Clear any pending fetch mocks
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAll', () => {
    it('should return empty array when localStorage is empty', async () => {
      const result = await service.getAll();
      expect(result).toEqual([]);
    });

    it('should fetch from server when enabled', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlayers
      });

      // Enable feature via private property (for testing)
      (service as any).enabled = true;

      const result = await service.getAll();
      
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:5055/players');
      expect(result).toEqual(mockPlayers);
    });

    it('should fallback to local storage when fetch fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      (service as any).enabled = true;

      localStorage.setItem('players_file_fallback', JSON.stringify(mockPlayers));

      const result = await service.getAll();
      expect(result).toEqual(mockPlayers);
    });

    it('should return empty array if localStorage parsing fails', async () => {
      localStorage.setItem('players_file_fallback', 'invalid json');
      
      const result = await service.getAll();
      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create player locally when disabled', async () => {
      const newPlayer = { firstName: 'New', lastName: 'Player', position: 'Tiền vệ' };
      
      const result = await service.create(newPlayer);
      
      expect(result).toBeTruthy();
      expect(result?.firstName).toBe('New');
      expect(result?.id).toBe(1);
    });

    it('should assign incremental IDs', async () => {
      await service.create({ firstName: 'First' });
      const result = await service.create({ firstName: 'Second' });
      
      expect(result?.id).toBe(2);
    });

    it('should send POST request when enabled', async () => {
      const newPlayer = { firstName: 'Server', lastName: 'Player' };
      const createdPlayer = { id: 10, ...newPlayer, position: 'Chưa xác định' };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => createdPlayer
      });
      (service as any).enabled = true;

      const result = await service.create(newPlayer);
      
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5055/players',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newPlayer)
        })
      );
      expect(result).toEqual(createdPlayer);
    });

    it('should fallback to local when server fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Server error'));
      (service as any).enabled = true;

      const result = await service.create({ firstName: 'Fallback' });
      
      expect(result?.firstName).toBe('Fallback');
      expect(result?.id).toBe(1);
    });

    it('should set default position if not provided', async () => {
      const result = await service.create({ firstName: 'NoPosition' });
      expect(result?.position).toBe('Chưa xác định');
    });
  });

  describe('update', () => {
    beforeEach(() => {
      localStorage.setItem('players_file_fallback', JSON.stringify(mockPlayers));
    });

    it('should update player locally', async () => {
      const updates = { firstName: 'Updated' };
      
      const result = await service.update(1, updates);
      
      expect(result?.firstName).toBe('Updated');
      expect(result?.lastName).toBe('Doe'); // Preserved
      expect(result?.id).toBe(1); // ID preserved
    });

    it('should return null for non-existent player', async () => {
      const result = await service.update(999, { firstName: 'Ghost' });
      expect(result).toBeNull();
    });

    it('should send PUT request when enabled', async () => {
      const updates = { firstName: 'ServerUpdate' };
      const updated = { ...mockPlayers[0], ...updates };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => updated
      });
      (service as any).enabled = true;

      const result = await service.update(1, updates);
      
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5055/players/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updates)
        })
      );
      expect(result).toEqual(updated);
    });

    it('should fallback to local when server fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Update error'));
      (service as any).enabled = true;

      const result = await service.update(1, { firstName: 'FallbackUpdate' });
      expect(result?.firstName).toBe('FallbackUpdate');
    });

    it('should preserve player ID during update', async () => {
      const result = await service.update(1, { id: 999, firstName: 'Hacked' });
      expect(result?.id).toBe(1); // Should preserve original ID
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      localStorage.setItem('players_file_fallback', JSON.stringify(mockPlayers));
    });

    it('should delete player locally', async () => {
      const result = await service.delete(1);
      
      expect(result).toBe(true);
      
      const remaining = await service.getAll();
      expect(remaining.length).toBe(1);
      expect(remaining[0].id).toBe(2);
    });

    it('should return false for non-existent player', async () => {
      const result = await service.delete(999);
      expect(result).toBe(false);
    });

    it('should send DELETE request when enabled', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });
      (service as any).enabled = true;

      const result = await service.delete(1);
      
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5055/players/1',
        expect.objectContaining({ method: 'DELETE' })
      );
      expect(result).toBe(true);
    });

    it('should fallback to local when server fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Delete error'));
      (service as any).enabled = true;

      const result = await service.delete(1);
      expect(result).toBe(true);
      
      const remaining = await service.getAll();
      expect(remaining.length).toBe(1);
    });
  });

  describe('localStorage integration', () => {
    it('should handle localStorage quota exceeded gracefully', async () => {
      // Mock localStorage.setItem to throw
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = jest.fn().mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      // Should not throw
      await expect(service.create({ firstName: 'Test' })).resolves.toBeTruthy();

      // Restore
      Storage.prototype.setItem = originalSetItem;
    });

    it('should persist changes across operations', async () => {
      await service.create({ firstName: 'First' });
      await service.create({ firstName: 'Second' });
      
      const all = await service.getAll();
      expect(all.length).toBe(2);
      
      await service.update(1, { firstName: 'Updated' });
      await service.delete(2);
      
      const final = await service.getAll();
      expect(final.length).toBe(1);
      expect(final[0].firstName).toBe('Updated');
    });
  });
});
