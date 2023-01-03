import {
	Plugin,
	addIcon,
} from "obsidian";
import * as eta from "eta";
import { KOReaderSettings, DEFAULT_SETTINGS, KOReaderSettingTab } from "./settings/settings";
import { CommandHandler } from "./handlers/CommandHandlers";
import { ICON_DATA } from "utils/Constants";
import { BookNotes } from "core/BookNotes";
import { CreateFiles } from "core/CreateFiles";


export default class KOReaderPlugin extends Plugin {
	public settings: KOReaderSettings;
	public book_notes: BookNotes;
	public create_files: CreateFiles;
	public command_handler: CommandHandler;
	manageTitle(title, options = {}) {
		// Transform title to the correct format to display on obsidian
		title = "Catch title from koreader";
		return title;
	}
	async onload(): Promise<void> {
		eta.configure({
			cache: true,
			autoEscape: false,
		});
		await this.loadSettings();

		this.book_notes = new BookNotes(this);
		this.create_files = new CreateFiles(this);
		this.command_handler = new CommandHandler(this);
        this.command_handler.setup();

		addIcon("koreader-icon", ICON_DATA);
        if (this.settings.enable_ribbon_icon) {
            this.addRibbonIcon("koreader-icon", "KOReader Sync", async () => {
                this.book_notes.importNotes();
            }).setAttribute("id", "rb-koreader-icon");
        }
		this.addSettingTab(new KOReaderSettingTab(this));
	}

	onunload() {}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}

// class KoreaderSettingTab extends PluginSettingTab {
// 	plugin: KOReader;

// 	constructor(app: App, plugin: KOReader) {
// 		super(app, plugin);
// 		this.plugin = plugin;
// 	}

// 	display(): void {
// 		const { containerEl } = this;

// 		containerEl.empty();

// 		containerEl.createEl("h2", { text: "KOReader general settings." });

// 		new Setting(containerEl)
// 			.setName("Setting #1")
// 			.setDesc("It's a secret")
// 			.addText((text) =>
// 				text
// 					.setPlaceholder("Enter your secret")
// 					.onChange(async (value) => {
// 						console.log("Secret: " + value);
// 						await this.plugin.saveSettings();
// 					})
// 			);
// 	}
// }

