# @punyts/state-react

React bindings for the @punyts/state real-time state management system.

## Installation

```bash
npm install @punyts/state-react @punyts/state
```

## Core Features

- **StateProvider** - Context provider for state store
- **useCreateStateHook** - Hook for accessing and subscribing to state slices
- **Testing Utilities** - Standardized test helpers for React components

## Quick Start

```typescript
import { StateProvider, useCreateStateHook } from '@punyts/state-react';
import { createStore } from '@punyts/state';

// 1. Create your state store
const store = createStore({ count: 0, user: { name: 'John' } });

// 2. Wrap your app with StateProvider
function App() {
  return (
    <StateProvider state={store}>
      <Counter />
    </StateProvider>
  );
}

// 3. Access state in components
function Counter() {
  const state = useCreateStateHook('$', { count: 0 }, ['.count']);
  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => state.count++}>Increment</button>
    </div>
  );
}
```

## Testing

See [testUtils.tsx](./src/testUtils.tsx) for comprehensive testing utilities and patterns.

### Testing Pattern

```typescript
import { renderWithState } from '@punyts/state-react';
import { render, screen } from '@testing-library/react';

it('should render user name', () => {
  const { wrapper } = renderWithState({
    configure: (state) => {
      state.user = { name: 'Jane' };
    }
  });
  
  render(<UserProfile />, { wrapper });
  expect(screen.getByText('Jane')).toBeInTheDocument();
});
```

## Documentation

- **StateProvider**: See [StateProvider.tsx](./src/StateProvider.tsx)
- **useCreateStateHook**: See [createStateHook.ts](./src/createStateHook.ts)
- **Testing Utilities**: See [testUtils.tsx](./src/testUtils.tsx)
