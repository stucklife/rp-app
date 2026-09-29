import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-900/30 border border-red-800 rounded-lg m-2 text-sm">
          <div className="font-bold text-red-300 mb-1">Ошибка рендера</div>
          <div className="text-red-200 font-mono text-xs">
            {this.state.error?.message || 'Unknown error'}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}