/** Central event bus — the only communication channel between React and Phaser */

type EventCallback = (...args: unknown[]) => void;

class EventBridgeClass {
  private listeners = new Map<string, Set<EventCallback>>();

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: string, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach((cb) => cb(...args));
  }
}

export const EventBridge = new EventBridgeClass();
