/**
 * AI OS Agent Bridge Service
 * 
 * Connects the frontend to the backend container's ScreenAgent
 * Handles agent queries, real-time updates, and app coordination
 */

import { io, Socket } from 'socket.io-client';

export interface AgentQuery {
  userId: string;
  prompt: string;
  context?: any;
}

export interface AgentStep {
  action: string;
  app: string;
  result: string;
}

export interface AgentResponse {
  status: 'executing' | 'completed' | 'error';
  steps: AgentStep[];
  prompt: string;
  screenshot?: string;
  error?: string;
}

export interface AgentUpdate {
  userId: string;
  message: string;
  status: string;
  result?: AgentResponse;
}

export class AIOSAgentBridge {
  private baseUrl: string;
  private wsConnection: Socket | null = null;
  private userId: string;
  private updateCallbacks: ((update: AgentUpdate) => void)[] = [];

  constructor(userId: string, containerUrl?: string) {
    this.userId = userId;
    // Default to localhost for development, can be overridden
    this.baseUrl = containerUrl || 'http://localhost:8081';
  }

  /**
   * Execute an agent query
   */
  async executeQuery(prompt: string, context?: any): Promise<AgentResponse> {
    try {
      const query: AgentQuery = {
        userId: this.userId,
        prompt,
        context
      };

      const response = await fetch(`${this.baseUrl}/api/agent/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(query),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Agent returned an error');
      }

      const result: AgentResponse = await response.json();
      return result;
    } catch (error) {
      console.error('Error executing agent query:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time agent updates via WebSocket
   */
  subscribeToUpdates(callback: (update: AgentUpdate) => void): void {
    this.updateCallbacks.push(callback);

    // Connect to WebSocket if not already connected
    if (!this.wsConnection) {
      this.wsConnection = io(this.baseUrl, {
        transports: ['websocket', 'polling'],
      });

      this.wsConnection.on('connect', () => {
        console.log('Connected to AI OS Agent WebSocket');
        // Subscribe to updates for this user
        this.wsConnection?.emit('subscribe', { userId: this.userId });
      });

      this.wsConnection.on('agent_update', (update: AgentUpdate) => {
        console.log('Agent update:', update);
        // Notify all callbacks
        this.updateCallbacks.forEach(cb => cb(update));
      });

      this.wsConnection.on('disconnect', () => {
        console.log('Disconnected from AI OS Agent WebSocket');
      });

      this.wsConnection.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    }
  }

  /**
   * Unsubscribe from updates
   */
  unsubscribe(callback: (update: AgentUpdate) => void): void {
    this.updateCallbacks = this.updateCallbacks.filter(cb => cb !== callback);
    
    if (this.updateCallbacks.length === 0 && this.wsConnection) {
      this.wsConnection.disconnect();
      this.wsConnection = null;
    }
  }

  /**
   * List all open windows in the container
   */
  async listWindows(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/windows`);
      if (!response.ok) throw new Error('Failed to list windows');
      const data = await response.json();
      return data.windows || [];
    } catch (error) {
      console.error('Error listing windows:', error);
      return [];
    }
  }

  /**
   * List all available apps
   */
  async listApps(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/apps`);
      if (!response.ok) throw new Error('Failed to list apps');
      const data = await response.json();
      return data.apps || [];
    } catch (error) {
      console.error('Error listing apps:', error);
      return [];
    }
  }

  /**
   * Check if the agent service is healthy
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Get the Xpra streaming URL for this container
   */
  getStreamingUrl(): string {
    // Port 10005 is Xpra, 8081 is Agent API
    return this.baseUrl.replace(':8081', ':10005');
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    if (this.wsConnection) {
      this.wsConnection.disconnect();
      this.wsConnection = null;
    }
    this.updateCallbacks = [];
  }
}

/**
 * Singleton instance manager for agent bridges
 */
class AgentBridgeManager {
  private static bridges: Map<string, AIOSAgentBridge> = new Map();

  static getBridge(userId: string, containerUrl?: string): AIOSAgentBridge {
    if (!this.bridges.has(userId)) {
      this.bridges.set(userId, new AIOSAgentBridge(userId, containerUrl));
    }
    return this.bridges.get(userId)!;
  }

  static cleanup(userId: string): void {
    const bridge = this.bridges.get(userId);
    if (bridge) {
      bridge.disconnect();
      this.bridges.delete(userId);
    }
  }

  static cleanupAll(): void {
    this.bridges.forEach(bridge => bridge.disconnect());
    this.bridges.clear();
  }
}

export default AgentBridgeManager;
