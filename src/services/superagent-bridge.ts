/**
 * SuperAgent WebSocket Bridge
 * Real-time communication between frontend and SuperAgent backend
 * Streams agent actions, cursor position, thinking process
 */

import { io, Socket } from 'socket.io-client';
import { AgentCursorPosition } from '@/components/AgentCursor';
import { AgentStatus } from '@/components/AgentOverlay';

export interface AgentTaskRequest {
  task: string;
  useEnhanced?: boolean;
  timeout?: number;
}

export interface AgentActionUpdate {
  type: 'action' | 'thinking' | 'plan' | 'status' | 'cursor' | 'complete' | 'error';
  data: any;
}

class SuperAgentBridge {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private cursorPosition: AgentCursorPosition = { x: 0, y: 0, visible: false };
  private agentStatus: AgentStatus = { isActive: false };
  private currentTaskId: string | null = null;

  constructor() {
    this.connect();
  }

  private connect() {
    // Connect to SuperAgent backend
    const backendUrl = import.meta.env.VITE_AGENT_API_URL || 'http://localhost:10000';
    
    this.socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to SuperAgent backend');
      this.emit('connection', { status: 'connected' });
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from SuperAgent backend');
      this.emit('connection', { status: 'disconnected' });
    });

    // Listen for agent updates
    this.socket.on('agent:action', (data) => {
      this.handleAgentAction(data);
    });

    this.socket.on('agent:cursor', (data) => {
      this.handleCursorUpdate(data);
    });

    this.socket.on('agent:status', (data) => {
      this.handleStatusUpdate(data);
    });

    this.socket.on('agent:complete', (data) => {
      this.handleTaskComplete(data);
    });

    this.socket.on('agent:error', (data) => {
      this.handleError(data);
    });
  }

  private handleAgentAction(data: any) {
    console.log('Agent action:', data);
    
    // Update status with current action
    this.agentStatus = {
      ...this.agentStatus,
      currentAction: data.action,
      actionsCompleted: (this.agentStatus.actionsCompleted || 0) + 1,
    };

    // Update cursor position if action has coordinates
    if (data.x !== undefined && data.y !== undefined) {
      this.cursorPosition = {
        x: data.x,
        y: data.y,
        action: data.type?.toLowerCase(),
        text: data.action,
        visible: true,
      };
      this.emit('cursor', this.cursorPosition);
    }

    this.emit('action', data);
    this.emit('status', this.agentStatus);
  }

  private handleCursorUpdate(data: any) {
    this.cursorPosition = {
      x: data.x || 0,
      y: data.y || 0,
      action: data.action,
      text: data.text,
      visible: data.visible !== false,
    };
    this.emit('cursor', this.cursorPosition);
  }

  private handleStatusUpdate(data: any) {
    console.log('Agent status:', data);
    
    this.agentStatus = {
      ...this.agentStatus,
      ...data,
      isActive: true,
    };

    this.emit('status', this.agentStatus);
  }

  private handleTaskComplete(data: any) {
    console.log('Task complete:', data);
    
    this.agentStatus = {
      ...this.agentStatus,
      isActive: false,
      currentAction: undefined,
      thinking: undefined,
    };

    this.cursorPosition = {
      ...this.cursorPosition,
      action: 'success',
      text: 'Task completed!',
    };

    this.emit('complete', data);
    this.emit('status', this.agentStatus);
    this.emit('cursor', this.cursorPosition);

    // Hide cursor after 2 seconds
    setTimeout(() => {
      this.cursorPosition.visible = false;
      this.emit('cursor', this.cursorPosition);
    }, 2000);

    this.currentTaskId = null;
  }

  private handleError(data: any) {
    console.error('Agent error:', data);
    
    this.agentStatus = {
      ...this.agentStatus,
      isActive: false,
      error: data.error || 'Unknown error occurred',
    };

    this.cursorPosition = {
      ...this.cursorPosition,
      action: 'error',
      text: 'Error occurred',
    };

    this.emit('error', data);
    this.emit('status', this.agentStatus);
    this.emit('cursor', this.cursorPosition);

    this.currentTaskId = null;
  }

  // Public API
  public executeTask(request: AgentTaskRequest): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error('Not connected to SuperAgent backend'));
        return;
      }

      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.currentTaskId = taskId;

      // Reset state
      this.agentStatus = {
        isActive: true,
        currentTask: request.task,
        actionsCompleted: 0,
      };

      this.cursorPosition = {
        x: 960, // Center of 1920x1080
        y: 540,
        visible: true,
        action: 'thinking',
        text: 'Starting task...',
      };

      this.emit('status', this.agentStatus);
      this.emit('cursor', this.cursorPosition);

      // Send task to backend
      this.socket.emit('agent:execute', {
        taskId,
        task: request.task,
        useEnhanced: request.useEnhanced !== false,
        timeout: request.timeout || 300,
      });

      // Wait for completion
      const completeListener = (data: any) => {
        if (data.taskId === taskId) {
          this.off('complete', completeListener);
          this.off('error', errorListener);
          resolve(data);
        }
      };

      const errorListener = (data: any) => {
        if (data.taskId === taskId || !data.taskId) {
          this.off('complete', completeListener);
          this.off('error', errorListener);
          reject(new Error(data.error || 'Task failed'));
        }
      };

      this.on('complete', completeListener);
      this.on('error', errorListener);

      // Timeout
      setTimeout(() => {
        if (this.currentTaskId === taskId) {
          this.off('complete', completeListener);
          this.off('error', errorListener);
          reject(new Error('Task timeout'));
        }
      }, (request.timeout || 300) * 1000 + 5000);
    });
  }

  public cancelCurrentTask() {
    if (this.socket && this.currentTaskId) {
      this.socket.emit('agent:cancel', { taskId: this.currentTaskId });
      this.currentTaskId = null;
      
      this.agentStatus = {
        isActive: false,
      };
      
      this.cursorPosition.visible = false;
      
      this.emit('status', this.agentStatus);
      this.emit('cursor', this.cursorPosition);
    }
  }

  public getCursorPosition(): AgentCursorPosition {
    return this.cursorPosition;
  }

  public getAgentStatus(): AgentStatus {
    return this.agentStatus;
  }

  // Event handling
  public on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  public off(event: string, callback: (data: any) => void) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emit(event: string, data: any) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }
}

// Singleton instance
export const superAgentBridge = new SuperAgentBridge();

export default superAgentBridge;
