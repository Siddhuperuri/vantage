/* ------------------------------------------------------------------
   SafeModule.tsx - one place failing must not take the world with it.

   A module or an optional effect that throws is contained here: the
   rest of the journey keeps running, the visitor is told in the live
   region that something is missing, and the error is reported to the
   console rather than swallowed.
   ------------------------------------------------------------------ */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { announce } from '../ui/actions';

interface Props {
  /** what failed, in the visitor's words */
  name: string;
  children: ReactNode;
  /** drawn instead, if there is something simpler to show */
  fallback?: ReactNode;
}

interface State {
  failed: boolean;
}

export class SafeModule extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // never silently: the console gets the whole thing
    console.error(`[miracle] ${this.props.name} failed and was dropped`, error, info);
    announce(
      `${this.props.name} could not be drawn, so it has been left out. The rest of the journey still works.`,
    );
  }

  render(): ReactNode {
    if (this.state.failed) return this.props.fallback ?? null;
    return this.props.children;
  }
}
