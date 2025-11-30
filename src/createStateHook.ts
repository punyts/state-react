import { report } from "@punyts/core";
import { createStore, ProxyObject, resolveRelativePath, Store, validatePath } from "@punyts/state";
import { useEffect, useRef, useState } from "react";

const MIN_STATE_UPDATE_MS = 50;
const FAST_UPDATE_COUNT = 5;
const FAST_UPDATE_WINDOW_MS = 120;

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
    const fastUpdateCount = useRef(0);
    const fastUpdateWindowStart = useRef(0);

    useEffect(() => {
        report("state-react", "useCreateStateHook mount for %s", [path]);
        initializeListeners();
        return () => {
            // since react reuses state we'll use the dynamic dispose method
            if (disposeListenerRef.current)
                disposeListenerRef.current();
        };
    }, []);

    const storeState = getStoreState();
    const [state, setState] = useState<S & ProxyObject>(storeState);

    const stateProxy = state as ProxyObject | undefined;
    const storeProxy = storeState as ProxyObject | undefined;
    const hasRefMatcher = Boolean(stateProxy?.__isRefMatch) && Boolean(storeProxy?.__isRefMatch);
    const shouldSyncState = hasRefMatcher
        ? !stateProxy!.__isRefMatch(storeProxy!)
        : storeState !== state;

    if (shouldSyncState) {
        if (disposeListenerRef.current) {
            disposeListenerRef.current();
        }
        isDisposed.current = false;
        initializeListeners();
        setState(storeState);
        return storeState;
    }

    function initializeListeners() {
        listenToPaths = resolveRelativePath(path, listenToPaths);
        report("state-react", "Resolved listeners for %s: %s", [path, JSON.stringify(listenToPaths)]);

        store.on(listenToPaths, listener);
        store.on(path, deleteListener);

        disposeListenerRef.current = disposeListeners;

        return disposeListeners;
    }

    function disposeListeners() {
        if (isDisposed.current) return;

        store.off(listenToPaths, listener);
        store.off(path, deleteListener);
        report("state-react", "Disposed listeners for %s", [path]);

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
                report("state-react", "Initializing missing state at path: %s", [path]);
                store.set<S>(
                    path,
                    initialState
                        ? JSON.parse(JSON.stringify(initialState))
                        : {} as S
                );
                storeState = store.get<S>(path);
            }
        }

        if (!storeState)
            throw new Error("Path not found " + path);

        return storeState;
    }

    function listener(eventPath: string, value: any, oldValue: any, action: string) {
        if (isDisposed.current) return;

        const now = performance.now();
        const runtime = now - lastUpdate.current;

        if (now - fastUpdateWindowStart.current > FAST_UPDATE_WINDOW_MS) {
            fastUpdateCount.current = 0;
            fastUpdateWindowStart.current = now;
        }

        const shouldThrottle = (runtime < MIN_STATE_UPDATE_MS && fastUpdateCount.current >= FAST_UPDATE_COUNT) || isUpdating.current;

        if (shouldThrottle) {
            report(
                "state-react-extended",
                "Throttling listener for %s (runtime=%s, isUpdating=%s, fastCount=%s)",
                [
                    path,
                    runtime.toFixed(2),
                    String(isUpdating.current),
                    String(fastUpdateCount.current)
                ]
            );
            if (needsStateUpdate.current) {
                needsStateUpdate.current = oldValue;
                return;
            }

            needsStateUpdate.current = oldValue;

            const delta = Math.max(MIN_STATE_UPDATE_MS - runtime, 0);
            setTimeout(() => {
                needsStateUpdate.current = false;
                report(
                    "state-react-extended",
                    "Replaying deferred listener for %s",
                    [path]
                );
                listener(eventPath, value, needsStateUpdate.current, action);
            }, delta);

            return;
        }

        const updatedValue = store.get<S>(path);
        report("state-react", "Applying listener update for %s", [path]);

        isUpdating.current = true;
        setState(updatedValue);
        isUpdating.current = false;

        lastUpdate.current = now;
        fastUpdateCount.current += 1;
    }

    function deleteListener(eventPath: string, value: any, oldValue: any, action: string) {
        if (action === "delete" && !isDisposed.current) {
            report("state-react", "State deleted at %s, disposing listeners", [path]);
            disposeListeners();
        }
    }

    return state;
}