import { createStore, ProxyObject, resolveRelativePath, Store, validatePath } from "@punyts/state";
import { useEffect, useRef, useState } from "react";

const MIN_STATE_UPDATE_MS = 50;

type DisposeListenerFn = () => void;

export const createStateHookFactory = <R>(store: Store<R> = createStore()) => {
    const createExtStateHook = <S extends { [key: string | symbol]: any } | any[]>(
        path: string,
        initialState?: S,
        listenToPaths?: string | string[],
        initializeIfMissing?: boolean
    ): S & ProxyObject => createStateHook<R, S>(store, path, initialState, listenToPaths, initializeIfMissing);

    return {
        createStateHook: createExtStateHook,
        store
    };
}

export const createStateHook = <R, S extends object>(
    store: Store<R>,
    path: string,
    initialState?: S,
    listenToPaths: string | string[] = [path, `${path}.$every`],
    initializeIfMissing: boolean = false
): S & ProxyObject => {
    
    const lastUpdate = useRef(0);
    const needsStateUpdate = useRef<any>(false);
    const isUpdating = useRef(false);
    const isDisposed = useRef(false);
    const disposeListenerRef = useRef<DisposeListenerFn | null>(null);

    useEffect(()=> {
        initializeListeners();
        return () => {
            // since react reuses state we'll use the dynamic dispose method
            if (disposeListenerRef.current)
                disposeListenerRef.current();
        };
    }, []);

    const storeState = getStoreState();
    let [state, setState] = useState<S & ProxyObject>(storeState);
    if (storeState.__path !== state.__path) {
        if (disposeListenerRef.current) {
            disposeListenerRef.current();
            initializeListeners();
            setState(storeState);
            return storeState
        }
    }

    function initializeListeners() {
        listenToPaths = resolveRelativePath(path, listenToPaths);

        store.on(listenToPaths, listener);
        store.on(path, deleteListener);

        disposeListenerRef.current = disposeListeners;

        return disposeListeners;
    }

    function disposeListeners() {
        if (isDisposed.current) return;

        store.off(listenToPaths, listener);
        store.off(path, deleteListener);

        disposeListenerRef.current = null;
        isDisposed.current = true;
    }

    function getStoreState(): S & ProxyObject {
        if (!validatePath(path)) {
            throw new Error("Invalid path" + path)
        }

        let storeState = store.get<S>(path);

        if (storeState === undefined) {

            if (initializeIfMissing) {
                store.set<S>(
                    path,
                    initialState
                        ? JSON.parse(JSON.stringify(initialState))
                        : {} as S
                );
                storeState = store.get<S>(path);
            }
        }
        else if (initialState) {
            storeState.__applyIf!(initialState);
        }

        if (!storeState)
            throw new Error ("Path not found " + path);

        return storeState;
    }

    function listener(eventPath: string, value: any, oldValue: any, action: string) {
        if (isDisposed.current) return;

        const runtime = performance.now() - lastUpdate.current;
        if (runtime < MIN_STATE_UPDATE_MS || isUpdating.current) {
            if (needsStateUpdate.current) {
                needsStateUpdate.current = oldValue;
                return;
            }

            needsStateUpdate.current = oldValue;

            const delta = MIN_STATE_UPDATE_MS - runtime;
            setTimeout(()=> {
                needsStateUpdate.current = false;
                listener(eventPath, value, needsStateUpdate.current, action);
            }, delta);

            return;
        }

        const updatedValue = store.get<S>(path);

        isUpdating.current = true;
        setState(updatedValue);
        isUpdating.current = false;

        lastUpdate.current = performance.now();
    }

    function deleteListener(eventPath: string, value: any, oldValue: any, action: string) {
        if (action === "delete" && !isDisposed.current) {
            disposeListeners();
        }
    }

    return state;
}