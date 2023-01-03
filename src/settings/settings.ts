import { PluginSettingTab, Setting, TFolder, Vault } from "obsidian";
import KOReaderPlugin from "main";

export interface KOReaderSettings {
	importedNotes: object;
	enbleResetImportedNotes: boolean;
	keepInSync: boolean;
	aFolderForEachBook: boolean;
	customTemplate: boolean;
	customDataviewTemplate: boolean;
	customReviewTemplate: boolean;
	templatePath: string;
	reviewTemplatePath: string;
	dataviewTemplatePath: string;
	createDataviewQuery: boolean;
	enable_ribbon_icon: boolean;
	koreaderBasePath: string;
	koreaderBookPath: string;
	obsidianNoteFolder: string;

	separateNoteFolder: string,
	noteFolderName: boolean,
	noteTitleOptions: {
		maxWords: number;
		maxLength: number;
		prefix: string;
	};
	bookTitleOptions: {
		maxWords: number;
		maxLength: number;
		prefix: string;
	};
	reviewTitleOptions: {
		maxWords: number;
		maxLength: number;
		prefix: string;
	};
	dataviewTitleOptions: {
		maxWords: number;
		maxLength: number;
		prefix: string;
	};
}

export const DEFAULT_SETTINGS: KOReaderSettings = {
	importedNotes: {},
	enbleResetImportedNotes: false,
	keepInSync: false,
	aFolderForEachBook: false,
	customTemplate: false,
	customDataviewTemplate: false,
	customReviewTemplate: false,
	templatePath: "",
	reviewTemplatePath: "",
	dataviewTemplatePath: "",
	createDataviewQuery: false,
	enable_ribbon_icon: true,
	koreaderBasePath: "/media/user/KOBOeReader",
	koreaderBookPath: "",
	obsidianNoteFolder: "/",
	separateNoteFolder: "",
	noteFolderName: false,
	noteTitleOptions: {
		maxWords: 5,
		maxLength: 25,
		prefix: "(note) ",
	},
	bookTitleOptions: {
		maxWords: 5,
		maxLength: 25,
		prefix: "(book) ",
	},
	reviewTitleOptions: {
		maxWords: 5,
		maxLength: 25,
		prefix: "(review) ",
	},
	dataviewTitleOptions: {
		maxWords: 5,
		maxLength: 25,
		prefix: "",
	},
};

export class KOReaderSettingTab extends PluginSettingTab {
    constructor(private plugin: KOReaderPlugin) {
        super(app, plugin);
    }
    display(): void {
        this.containerEl.empty();
		//* generals
        this.add_general_setting_header();
        this.add_mount_folder_setting();
        this.add_booknotes_folder_setting();
		this.add_keep_sync_setting();
		this.add_create_folder_each();

		this.containerEl.createEl('h1', { text: 'View settings' });
		this.add_book_notes_select_templates_setting();
		this.add_review_note_select_templates_setting();
		this.add_dataview_note_select_templates_setting();

		//+ Title format
		this.containerEl.createEl('h1', { text: 'Note title settings' });

		this.containerEl.createEl('h2', { text: 'Folder Note settings' });
		this.add_title_setting(this.plugin.settings.bookTitleOptions);

		this.containerEl.createEl('h2', { text: 'Book Notes title settings' });
		this.add_title_setting(this.plugin.settings.noteTitleOptions);

		this.containerEl.createEl('h2', { text: 'Review Note title settings' });
		this.add_title_setting(this.plugin.settings.reviewTitleOptions);

		this.containerEl.createEl('h2', { text: 'Dataview Note title settings' });
		this.add_title_setting(this.plugin.settings.dataviewTitleOptions);
    }
    add_general_setting_header(): void {
        this.containerEl.createEl("h1", { text: "KOReader general settings" });
    }
    add_mount_folder_setting(): void {
        new Setting(this.containerEl)
            .setName('KOReader mounted path')
            .setDesc('Paste the URL of your device drive. You need to mount your device drive to your main disk drive (C:).')
            .addText((text) => text
            .setPlaceholder('Eg. "C:\\path\\...\\MountedDrive')
            .setValue(this.plugin.settings.koreaderBasePath)
            .onChange((value) => {
            this.plugin.settings.koreaderBasePath = value;
            this.plugin.saveSettings();
        }));
    }
    add_booknotes_folder_setting(): void {
        new Setting(this.containerEl)
            .setName("Booknotes folder location")
            .setDesc("Vault folder to use for extracting booknotes from device.")
			.addDropdown((dropdown) => {
				Vault.recurseChildren(this.app.vault.getRoot(), (note) => {
					if (note instanceof TFolder) {
						dropdown.addOption(note.path, note.path);
					}
				});
				return dropdown
					.setValue(this.plugin.settings.obsidianNoteFolder)
					.onChange((value) => {
					this.plugin.settings.obsidianNoteFolder = value;
					this.plugin.saveSettings();
				});
			});
    }
    add_keep_sync_setting(): void {
        new Setting(this.containerEl)
            .setName("Keep in sync")
            .setDesc("Keep notes in sync with extracted booknotes. If editable, it will be overwritten.")
            .addToggle((toggle) => toggle
            .setValue(this.plugin.settings.keepInSync)
            .onChange((value) => {
            this.plugin.settings.keepInSync = value;
            this.plugin.saveSettings();
        }));
    }
	add_create_folder_each(): void {
		new Setting(this.containerEl)
		.setName('Create a folder for each book')
		.setDesc('All the notes from a book will be saved in a folder named after the book')
		.addToggle((toggle) => toggle
		.setValue(this.plugin.settings.aFolderForEachBook)
		.onChange((value) =>{
		this.plugin.settings.aFolderForEachBook = value;
		this.plugin.saveSettings();
	}));
	}

