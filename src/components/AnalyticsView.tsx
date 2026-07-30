import { StrictMode } from 'react';
import { ItemView, WorkspaceLeaf } from 'obsidian';
import { Root, createRoot } from 'react-dom/client';
import { ReactView } from './ReactView';

export const VIEW_TYPE_ANALYTICS = 'analytics-view';

export class AnalyticsView extends ItemView {
	root: Root | null = null;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType() {
		return VIEW_TYPE_ANALYTICS;
	}

	getDisplayText() {
		return 'Analytics view';
	}

	async onOpen() {
		this.root = createRoot(this.contentEl);
		this.root.render(
			<StrictMode>
				<ReactView app={this.app} />
			</StrictMode>,
		);
	}

	async onClose() {
		this.root?.unmount();
	}
}
