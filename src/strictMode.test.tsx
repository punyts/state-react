import { describe, it, expect, vi, afterEach } from 'vitest';
import { StrictMode, FC } from 'react';
import { render, screen, act, cleanup } from '@testing-library/react';
import { Store } from '@punyts/state';
import { StateProvider, useCreateStateHook, useStateContext } from './StateProvider.js';

afterEach(cleanup);

interface ChatState {
    connected: boolean;
    messages: string[];
}

interface AppState {
    chat: ChatState;
}

const initialState: AppState = {
    chat: {
        connected: false,
        messages: [],
    },
};

describe('StrictMode compatibility', () => {
    it('should receive external state mutations after StrictMode double-mount', async () => {
        let storeRef: Store<AppState> | null = null;

        const Status: FC = () => {
            const { store } = useStateContext<AppState>();
            storeRef = store;

            const chat = useCreateStateHook<AppState, ChatState>(
                '$.chat',
                initialState.chat,
                ['$.chat', '$.chat.$all'],
            );

            return (
                <div>
                    <span data-testid="connected">{String(chat.connected)}</span>
                    <span data-testid="count">{chat.messages.length}</span>
                </div>
            );
        };

        render(
            <StrictMode>
                <StateProvider initialState={initialState}>
                    <Status />
                </StateProvider>
            </StrictMode>,
        );

        // Initial state: not connected
        expect(screen.getByTestId('connected').textContent).toBe('false');

        // Simulate external mutation (e.g., Socket.IO connect event)
        await act(async () => {
            const chat = storeRef!.get<ChatState>('$.chat');
            chat.connected = true;
        });

        // Component should have re-rendered with new value
        expect(screen.getByTestId('connected').textContent).toBe('true');
    });

    it('should receive multiple sequential state mutations', async () => {
        let storeRef: Store<AppState> | null = null;

        const Status: FC = () => {
            const { store } = useStateContext<AppState>();
            storeRef = store;

            const chat = useCreateStateHook<AppState, ChatState>(
                '$.chat',
                initialState.chat,
                ['$.chat', '$.chat.$all'],
            );

            return (
                <div>
                    <span data-testid="connected">{String(chat.connected)}</span>
                </div>
            );
        };

        render(
            <StrictMode>
                <StateProvider initialState={initialState}>
                    <Status />
                </StateProvider>
            </StrictMode>,
        );

        expect(screen.getByTestId('connected').textContent).toBe('false');

        // Connect
        await act(async () => {
            storeRef!.get<ChatState>('$.chat').connected = true;
        });
        expect(screen.getByTestId('connected').textContent).toBe('true');

        // Disconnect
        await act(async () => {
            storeRef!.get<ChatState>('$.chat').connected = false;
        });
        expect(screen.getByTestId('connected').textContent).toBe('false');

        // Reconnect
        await act(async () => {
            storeRef!.get<ChatState>('$.chat').connected = true;
        });
        expect(screen.getByTestId('connected').textContent).toBe('true');
    });

    it('should receive mutations from default subscription paths (no explicit listenToPaths)', async () => {
        let storeRef: Store<AppState> | null = null;

        const Status: FC = () => {
            const { store } = useStateContext<AppState>();
            storeRef = store;

            // No explicit listenToPaths — uses default [path, path.$every]
            const chat = useCreateStateHook<AppState, ChatState>(
                '$.chat',
                initialState.chat,
            );

            return <span data-testid="connected">{String(chat.connected)}</span>;
        };

        render(
            <StrictMode>
                <StateProvider initialState={initialState}>
                    <Status />
                </StateProvider>
            </StrictMode>,
        );

        expect(screen.getByTestId('connected').textContent).toBe('false');

        await act(async () => {
            storeRef!.get<ChatState>('$.chat').connected = true;
        });

        expect(screen.getByTestId('connected').textContent).toBe('true');
    });
});
