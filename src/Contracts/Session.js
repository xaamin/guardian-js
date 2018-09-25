class Session {
    constructor() {
        this.sessions = [];
    }

    get(key, fallback = null) {
        throw new Error('Not implemented');
    }

    has(key) {
        throw new Error('Not implemented');
    }

    forget(key) {
        throw new Error('Not implemented');
    }

    pull(key) {
        throw new Error('Not implemented');
    }
}

module.exports = Session;