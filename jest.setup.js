/**
 * Jest Setup Configuration
 * Global mocks and setup for React Native testing environment
 */

// Define window globally before any imports
Object.defineProperty(global, 'window', {
    value: {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
        location: {
            href: 'http://localhost',
            origin: 'http://localhost',
            protocol: 'http:',
            host: 'localhost',
            pathname: '/',
            search: '',
            hash: ''
        },
        navigator: {
            userAgent: 'jest'
        },
        document: {
            createElement: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
        }
    },
    writable: true
});

// Mock AsyncStorage globally BEFORE any other imports
jest.mock('@react-native-async-storage/async-storage', () => {
    const mockStorage = {};
    return {
        getItem: jest.fn((key) => Promise.resolve(mockStorage[key] || null)),
        setItem: jest.fn((key, value) => {
            mockStorage[key] = value;
            return Promise.resolve();
        }),
        removeItem: jest.fn((key) => {
            delete mockStorage[key];
            return Promise.resolve();
        }),
        getAllKeys: jest.fn(() => Promise.resolve(Object.keys(mockStorage))),
        multiGet: jest.fn((keys) =>
            Promise.resolve(keys.map(key => [key, mockStorage[key] || null]))
        ),
        multiSet: jest.fn((keyValuePairs) => {
            keyValuePairs.forEach(([key, value]) => {
                mockStorage[key] = value;
            });
            return Promise.resolve();
        }),
        multiRemove: jest.fn((keys) => {
            keys.forEach(key => delete mockStorage[key]);
            return Promise.resolve();
        }),
        clear: jest.fn(() => {
            Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
            return Promise.resolve();
        }),
    };
});

// Mock Firebase App
jest.mock('firebase/app', () => ({
    initializeApp: jest.fn(() => ({ name: 'mock-app' })),
}));

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => ({
    getFirestore: jest.fn(() => ({ name: 'mock-firestore' })),
    collection: jest.fn(),
    doc: jest.fn(),
    addDoc: jest.fn(() => Promise.resolve({ id: 'mock-doc-id' })),
    updateDoc: jest.fn(() => Promise.resolve()),
    deleteDoc: jest.fn(() => Promise.resolve()),
    getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
    getDoc: jest.fn(() => Promise.resolve({ exists: () => false, data: () => null })),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    onSnapshot: jest.fn(),
    Timestamp: {
        now: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
        fromDate: jest.fn((date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 })),
    },
}));

// Mock Firebase Auth
jest.mock('firebase/auth', () => ({
    getAuth: jest.fn(() => ({ name: 'mock-auth' })),
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChanged: jest.fn(),
    initializeAuth: jest.fn(() => ({ name: 'mock-auth' })),
    getReactNativePersistence: jest.fn(),
}));

// Mock Firebase Config
jest.mock('./firebaseConfig', () => ({
    db: { name: 'mock-firestore' },
    auth: { name: 'mock-auth' },
}));

// Mock React Native modules
jest.mock('react-native', () => ({
    Platform: {
        OS: 'ios',
        select: jest.fn((obj) => obj.ios),
    },
    Dimensions: {
        get: jest.fn(() => ({ width: 375, height: 667 })),
    },
    Alert: {
        alert: jest.fn(),
    },
    StyleSheet: {
        create: jest.fn((styles) => styles),
    },
    View: 'View',
    Text: 'Text',
    TouchableOpacity: 'TouchableOpacity',
    ScrollView: 'ScrollView',
    TextInput: 'TextInput',
    Modal: 'Modal',
    FlatList: 'FlatList',
    Image: 'Image',
    Pressable: 'Pressable',
}));

// Mock Expo modules
jest.mock('expo-constants', () => ({
    default: {
        expoConfig: {
            extra: {
                firebaseConfig: {},
            },
        },
    },
}));

jest.mock('@expo/vector-icons', () => ({
    Ionicons: 'Ionicons',
    MaterialIcons: 'MaterialIcons',
    FontAwesome: 'FontAwesome',
    AntDesign: 'AntDesign',
}));

jest.mock('expo-font', () => ({
    loadAsync: jest.fn(() => Promise.resolve()),
    isLoaded: jest.fn(() => true),
}));

// Mock additional browser globals that might be accessed
global.localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};

global.sessionStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};

// Mock XMLHttpRequest
global.XMLHttpRequest = jest.fn(() => ({
    open: jest.fn(),
    send: jest.fn(),
    setRequestHeader: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn(() =>
    Promise.resolve({
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
        ok: true,
        status: 200,
    })
);

// Mock WebSocket
global.WebSocket = jest.fn(() => ({
    send: jest.fn(),
    close: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
}));

// Mock additional React Native specific modules that might access window
jest.mock('@react-native-community/netinfo', () => ({
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
}));

// Mock OfflineDataManager specifically to prevent window access
jest.mock('./services/OfflineDataManager', () => {
    const mockOfflineDataManager = {
        getInstance: jest.fn(() => ({
            setConnectionStatus: jest.fn(),
            addToSyncQueue: jest.fn(),
            processSyncQueue: jest.fn(() => Promise.resolve({ processed: 0, failed: 0 })),
            getSyncQueueLength: jest.fn(() => 0),
            cacheProducts: jest.fn(),
            getCachedProducts: jest.fn(() => Promise.resolve([])),
            cacheClients: jest.fn(),
            getCachedClients: jest.fn(() => Promise.resolve([])),
            clearCache: jest.fn(),
            getSyncStats: jest.fn(() => Promise.resolve({})),
            getOfflineStats: jest.fn(() => Promise.resolve({})),
            retryFailedItem: jest.fn(() => Promise.resolve(true)),
            clearFailedItems: jest.fn(),
        })),
    };
    return {
        __esModule: true,
        default: mockOfflineDataManager,
    };
});

// Mock hooks that use OfflineDataManager
jest.mock('./hooks/useOfflineOperations', () => ({
    __esModule: true,
    default: jest.fn(() => ({
        isOnline: true,
        syncQueueLength: 0,
        processSyncQueue: jest.fn(),
        addToSyncQueue: jest.fn(),
    })),
}));

jest.mock('./hooks/useNetworkStatus', () => ({
    __esModule: true,
    default: jest.fn(() => ({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
    })),
}));

// Global test environment setup
global.console = {
    ...console,
    // Suppress console.log in tests unless needed
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};

// Setup fake timers if needed
// jest.useFakeTimers();