import {
	Editor,
	MarkdownView,
	MarkdownFileInfo,
	Modal,
	Plugin,
} from 'obsidian';
import { AnalyticsView, VIEW_TYPE_ANALYTICS } from './components/AnalyticsView';
import {
	DEFAULT_SETTINGS,
	HelloWorldSettings,
	HelloWorldSettingTab,
} from './settings';

// Remember to rename these classes and interfaces!

export default class HelloWorldPlugin extends Plugin {
	settings!: HelloWorldSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		this.addRibbonIcon('dice', 'Open analytics view', (_evt: MouseEvent) => {
			void this.app.workspace.getLeaf('tab')?.setViewState({
				type: VIEW_TYPE_ANALYTICS,
				active: true,
			});
		});

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status bar text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-modal-simple',
			name: 'Open modal (simple)',
			callback: () => {
				new HelloWorldModal(this.app).open();
			},
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'replace-selected',
			name: 'Replace selected content',
			editorCallback: (
				editor: Editor,
				_ctx: MarkdownView | MarkdownFileInfo,
			) => {
				editor.replaceSelection('Sample editor command');
			},
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-modal-complex',
			name: 'Open modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new HelloWorldModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
				return false;
			},
		});

		this.addCommand({
			id: 'open-analytics-view',
			name: 'Open analytics view',
			callback: () => {
				void this.app.workspace.getLeaf('tab')?.setViewState({
					type: VIEW_TYPE_ANALYTICS,
					active: true,
				});
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new HelloWorldSettingTab(this.app, this));

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.

		this.registerView(
			VIEW_TYPE_ANALYTICS,
			(leaf) => new AnalyticsView(leaf),
		);

		this.app.workspace.onLayoutReady(() => {
			const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_ANALYTICS);
			if (existing.length === 0) {
				void this.app.workspace.getLeaf('tab')?.setViewState({
					type: VIEW_TYPE_ANALYTICS,
					active: true,
				});
			}
		});
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<HelloWorldSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class HelloWorldModal extends Modal {
	onOpen() {
		const { contentEl } = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
