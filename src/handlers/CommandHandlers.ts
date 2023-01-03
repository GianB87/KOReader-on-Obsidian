import KOReaderPlugin from "main";

export class CommandHandler {
    constructor(private plugin: KOReaderPlugin) {}

    setup(): void {
		// Sync notes to obsidian
		this.plugin.addCommand({
			id: "obsidian-koreader-plugin-sync",
			name: "Sync",
			callback: () => {
				this.plugin.book_notes.importNotes();
			},
		});  
        
        // remove the cache of imported notes, it will sync everything even if metadata state to not sync. After executing, it will deactivate this option, since it is dangerous.
		this.plugin.addCommand({
			id: "obsidian-koreader-plugin-reset-sync-list",
			name: "Reset Sync List",
			checkCallback: (checking) => {
				if (this.plugin.settings.enbleResetImportedNotes) {
					if (!checking) {
						this.plugin.settings.importedNotes = {};
						this.plugin.settings.enbleResetImportedNotes = false;
						this.plugin.saveSettings();
					}
					return true;
				}
				return false;
			},
		});
    }
}