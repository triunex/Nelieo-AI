/**
 * Simple HTTP-based SuperAgent Bridge
 * Works with existing /api/agent/task endpoint
 * Also listens to SocketIO events from backend for real-time updates
 */

import { AgentCursorPosition } from '@/components/AgentCursor';
import { AgentStatus } from '@/components/AgentOverlay';
import { AIOS_WS_URL, AIOS_API_URL } from '@/config/aios-backend';
import io, { Socket } from 'socket.io-client';

export interface AgentTaskRequest {
  task: string;
  useEnhanced?: boolean;
}

class SimpleAgentBridge {
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private cursorPosition: AgentCursorPosition = { x: 0, y: 0, visible: false };
  private agentStatus: AgentStatus = { isActive: false };
  private currentPollInterval: any = null;
  private socket: Socket | null = null;

  constructor() {
    console.log('SimpleAgentBridge initialized');
    this.connectWebSocket();
  }

  private connectWebSocket() {
    try {
      // Connect to backend SocketIO on the GCP VM
      this.socket = io(AIOS_WS_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      this.socket.on('connect', () => {
        console.log('✅ Connected to SuperAgent WebSocket');
      });

      this.socket.on('disconnect', () => {
        console.log('❌ Disconnected from SuperAgent WebSocket');
      });

      // Listen for agent updates from backend
      this.socket.on('agent_update', (data: any) => {
        console.log('📡 Agent update:', data);

        // Update cursor position if available
        if (data.action && data.x !== undefined && data.y !== undefined) {
          this.cursorPosition = {
            x: data.x,
            y: data.y,
            action: this.mapAction(data.action),
            text: data.message || data.action,
            visible: true,
          };
          this.emit('cursor', this.cursorPosition);
        }

        // CRITICAL: Only mark agent as active if it's actually running a complex task
        // Simple app opens or step_completed events should NOT trigger agent active state
        const isReallyActive = (data.status === 'running' || data.status === 'thinking')
          && data.status !== 'step_completed'
          && data.status !== 'completed'
          && data.status !== 'cancelled';

        // Update status
        const status: AgentStatus = {
          isActive: isReallyActive,
          currentTask: data.task,
          currentAction: data.action,
          thinking: data.message || data.thinking,
          planSteps: data.plan_steps,
          currentStepIndex: data.current_step,
          confidence: data.confidence,
          actionsCompleted: data.actions_completed,
        };

        // Fallback: if backend did not provide plan_steps but sent a 'plan' blob
        if ((!status.planSteps || status.planSteps.length === 0) && typeof data.plan === 'string') {
          // Attempt to split the plan into numbered steps
          const extracted = data.plan
            .split(/\n|\r|\d+\.|\- /)
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 3 && s.length < 140);
          if (extracted.length > 0) {
            status.planSteps = extracted.slice(0, 25); // cap for safety
          }
        }

        // Fallback 2: derive implicit steps from sequential actions
        if (!status.planSteps || status.planSteps.length === 0) {
          // Maintain a lightweight rolling list of recent unique actions
          const action = data.action?.toString()?.trim();
          if (action) {
            const existing = this.agentStatus.planSteps || [];
            if (!existing.includes(action)) {
              status.planSteps = [...existing, action];
            } else {
              status.planSteps = existing;
            }
          }
        }

        // If backend sends cancelled status, clear everything immediately
        if (data.status === 'cancelled') {
          this.agentStatus = {
            isActive: false,
            currentTask: undefined,
            currentAction: undefined,
            thinking: undefined,
            planSteps: undefined,
            currentStepIndex: undefined,
          };
          this.cursorPosition.visible = false;
        } else {
          this.agentStatus = { ...this.agentStatus, ...status };
        }

        this.emit('status', this.agentStatus);
      });

      // Listen for app_opened events from backend
      this.socket.on('app_opened', (data: any) => {
        console.log('📱 App opened from backend:', data);
        this.emit('app_opened', data);
      });

      this.socket.on('error', (error: any) => {
        console.error('WebSocket error:', error);
      });

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }

  private mapAction(action: string): AgentCursorPosition['action'] {
    const actionMap: { [key: string]: AgentCursorPosition['action'] } = {
      'click': 'click',
      'type': 'type',
      'typing': 'type',
      'wait': 'wait',
      'waiting': 'wait',
      'observe': 'observe',
      'observing': 'observe',
      'thinking': 'thinking',
      'success': 'success',
      'error': 'error',
    };
    return actionMap[action.toLowerCase()] || 'wait';
  }

  public async executeTask(request: AgentTaskRequest): Promise<any> {
    // Reset state
    this.agentStatus = {
      isActive: true,
      currentTask: request.task,
      actionsCompleted: 0,
      thinking: 'Starting task...',
    };

    this.cursorPosition = {
      x: 960,
      y: 540,
      visible: true,
      action: 'thinking',
      text: 'Analyzing task...',
    };

    this.emit('status', this.agentStatus);
    this.emit('cursor', this.cursorPosition);

    try {
      // Call backend API on the GCP VM
      const response = await fetch(`${AIOS_API_URL}/api/agent/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: request.task,
          userId: 'demo',
          context: {},
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // Update status with result
      // Check both 'success' and 'status' fields for compatibility
      const isSuccess = result.success === true || result.status === 'completed';

      if (isSuccess) {
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

        this.emit('complete', result);
      } else {
        throw new Error(result.error || 'Task failed');
      }

      this.emit('status', this.agentStatus);
      this.emit('cursor', this.cursorPosition);

      // Hide cursor after 2 seconds
      setTimeout(() => {
        this.cursorPosition.visible = false;
        this.emit('cursor', this.cursorPosition);
      }, 2000);

      return result;

    } catch (error: any) {
      this.agentStatus = {
        ...this.agentStatus,
        isActive: false,
        error: error.message,
      };

      this.cursorPosition = {
        ...this.cursorPosition,
        action: 'error',
        text: 'Error occurred',
      };

      this.emit('error', { error: error.message });
      this.emit('status', this.agentStatus);
      this.emit('cursor', this.cursorPosition);

      throw error;
    }
  }

  public cancelCurrentTask() {
    // Clear all agent state immediately
    this.agentStatus = {
      isActive: false,
      currentTask: undefined,
      currentAction: undefined,
      thinking: undefined,
      planSteps: undefined,
      currentStepIndex: undefined,
      confidence: undefined,
      actionsCompleted: undefined,
      estimatedTimeRemaining: undefined,
      error: undefined,
    };

    this.cursorPosition.visible = false;

    this.emit('status', this.agentStatus);
    this.emit('cursor', this.cursorPosition);
  }

  public getCursorPosition(): AgentCursorPosition {
    return this.cursorPosition;
  }

  public getAgentStatus(): AgentStatus {
    return this.agentStatus;
  }

  // Simulate cursor movement during task execution
  public simulateCursorMovement(action: string, x?: number, y?: number) {
    this.cursorPosition = {
      x: x || Math.random() * 1920,
      y: y || Math.random() * 1080,
      action: action as any,
      text: `Executing: ${action}`,
      visible: true,
    };
    this.emit('cursor', this.cursorPosition);
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
}

// Singleton instance
export const simpleAgentBridge = new SimpleAgentBridge();

export default simpleAgentBridge;
