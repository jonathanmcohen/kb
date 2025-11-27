type Subscriber = (data: unknown) => void;

// In-memory subscriber registry per document id
const subscribers = new Map<string, Set<Subscriber>>();

export function addSubscriber(documentId: string, subscriber: Subscriber) {
    const set = subscribers.get(documentId) ?? new Set<Subscriber>();
    set.add(subscriber);
    subscribers.set(documentId, set);

    return () => {
        set.delete(subscriber);
        if (set.size === 0) {
            subscribers.delete(documentId);
        }
    };
}

export function broadcast(documentId: string, data: unknown) {
    const set = subscribers.get(documentId);
    if (!set) return;

    for (const subscriber of set) {
        try {
            subscriber(data);
        } catch (error) {
            console.error("SSE subscriber error:", error);
        }
    }
}
