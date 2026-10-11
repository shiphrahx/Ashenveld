import React from 'react'
import ErrorScreen from './ErrorScreen'

interface State { error: string | null }

/** Catches a crash anywhere in the game and shows the error screen. The save stays where it is. */
export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null }
  static getDerivedStateFromError(e: unknown): State { return { error: e instanceof Error ? `${e.message}\n\n${e.stack ?? ''}` : String(e) } }
  componentDidCatch(e: unknown) { console.error('Ashenveld crashed', e) }
  render() {
    if (this.state.error) return <ErrorScreen error={this.state.error} onRetry={() => location.reload()} onTitle={() => location.reload()} />
    return this.props.children
  }
}
