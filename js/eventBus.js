// A simple event bus to handle game events
class EventBus {
    constructor() {
        this.events = {};
    }

    // Subscribe to an event
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    // Unsubscribe from an event
    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }

    // Emit an event
    emit(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach(callback => callback(data));
    }
}

// Create a single instance to use throughout the game
export const eventBus = new EventBus();