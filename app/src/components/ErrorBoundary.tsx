/**
 * エラーバウンダリコンポーネント
 * 子コンポーネントのレンダリングエラーをキャッチしてフォールバックUIを表示する
 */
import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div className="px-4 py-3 rounded-lg bg-[rgba(239,68,68,0.12)] text-[#f87171] text-[13px] my-2">
          <div className="font-bold mb-1">レンダリングエラー</div>
          <div className="break-all">{this.state.error.message}</div>
          <button
            onClick={this.reset}
            className="mt-2 px-3 py-1 text-[12px] bg-[#374151] text-[#d1d5db] rounded cursor-pointer"
          >
            再試行
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
