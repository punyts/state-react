import { ReactNode, useContext } from "react";
import { createStateHookFactory } from "./createStateHook.js";
import { createStore, Store } from "@punyts/state";
import React from "react";

interface StateProviderProps<R> {
    initialState?: R;
    children: ReactNode;
}

interface StateContextValue<R> {
    store: Store<R>;
    createStateHook: ReturnType<typeof createStateHookFactory<R>>['createStateHook'];
}

const StateContext = React.createContext<StateContextValue<any> | null>(null);

export const StateProvider = <R,>({ initialState, children }: StateProviderProps<R>) => {
    const store = createStore<R>(initialState || ({} as R));
    const { createStateHook } = createStateHookFactory<R>(store);

    return (
        <StateContext.Provider value={{store, createStateHook }}>
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