/**
 * Testing utilities for @punyts/state-react
 * 
 * Provides tools for creating and manipulating test state instances
 * without needing to mock hooks or providers.
 */

import { createStore } from '@punyts/state';

/**
 * Creates a mutable test state instance that can be used with StateProvider.
 * 
 * @example
 * ```typescript
 * import { createTestState } from '@punyts/state-react/testing';
 * import { StateProvider } from '@punyts/state-react';
 * 
 * const testState = createTestState<AppState>({
 *   ui: { sidebar: { isOpen: false } }
 * });
 * 
 * render(
 *   <StateProvider state={testState}>
 *     <MyComponent />
 *   </StateProvider>
 * );
 * 
 * // State is directly inspectable via the root proxy on `state`
 * // (paths are root-relative; no leading `$` needed when using the proxy)
 * expect(testState.state.ui.sidebar.isOpen).toBe(false);
 * 
 * // And directly mutable
 * testState.state.ui.sidebar.isOpen = true;
 * ```
 * 
 * @param initialState - Optional initial state object. Can be partial.
 * @returns A mutable state store instance; use `store.state` to access the root proxy
 */
export function createTestState<TState extends Record<string, any>>(
    initialState?: Partial<TState>
): ReturnType<typeof createStore<TState>> {
    return createStore<TState>(initialState as TState);
}
