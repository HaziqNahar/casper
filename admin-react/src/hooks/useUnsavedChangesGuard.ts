import { useCallback, useEffect, useRef } from "react";
import { useBeforeUnload, useBlocker } from "react-router-dom";

type Options = {
  when: boolean;
  message: string;
};

export function useUnsavedChangesGuard({ when, message }: Options) {
  const bypassRef = useRef(false);

  const shouldBlock = when && !bypassRef.current;
  const blocker = useBlocker(shouldBlock);

  useBeforeUnload(
    useCallback(
      (event) => {
        if (!shouldBlock) return;
        event.preventDefault();
        event.returnValue = message;
      },
      [message, shouldBlock]
    )
  );

  useEffect(() => {
    if (blocker.state !== "blocked") return;

    const confirmed = window.confirm(message);
    if (confirmed) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker, message]);

  const allowNextNavigation = useCallback(() => {
    bypassRef.current = true;
  }, []);

  return { allowNextNavigation };
}