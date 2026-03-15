// RealtimeCollaborationService - Real-time synchronization and presence
// Requirements: 6.1, 27.1-27.10

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Comment } from '../types/comment';

export interface PresenceState {
  userId: string;
  username: string;
  avatarUrl: string;
  cursorPosition: { line: number; column: number };
  lastActivity: Date;
}

export interface PolicyChange {
  type: 'version_created' | 'state_changed' | 'comment_added' | 'comment_resolved';
  policyId: string;
  userId: string;
  timestamp: Date;
  data: any;
}

export interface PendingChange {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
  retryCount: number;
}

export interface SyncResult {
  synced: string[];
  conflicts: ConflictResolution[];
  failed: string[];
}

export interface ConflictResolution {
  changeId: string;
  strategy: 'last_write_wins' | 'manual_merge';
  resolved: boolean;
  error?: string;
}

export class RealtimeCollaborationService {
  private supabase: SupabaseClient;
  private channels: Map<string, RealtimeChannel> = new Map();
  private offlineQueue: PendingChange[] = [];
  private isOnline: boolean = navigator.onLine;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    const url = supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
    const key = supabaseKey || import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error('Supabase URL and anon key are required');
    }

    this.supabase = createClient(url, key);
    this.setupOnlineListener();
  }

  /**
   * Subscribes to policy changes
   * Requirements: 27.1, 27.2
   */
  async subscribeToPolicyChanges(
    policyId: string,
    callback: (change: PolicyChange) => void
  ): Promise<() => void> {
    const channelName = `policy:${policyId}`;
    
    // Check if channel already exists
    if (this.channels.has(channelName)) {
      console.warn(`Already subscribed to policy ${policyId}`);
      return () => this.unsubscribeFromPolicy(policyId);
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'policy_versions',
          filter: `policy_id=eq.${policyId}`,
        },
        (payload) => {
          const change: PolicyChange = {
            type: 'version_created',
            policyId,
            userId: payload.new?.created_by || 'unknown',
            timestamp: new Date(),
            data: payload.new,
          };
          callback(change);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'policies',
          filter: `id=eq.${policyId}`,
        },
        (payload) => {
          const change: PolicyChange = {
            type: 'state_changed',
            policyId,
            userId: payload.new?.updated_by || 'unknown',
            timestamp: new Date(),
            data: payload.new,
          };
          callback(change);
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);

    // Return unsubscribe function
    return () => this.unsubscribeFromPolicy(policyId);
  }

  /**
   * Subscribes to comment updates
   * Requirements: 27.1, 27.2
   */
  async subscribeToComments(
    policyId: string,
    callback: (comment: Comment) => void
  ): Promise<() => void> {
    const channelName = `comments:${policyId}`;
    
    // Check if channel already exists
    if (this.channels.has(channelName)) {
      console.warn(`Already subscribed to comments for policy ${policyId}`);
      return () => this.unsubscribeFromComments(policyId);
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `policy_id=eq.${policyId}`,
        },
        (payload) => {
          if (payload.new) {
            const comment: Comment = {
              id: payload.new.id,
              policyId: payload.new.policy_id,
              versionId: payload.new.version_id,
              lineNumber: payload.new.line_number,
              content: payload.new.content,
              authorId: payload.new.author_id,
              resolved: payload.new.resolved,
              mentions: payload.new.mentions || [],
              createdAt: new Date(payload.new.created_at),
              updatedAt: new Date(payload.new.updated_at),
            };
            callback(comment);
          }
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);

    // Return unsubscribe function
    return () => this.unsubscribeFromComments(policyId);
  }

  /**
   * Broadcasts user presence
   * Requirements: 27.3, 27.5
   */
  async broadcastPresence(
    workspaceId: string,
    userId: string,
    presence: Partial<PresenceState>
  ): Promise<void> {
    const channelName = `workspace:${workspaceId}`;
    
    let channel = this.channels.get(channelName);
    
    if (!channel) {
      channel = this.supabase.channel(channelName);
      this.channels.set(channelName, channel);
      await channel.subscribe();
    }

    const presenceData: PresenceState = {
      userId,
      username: presence.username || 'Unknown',
      avatarUrl: presence.avatarUrl || '',
      cursorPosition: presence.cursorPosition || { line: 0, column: 0 },
      lastActivity: new Date(),
    };

    await channel.track(presenceData);
  }

  /**
   * Gets active users on a workspace
   * Requirements: 27.3, 27.5
   */
  async getActiveUsers(workspaceId: string): Promise<PresenceState[]> {
    const channelName = `workspace:${workspaceId}`;
    
    let channel = this.channels.get(channelName);
    
    if (!channel) {
      channel = this.supabase.channel(channelName);
      this.channels.set(channelName, channel);
      await channel.subscribe();
    }

    const presenceState = channel.presenceState();
    const activeUsers: PresenceState[] = [];

    // Flatten presence state
    Object.values(presenceState).forEach((presences: any) => {
      presences.forEach((presence: any) => {
        activeUsers.push({
          userId: presence.userId,
          username: presence.username,
          avatarUrl: presence.avatarUrl,
          cursorPosition: presence.cursorPosition,
          lastActivity: new Date(presence.lastActivity),
        });
      });
    });

    return activeUsers;
  }

  /**
   * Handles offline queue sync
   * Requirements: 27.6, 27.7, 27.8
   */
  async syncOfflineChanges(changes: PendingChange[]): Promise<SyncResult> {
    const result: SyncResult = {
      synced: [],
      conflicts: [],
      failed: [],
    };

    if (!this.isOnline) {
      console.warn('Cannot sync offline changes: still offline');
      return result;
    }

    // Sort changes by timestamp to maintain order
    const sortedChanges = [...changes].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    for (const change of sortedChanges) {
      try {
        await this.applyChange(change);
        result.synced.push(change.id);
      } catch (error) {
        console.error(`Failed to sync change ${change.id}:`, error);
        
        // Check if it's a conflict
        if (this.isConflict(error)) {
          result.conflicts.push({
            changeId: change.id,
            strategy: 'last_write_wins',
            resolved: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        } else {
          result.failed.push(change.id);
        }
      }
    }

    // Clear synced changes from queue
    this.offlineQueue = this.offlineQueue.filter(
      (change) => !result.synced.includes(change.id)
    );

    return result;
  }

  /**
   * Queues a change for offline sync
   * Requirements: 27.6, 27.7
   */
  queueOfflineChange(type: string, data: any): void {
    const change: PendingChange = {
      id: crypto.randomUUID(),
      type,
      data,
      timestamp: new Date(),
      retryCount: 0,
    };

    this.offlineQueue.push(change);
    
    // Persist to localStorage
    this.persistOfflineQueue();
  }

  /**
   * Gets the current offline queue
   */
  getOfflineQueue(): PendingChange[] {
    return [...this.offlineQueue];
  }

  /**
   * Checks if the service is online
   */
  isServiceOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Unsubscribes from all channels
   */
  async unsubscribeAll(): Promise<void> {
    for (const [channelName, channel] of this.channels.entries()) {
      await channel.unsubscribe();
      this.channels.delete(channelName);
    }
  }

  // Private helper methods

  private async unsubscribeFromPolicy(policyId: string): Promise<void> {
    const channelName = `policy:${policyId}`;
    const channel = this.channels.get(channelName);
    
    if (channel) {
      await channel.unsubscribe();
      this.channels.delete(channelName);
    }
  }

  private async unsubscribeFromComments(policyId: string): Promise<void> {
    const channelName = `comments:${policyId}`;
    const channel = this.channels.get(channelName);
    
    if (channel) {
      await channel.unsubscribe();
      this.channels.delete(channelName);
    }
  }

  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      console.log('Connection restored, syncing offline changes...');
      this.isOnline = true;
      this.syncOfflineChanges(this.offlineQueue);
    });

    window.addEventListener('offline', () => {
      console.log('Connection lost, queuing changes for later sync...');
      this.isOnline = false;
    });
  }

  private async applyChange(change: PendingChange): Promise<void> {
    // Apply the change based on type
    switch (change.type) {
      case 'comment_added':
        await this.supabase.from('comments').insert(change.data);
        break;
      case 'comment_resolved':
        await this.supabase
          .from('comments')
          .update({ resolved: true })
          .eq('id', change.data.commentId);
        break;
      case 'reply_added':
        await this.supabase.from('comment_replies').insert(change.data);
        break;
      default:
        console.warn(`Unknown change type: ${change.type}`);
    }
  }

  private isConflict(error: any): boolean {
    // Check if error indicates a conflict (e.g., version mismatch)
    return (
      error?.code === '23505' || // Unique constraint violation
      error?.message?.includes('conflict') ||
      error?.message?.includes('version')
    );
  }

  private persistOfflineQueue(): void {
    try {
      localStorage.setItem(
        'tealtiger_offline_queue',
        JSON.stringify(this.offlineQueue)
      );
    } catch (error) {
      console.error('Failed to persist offline queue:', error);
    }
  }

  private loadOfflineQueue(): void {
    try {
      const stored = localStorage.getItem('tealtiger_offline_queue');
      if (stored) {
        this.offlineQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
    }
  }
}
