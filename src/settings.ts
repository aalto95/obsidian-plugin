import {
	App,
	PluginSettingTab,
	SettingDefinition,
	TextComponent,
} from 'obsidian';
import HelloWorldPlugin from './main';

export interface HelloWorldSettings {
	mySetting: string;
}

export const DEFAULT_SETTINGS: HelloWorldSettings = {
	mySetting: 'default',
};

export class HelloWorldSettingTab extends PluginSettingTab {
	plugin: HelloWorldPlugin;

	constructor(app: App, plugin: HelloWorldPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinition[] {
		return [
			{
				name: 'Settings #1',
				desc: "It's a secret",
				control: {
					type: 'text',
					key: 'mySetting',
				},
			},
		];
	}
}
