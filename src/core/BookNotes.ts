import KOReaderPlugin from "main";
import * as fs from "fs";
import { KOReaderMetadata } from "./koreader-metadata";
import { removeInvalidChar_RegExp,manageTitle, completeTitle} from "utils/Utils";
import { PythonShell} from 'python-shell';
import {Notice, normalizePath, FileSystemAdapter, App} from "obsidian";
export class BookNotes {
	private plugin: KOReaderPlugin;
	public KOREADERKEY: string;
	constructor(plugin: KOReaderPlugin) {
		this.plugin = plugin;
		this.KOREADERKEY = "koreader-sync";
	}
	checkPath(): string {
		// check if obsidian folder specified in settings exists
		const notePath = this.plugin.settings.obsidianNoteFolder;
		const existNotePath = Boolean(
			this.plugin.app.vault.getAbstractFileByPath(notePath)
		);
		return existNotePath ? notePath : "";
	}

	manageTitles(title, authors) {
		const valid_authors = removeInvalidChar_RegExp(authors);
		const valid_title = removeInvalidChar_RegExp(title);

		const bookTitle = completeTitle(valid_title,valid_authors,this.plugin.settings.bookTitleOptions)
		const reviewTitle = completeTitle(valid_title,valid_authors,this.plugin.settings.reviewTitleOptions)	
		const dataviewTitle = completeTitle(valid_title,valid_authors,this.plugin.settings.dataviewTitleOptions)	
		
		const managedBookTitle = manageTitle(bookTitle,this.plugin.settings.bookTitleOptions)
		const managedReviewTitle = manageTitle(reviewTitle,this.plugin.settings.reviewTitleOptions)
		const managedDataviewTitle = manageTitle(dataviewTitle,this.plugin.settings.dataviewTitleOptions)
		return {valid_title,valid_authors,managedBookTitle,managedReviewTitle,managedDataviewTitle}
	}
	getVaultAbsolutePath(app: App){
		const adapter = app.vault.adapter;
		if (adapter instanceof FileSystemAdapter) {
			return adapter.getBasePath();
		}
		return null;
	}
	async importNotes(): Promise<void> {
		console.log(this.plugin.app.vault.configDir)
		console.log(`${this.getVaultAbsolutePath(app)}/${this.plugin.app.vault.configDir}/plugins/${this.plugin.manifest.id}`)
		if (!fs.existsSync(this.plugin.settings.koreaderBasePath)) {
			new Notice(`Mounted Folder in "${this.plugin.settings.koreaderBasePath}" has no files`);
			return;
		}
		const metadata = new KOReaderMetadata(
			this.plugin.settings.koreaderBasePath,
			this.plugin.settings.koreaderBookPath
		);
		const data = await metadata.scan();

		// create a list of notes already imported in obsidian
		const existingNotes = {};

		//new Notice(`Error, bookpath not valid, using Koreader Base Path`);
		// checking the logic of this
		// if (!this.checkPath()) {
		// 	new Notice(`Error, bookpath not valid, check`);
		// }
		this.plugin.app.vault
			.getMarkdownFiles()
			.filter((file) => file.path.startsWith(this.checkPath()))
			.forEach((f) => {
				let _a, _b;
				const fm =
					(_a = this.plugin.app.metadataCache.getFileCache(f)) === null ||
					_a === void 0
						? void 0
						: _a.frontmatter;
				if (
					(_b =
						fm === null || fm === void 0
							? void 0
							: fm[this.KOREADERKEY]) === null || _b === void 0
						? void 0
						: _b.uniqueId
				) {
					existingNotes[fm[this.KOREADERKEY].uniqueId] = {
						keep_in_sync: fm[this.KOREADERKEY].metadata.keep_in_sync,
						yet_to_be_edited:
							fm[this.KOREADERKEY].metadata.yet_to_be_edited,
						note: f,
					};
				}
			});
		
		for (const bookMeta of Object.values(data)) {
			// extract metadata
			const {
				title,
				authors,
				bookPath, // use this to extract image from epub
			} = bookMeta;

			// quick format fixes
			const { valid_title, valid_authors, managedBookTitle, managedReviewTitle, managedDataviewTitle } = this.manageTitles(title, authors);

			const path = this.plugin.settings.aFolderForEachBook ? `${this.plugin.settings.obsidianNoteFolder}/${managedBookTitle}` : this.plugin.settings.obsidianNoteFolder;

			const allMeta = {
				path,
				bookMeta,
				title: valid_title,
				authors: valid_authors,
				managedReviewTitle
			}
			
			if (this.plugin.settings.aFolderForEachBook) {
				// create folder for each book with the review
				if (!this.plugin.app.vault.getAbstractFileByPath(path)) {
					await this.plugin.app.vault.createFolder(path);
					// extract cover image from epub
					new Notice(`Book Folder "${valid_title}" successfully created.`);
					if (bookPath) {
						const options: any = {
							mode: 'text',
							pythonOptions: ['-u'], // get print results in real-time
							scriptPath: `${this.getVaultAbsolutePath(app)}/${this.plugin.app.vault.configDir}/plugins/${this.plugin.manifest.id}`, //If you are having python_test.py script in same folder, then it's optional.
							args: [bookPath, `${this.getVaultAbsolutePath(app)}/${path}`] //An argument which can be accessed in the script using sys.argv[1]
						};
						PythonShell.run('epub.py', options, function (err, result){
							if (err) throw err;
							// result is an array consisting of messages collected
							//during execution of script.
							new Notice(`Image for book "${valid_title}" successfully created.`);
						});
					}
				}
				


			}
			// Here is where the template must be placed, it only happens once
			this.plugin.create_files.createReviewPerBook(allMeta,managedReviewTitle)

			if (this.plugin.settings.createDataviewQuery) {
				this.plugin.create_files.createDataviewQueryPerBook(allMeta,managedDataviewTitle);
			}
			this.plugin.create_files.createBookmarkNotes(allMeta,managedBookTitle,existingNotes)
		}		
		await this.plugin.saveSettings();
	}
}
