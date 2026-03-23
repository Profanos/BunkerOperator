/** Central event bus — the only communication channel between React and Phaser */

type EventCallback = (...args: unknown[]) => void;

class EventBridgeClass {
  private listeners = new Map<string, Set<EventCallback>>();
  private anyListeners = new Set<EventCallback>();

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  /** Subscribe to every event — used by DebugManager to capture the event log */
  onAny(callback: EventCallback): void {
    this.anyListeners.add(callback);
  }

  offAny(callback: EventCallback): void {
    this.anyListeners.delete(callback);
  }

  emit(event: string, ...args: unknown[]): void {
    this.anyListeners.forEach((cb) => cb(event, ...args));
    this.listeners.get(event)?.forEach((cb) => cb(...args));
  }
}

export const EventBridge = new EventBridgeClass();
