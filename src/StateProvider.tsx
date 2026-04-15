import { ReactNode, useContext, useRef } from "react";
import { createStateHookFactory } from "./createStateHook.js";
import { createStore, Store } from "@punyts/state";
import React from "react";

interface StateProviderProps<R> {
    initialState?: R;
    state?: Store<R>;
    children: ReactNode;
}

interface StateContextValue<R> {
    store: Store<R>;
    createStateHook: ReturnType<typeof createStateHookFactory<R>>['createStateHook'];
}

const StateContext = React.createContext<StateContextValue<any> | null>(null);

export const StateProvider = <R,>({ initialState, state, children }: StateProviderProps<R>) => {
    const lastInitialStateRef = useRef<R | undefined>(initialState);
    const lastStateRef = useRef<Store<R> | undefined>(state);
    const storeEntryRef = useRef<StateContextValue<R> | null>(null);

    if (!storeEntryRef.current || initialState !== lastInitialStateRef.current || state !== lastStateRef.current) {
        const store = state || createStore<R>(initialState || ({} as R));
        const { createStateHook } = createStateHookFactory<R>(store);
        storeEntryRef.current = { store, createStateHook };
        lastInitialStateRef.current = initialState;
        lastStateRef.current = state;
    }

    return (
        <StateContext.Provider value={storeEntryRef.current!}>
            {children}
        </StateContext.Provider>
    );
}

export const useStateContext = <R,>() => {
    const context = useContext(StateContext);
    if (!context) {
        throw new Error("useStateContext must be used within a StateProvider");
    }
    return context as StateContextValue<R>;
}

export const useCreateStateHook = <R, S extends {[key: string | symbol]: any } | any[]>(
    path: string,
    initialState: S,
    listenToPaths?: string | string[],
    initializeIfMissing?: boolean
) => {
    return useStateContext<R>()
        .createStateHook<S>(
            path,
            initialState,
            listenToPaths,
            initializeIfMissing
        );
}

export const useStateStore = <R,>() => {
    return useStateContext<R>().store;
}