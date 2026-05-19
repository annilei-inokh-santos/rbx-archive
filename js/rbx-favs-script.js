/* ════════════════════════════════════════
   rbx-favs-script.js
   FAVORITES MANAGEMENT SYSTEM
   ════════════════════════════════════════ */

const FavoritesSystem = (function() {
    // Private variables
    const STORAGE_KEY = 'rbx_favorites';
    let favorites = [];
    let subscribers = [];
    
    // Private methods
    function loadFromStorage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                favorites = JSON.parse(stored);
                // Validate - ensure array and filter out invalid entries
                if (!Array.isArray(favorites)) {
                    favorites = [];
                }
            } else {
                favorites = [];
            }
        } catch (e) {
            console.warn('Failed to load favorites from localStorage:', e);
            favorites = [];
        }
    }
    
    function saveToStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
            return true;
        } catch (e) {
            console.warn('Failed to save favorites to localStorage:', e);
            return false;
        }
    }
    
    function notifySubscribers(action, gameId) {
        subscribers.forEach(callback => {
            try {
                callback(action, gameId, [...favorites]);
            } catch (e) {
                console.warn('Subscriber callback error:', e);
            }
        });
    }
    
    // Initialize
    loadFromStorage();
    
    // Public API
    return {
        // Get all favorite IDs
        getAll: function() {
            return [...favorites];
        },
        
        // Check if a game is favorited
        isFavorite: function(gameId) {
            return favorites.includes(gameId);
        },
        
        // Add a favorite
        add: function(gameId) {
            if (!this.isFavorite(gameId)) {
                favorites.push(gameId);
                saveToStorage();
                notifySubscribers('add', gameId);
                return true;
            }
            return false;
        },
        
        // Remove a favorite
        remove: function(gameId) {
            const index = favorites.indexOf(gameId);
            if (index !== -1) {
                favorites.splice(index, 1);
                saveToStorage();
                notifySubscribers('remove', gameId);
                return true;
            }
            return false;
        },
        
        // Toggle favorite status
        toggle: function(gameId) {
            if (this.isFavorite(gameId)) {
                this.remove(gameId);
                return false;
            } else {
                this.add(gameId);
                return true;
            }
        },
        
        // Get count of favorites
        getCount: function() {
            return favorites.length;
        },
        
        // Subscribe to changes (returns unsubscribe function)
        subscribe: function(callback) {
            subscribers.push(callback);
            // Return unsubscribe function
            return function() {
                const index = subscribers.indexOf(callback);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
            };
        },
        
        // Clear all favorites
        clearAll: function() {
            favorites = [];
            saveToStorage();
            notifySubscribers('clear', null);
        },
        
        // Get favorite game objects (filtered from GAMES array)
        getFavoriteGames: function(gamesArray) {
            return gamesArray.filter(game => this.isFavorite(game.id));
        }
    };
})();

// Make available globally
window.FavoritesSystem = FavoritesSystem;