	add_book_notes_select_templates_setting(): void {
		new Setting(this.containerEl)
		.setName('Book notes Template')
		.setDesc('Use a custom template for booknotes in device')
		.addToggle((toggle) => toggle
		.setValue(this.plugin.settings.customTemplate)
		.onChange((value) => {
		this.plugin.settings.customTemplate = value;
		this.plugin.saveSettings();
	}));
		new Setting(this.containerEl)
			.setName('Book notes Template File')
			.setDesc('The template file to use. Remember to add the ".md" extension')
			.addText((text) => text
			.setPlaceholder('eg. templates/noteTemplate.md')
			.setValue(this.plugin.settings.templatePath)
			.onChange((value) => {
			this.plugin.settings.templatePath = value;
			this.plugin.saveSettings();
		}));
	}
	add_review_note_select_templates_setting(): void {
		new Setting(this.containerEl)
			.setName('Review note template')
			.setDesc('Use a custom template for the review note')
			.addToggle((toggle) => toggle
			.setValue(this.plugin.settings.customReviewTemplate)
			.onChange((value) =>  {
			this.plugin.settings.customReviewTemplate = value;
			this.plugin.saveSettings();
		}));
		new Setting(this.containerEl)
			.setName('Review note template file')
			.setDesc('The template file to use. Remember to add the ".md" extension')
			.addText((text) => text
			.setPlaceholder('eg. templates/review-template.md')
			.setValue(this.plugin.settings.reviewTemplatePath)
			.onChange((value) => {
			this.plugin.settings.reviewTemplatePath = value;
			this.plugin.saveSettings();
		}));
	}
	add_dataview_note_select_templates_setting(): void {
		// dataview
        new Setting(this.containerEl)
            .setName('Create a dataview query')
            .setDesc('Create a note (for each book) with a dataview query)')
            .addToggle((toggle) => toggle
            .setValue(this.plugin.settings.createDataviewQuery)
            .onChange((value) => {
            this.plugin.settings.createDataviewQuery = value;
            this.plugin.saveSettings();
        }));
		new Setting(this.containerEl)
			.setName('Dataview note template')
			.setDesc('Use a custom template for the Dataview note')
			.addToggle((toggle) => toggle
			.setValue(this.plugin.settings.customDataviewTemplate)
			.onChange((value) =>  {
			this.plugin.settings.customDataviewTemplate = value;
			this.plugin.saveSettings();
		}));
		new Setting(this.containerEl)
			.setName('Dataview note template file')
			.setDesc('The template file to use. Remember to add the ".md" extension')
			.addText((text) => text
			.setPlaceholder('eg. templates/dataview-template.md')
			.setValue(this.plugin.settings.dataviewTemplatePath)
			.onChange((value) => {
			this.plugin.settings.dataviewTemplatePath = value;
			this.plugin.saveSettings();
		}));
	}

	add_title_setting(options): void {
		new Setting(this.containerEl).setName('Prefix').addText((text) => text
		.setPlaceholder('Enter the prefix')
		.setValue(options.prefix)
		.onChange((value) => {
			options.prefix = value;
		this.plugin.saveSettings();
	}));		
	new Setting(this.containerEl)
		.setName('Max words')
		.setDesc('If is longer than this number of words, it will be truncated with "_"')
		.addSlider((number) => number
		.setDynamicTooltip()
		.setLimits(2, 50, 1)
		.setValue(options.maxWords)
		.onChange((value) => {
			options.maxWords = value;
		this.plugin.saveSettings();
}));
		new Setting(this.containerEl)
			.setName('Max length')
			.setDesc('If is longer than this number of characters, it will be truncated and "_"')
			.addSlider((number) => number
			.setDynamicTooltip()
			.setLimits(5, 256, 1)
			.setValue(options.maxLength)
			.onChange((value) =>{
			options.maxLength = value;
			this.plugin.saveSettings();
		}));
	}

}