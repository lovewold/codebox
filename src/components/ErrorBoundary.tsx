import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 bg-bg-default p-8 text-center">
          <p className="text-lg font-semibold text-danger-fg">界面渲染出错</p>
          <p className="max-w-lg text-sm text-fg-muted">{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="rounded-lg bg-accent-emphasis px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            重试
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
