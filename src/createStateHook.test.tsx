import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createStore } from '@punyts/state';
import { createStateHook } from './createStateHook.js';

interface DialogState {
    value: string;
    extra?: string;
}

interface RootState {
    ui: {
        dialog?: DialogState;
    };
}

describe('createStateHook', () => {
    it('should initialize missing state when requested', () => {
        const store = createStore<RootState>({ ui: {} });

        const { result } = renderHook(() =>
            createStateHook<RootState, DialogState>(
                store,
                'ui.dialog',
                { value: 'default' },
                undefined,
                true
            )
        );

        expect(result.current.value).toBe('default');
        expect(store.get<DialogState>('ui.dialog').value).toBe('default');
    });

    it('should not apply initial state when state already exists', () => {
        const store = createStore<RootState>({
            ui: {
                dialog: { value: 'existing' }
            }
        });

        const initialState: DialogState = { value: 'default', extra: 'should-not-appear' };

        const { result } = renderHook(() =>
            createStateHook<RootState, DialogState>(
                store,
                'ui.dialog',
                initialState,
                undefined,
                true
            )
        );

        expect(result.current.value).toBe('existing');
        const storedState = store.get<DialogState>('ui.dialog');
        expect(storedState.value).toBe('existing');
        expect(storedState.extra).toBeUndefined();
    });
});
