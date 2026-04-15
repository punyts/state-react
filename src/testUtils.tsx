/**
 * React Testing Utilities for @punyts/state-react
 * 
 * Provides a standardized pattern for testing React components that use
 * the @punyts/state system. This utility ensures proper state initialization,
 * proxy creation, and component wrapping for consistent test behavior.
 * 
 * @module testUtils
 */

import { ReactNode, ReactElement } from 'react';
import { StateProvider } from './StateProvider.js';
import { createStore } from '@punyts/state';

/**
 * Configuration function for setting up test state.
 * Called with plain state object BEFORE it becomes a proxy.
 * This ensures all state mutations happen on the raw object before
 * the store proxy is created, avoiding reactivity issues during setup.
 * 
 * @template TState - The shape of your application state
 * @param state - Plain state object (not yet a proxy)
 */
export type ConfigureState<TState> = (state: TState) => void;

/**
 * Options for renderWithState utility
 * @template TState - The shape of your application state
 */
export interface RenderWithStateOptions<TState> {
  /**
   * Callback to configure initial state before proxy creation.
   * Receives a plain JavaScript object that you can mutate directly.
   * 
   * @example
   * configure: (state) => {
   *   state.data.users['user-1'] = { id: 'user-1', name: 'Test' };
   *   state.ui.sidebar.isOpen = true;
   * }
   */
  configure?: ConfigureState<TState>;
  
  /**
   * Initial state object. If not provided, you should provide a configure function.
   */
  initialState?: TState;
}

/**
 * Return type for renderWithState utility
 * @template TState - The shape of your application state
 */
export interface RenderWithStateReturn<TState> {
  /**
   * Wrapper component to use with @testing-library/react's render function.
   * Provides StateProvider context with the configured store.
   * 
   * @example
   * render(<MyComponent />, { wrapper });
   */
  wrapper: ({ children }: { children: ReactNode }) => ReactElement;
  
  /**
   * Function to access the store instance for direct state inspection or manipulation.
   * 
   * @example
   * const store = getStore();
   * expect(store.get('$.ui.sidebar.isOpen')).toBe(true);
   */
  getStore: () => ReturnType<typeof createStore<TState>>;
}

/**
 * Render a React component with StateProvider for testing.
 * 
 * This utility follows the recommended pattern for testing components
 * that use the @punyts/state system:
 * 
 * 1. Create initial state object (plain JS object)
 * 2. Configure state via callback BEFORE proxy creation
 * 3. Create store with proxy from configured state
 * 4. Return wrapper component with StateProvider
 * 
 * **Why this pattern?**
 * - Avoids reactivity issues during state setup
 * - Ensures consistent store instance across test actions
 * - Prevents duplicate component renders
 * - Aligns with state-as-source-of-truth architecture
 * 
 * **Pattern Comparison:**
 * 
 * ❌ ANTI-PATTERN (mocking hooks):
 * ```typescript
 * vi.mock('../hooks/useMyHook');
 * vi.mocked(useMyHook).mockReturnValue({ data: mockData });
 * render(<StateProvider initialState={...}><Component /></StateProvider>);
 * ```
 * Issues: Multiple renders create separate state instances, mock doesn't
 * reflect real state behavior, hard to test state interactions
 * 
 * ✅ CORRECT PATTERN (configure state):
 * ```typescript
 * const { wrapper } = renderWithState({
 *   configure: (state) => {
 *     state.data.myData = mockData;
 *   }
 * });
 * render(<Component />, { wrapper });
 * ```
 * Benefits: Single store instance, real state behavior, easy to test interactions
 * 
 * @template TState - The shape of your application state
 * @param options - Configuration options for state setup
 * @returns Object containing wrapper component and store accessor
 * 
 * @example Basic usage
 * ```typescript
 * import { renderWithState } from '@punyts/state-react/testUtils';
 * import { render, screen } from '@testing-library/react';
 * 
 * const { wrapper } = renderWithState({
 *   configure: (state) => {
 *     state.data.users = {
 *       'user-1': { id: 'user-1', name: 'John', email: 'john@test.com' }
 *     };
 *     state.ui.sidebar.isOpen = false;
 *   }
 * });
 * 
 * render(<UserList />, { wrapper });
 * expect(screen.getByText('John')).toBeInTheDocument();
 * ```
 * 
 * @example With initialState
 * ```typescript
 * const { wrapper } = renderWithState({
 *   initialState: createDefaultAppState(),
 *   configure: (state) => {
 *     // Modify specific parts of the default state
 *     state.auth.isAuthenticated = true;
 *   }
 * });
 * ```
 * 
 * @example Accessing store in tests
 * ```typescript
 * const { wrapper, getStore } = renderWithState({
 *   configure: (state) => {
 *     state.data.count = 0;
 *   }
 * });
 * 
 * render(<Counter />, { wrapper });
 * 
 * // Verify state after user interaction
 * fireEvent.click(screen.getByText('Increment'));
 * const store = getStore();
 * expect(store.get('$.data.count')).toBe(1);
 * ```
 * 
 * @example Testing state transitions
 * ```typescript
 * const { wrapper, getStore } = renderWithState({
 *   configure: (state) => {
 *     state.data.status = 'idle';
 *   }
 * });
 * 
 * render(<StatusDisplay />, { wrapper });
 * 
 * // Simulate state change
 * const store = getStore();
 * const statusProxy = store.get('$.data');
 * statusProxy.status = 'loading';
 * 
 * await waitFor(() => {
 *   expect(screen.getByText('Loading...')).toBeInTheDocument();
 * });
 * ```
 */
export function renderWithState<TState extends Record<string, any>>(
  options?: RenderWithStateOptions<TState>
): RenderWithStateReturn<TState> {
  // Use provided initial state or empty object
  const initialState = options?.initialState ?? ({} as TState);
  
  // Configure state BEFORE creating proxy
  // This is critical: mutations on plain object before reactivity is added
  if (options?.configure) {
    options.configure(initialState);
  }
  
  // Create store with proxy from configured state
  const store = createStore<TState>(initialState);

  // Return wrapper component that provides the store
  const wrapper = ({ children }: { children: ReactNode }) => (
    <StateProvider state={store}>{children}</StateProvider>
  );

  return {
    wrapper,
    getStore: () => store,
  };
}
