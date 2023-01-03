import TemplaterPlugin from "main";
import * as eta from "eta";
import matter from 'gray-matter';
import * as crypto from 'crypto';
import { checkHighlightNote_RegExp, manageTitle } from "utils/Utils";
import { normalizePath } from "obsidian";
import { BookmarkNote } from "settings/types";


export class CreateFiles {
	private plugin: TemplaterPlugin;
    // reviewPath: string;
    // reviewTitle: string;
    ErrorType: object;
    NoteType: object;
	constructor(plugin: TemplaterPlugin) {
		this.plugin = plugin;
        this.ErrorType = {"NO_PLACEHOLDER_FOUND": "NO_PLACEHOLDER_FOUND",
        "NO_PLACEHOLDER_NOTE_CREATED":"NO_PLACEHOLDER_NOTE_CREATED"}        
        this.NoteType = {"SINGLE_NOTE": "koreader-sync-note",
        "BOOK_NOTE":"koreader-sync-dataview"}
	}


    // Only update yaml data, the content inside the note is not updated, or it should be
    async createReviewPerBook(allMeta, managedReviewTitle): Promise<void> {
        const { path, bookMeta, title, authors } = allMeta;
        const koreaderKey = this.plugin.book_notes.KOREADERKEY
        const updateNote: any = this.plugin.app.vault.getAbstractFileByPath(`${path}/${managedReviewTitle}.md`);
        // this.reviewPath = `${path}/${managedReviewTitle}.md`
        // this.reviewTitle = managedReviewTitle
        let { keepInSync } = this.plugin.settings;
        const frontMatter = {
            [koreaderKey]: {
                uniqueId: crypto
                    .createHash('md5')
                    .update(`${bookMeta.title} - ${bookMeta.authors}}`)
                    .digest('hex'),
                data: {
                    title: title,
                    authors: authors,
                },
                metadata: {
                    percent_finished: Math.round(+bookMeta.percent_finished * 100) / 100,
                    managed_title: managedReviewTitle,
                    keep_in_sync: keepInSync,
                    yet_to_be_edited: true,
                },
            },
        };

        // check if in yaml, sync is allowed
        if (updateNote) {
            const { data, content } = matter(await this.plugin.app.vault.read(updateNote), {});
            keepInSync = data[koreaderKey].metadata.keep_in_sync;
            const yetToBeEdited = data[koreaderKey].metadata.yet_to_be_edited;
            if (!keepInSync || !yetToBeEdited) {
                return;
            }
            // difference between review and dataview, here we only update the frontmatter, and the content is the same as before
            this.plugin.app.vault.modify(updateNote, matter.stringify(content, Object.assign(data,frontMatter)));
            return;
        }    
        const defaultTemplate = `# Title: <%= it.data.title %>

        <progress value="<%= it.metadata.percent_finished %>" max="100"> </progress>`;
        const templateFile : any = this.plugin.settings.customReviewTemplate
            ? this.plugin.app.vault.getAbstractFileByPath(this.plugin.settings.reviewTemplatePath)
            : null;
        const template = templateFile
            ? await this.plugin.app.vault.read(templateFile)
            : defaultTemplate;
        
        const content: any = (await eta.render(template, {...frontMatter[koreaderKey],...{
            path,
            title: allMeta.title,
            reviewPath: `${allMeta.path}/${allMeta.managedReviewTitle}.md`,
            reviewIcon: this.plugin.settings.reviewTitleOptions.prefix,
            sourcePath: this.plugin.settings.obsidianNoteFolder,
            today: new Date().toJSON().slice(0, 10)
        }}));
            this.plugin.app.vault.create(`${path}/${managedReviewTitle}.md`, matter.stringify(content, frontMatter));
    
        // console.log(updateNote)
    }
    // dataview displaying all notes ordered and centralized
    async createDataviewQueryPerBook(allMeta, managedDataviewTitle): Promise<void> {
        const { path, bookMeta,title, authors } = allMeta;
        const koreaderKey = this.plugin.book_notes.KOREADERKEY
        const updateNote: any = this.plugin.app.vault.getAbstractFileByPath(`${path}/${managedDataviewTitle}.md`);
        let { keepInSync } = this.plugin.settings;
        if (updateNote) {
            const { data } = matter(await this.plugin.app.vault.read(updateNote), {});
            keepInSync = data[koreaderKey].metadata.keep_in_sync;
            const yetToBeEdited = data[koreaderKey].metadata.yet_to_be_edited;
            if (!keepInSync || !yetToBeEdited) {
                return;
            }
        }
        const frontMatter = {
            cssclass: this.NoteType["BOOK_NOTE"],
            [koreaderKey]: {
                uniqueId: crypto
                    .createHash('md5')
                    .update(`${bookMeta.title} - ${bookMeta.authors}}`)
                    .digest('hex'),
                type: this.NoteType["BOOK_NOTE"],
                data: {
                    title: title,
                    authors: authors,
                },
                metadata: {
                    percent_finished: Math.round(+bookMeta.percent_finished * 100) / 100,
                    managed_title: managedDataviewTitle,
                    keep_in_sync: keepInSync,
                    yet_to_be_edited: true,
                },
            },
        };
        const defaultTemplate = `# <%= it.data.title %>

<progress value="<%= it.metadata.percent_finished %>" max="100"> </progress>
\`\`\`dataviewjs
const id = dv.current()['koreader-sync'].uniqueId
dv.pages('"${path}"').where(n => {
return n['koreader-sync'] && n['koreader-sync'].type == '${this.NoteType["SINGLE_NOTE"]}' && n['koreader-sync'].metadata.dataviewId == id
}).sort(p => p['koreader-sync'].data.page).forEach(p => dv.paragraph(dv.fileLink(p.file.name, true), {style: 'test-css'}))
\`\`\`
`;
        const templateFile:any = this.plugin.settings.customDataviewTemplate
            ? this.plugin.app.vault.getAbstractFileByPath(this.plugin.settings.dataviewTemplatePath)
            : null;
        const template = templateFile
            ? await this.plugin.app.vault.read(templateFile)
            : defaultTemplate;
        const content: any = (await eta.render(template, {...frontMatter[koreaderKey],...{
            path
        }}));
        if (updateNote) {
            this.plugin.app.vault.modify(updateNote, matter.stringify(content, frontMatter));
        }
        else {
            this.plugin.app.vault.create(`${path}/${managedDataviewTitle}.md`, matter.stringify(content, frontMatter));
        }
    }    

    async createBookmarkNote(note): Promise<BookmarkNote> {
        const { uniqueId, bookmark, managedBookTitle, allMeta, keepInSync } = note;
        const page = "page2" in bookmark ? bookmark.page2 : "text" in bookmark ? bookmark.text.split(' ')[1] : -1;

        let noteContent: string, noteHighlight:string;
        // console.log(bookmark)
        if ("text" in bookmark && "notes" in bookmark) {
            if (checkHighlightNote_RegExp(bookmark.text) || !bookmark.text) {
                noteContent = ""
                noteHighlight = bookmark.notes.trim()
            } else {
                noteContent = bookmark.notes.trim()                
                noteHighlight = bookmark.text.trim() 
            }
        } else {
            noteContent = ""
            noteHighlight = ""
        }
        const baseTitle = `${this.plugin.settings.noteTitleOptions.prefix || ''} ${page}_${bookmark.chapter}=${noteHighlight}`
        const manageNoteTitle = manageTitle(baseTitle,this.plugin.settings.noteTitleOptions)
        const bookPath = normalizePath(`${allMeta.path}/${managedBookTitle}`);
        let notePath: string;
        const noteFolderPath = `${allMeta.path}/${this.plugin.settings.noteFolderName}`
        if (this.plugin.settings.separateNoteFolder) {
            if (!this.plugin.app.vault.getAbstractFileByPath(noteFolderPath)) {
                
                await this.plugin.app.vault.createFolder(noteFolderPath);
            }
            
            notePath = normalizePath(`${noteFolderPath}/${manageNoteTitle}`);
        } else {
            notePath = normalizePath(`${allMeta.path}/${manageNoteTitle}`);
        }
        const defaultTemplate = `# Title: [[<%= it.bookPath %>|<%= it.title %>]]

        ### by: [[<%= it.authors %>]]
        
        ### Chapter: <%= it.chapter %>
        
        Page: <%= it.page %>
        
        **==<%= it.highlight %>==**
        
        <%= it.text %>`;
        const templateFile:any = this.plugin.settings.customTemplate
                ? this.plugin.app.vault.getAbstractFileByPath(this.plugin.settings.templatePath)
                : null;
        const template = templateFile
                ? await this.plugin.app.vault.read(templateFile)
                : defaultTemplate;

        const content:any = (await eta.render(template, {
            bookPath,
            title: allMeta.title,
            authors: allMeta.authors,
            chapter: bookmark.chapter,
            highlight: noteHighlight,
            text: noteContent,
            datetime: bookmark.datetime,
            page: +page,
            reviewPath: `${allMeta.path}/${allMeta.managedReviewTitle}.md`,
            reviewTitle: allMeta.managedReviewTitle,
            reviewIcon: this.plugin.settings.reviewTitleOptions.prefix
        }));       
        
        const frontmatterData = {
            [this.plugin.book_notes.KOREADERKEY]: {
                type: this.NoteType["SINGLE_NOTE"],
                uniqueId,
                data: {
                    title: allMeta.title,
                    authors: allMeta.authors,
                    chapter: bookmark.chapter,
                    page: +page,
                    highlight: noteHighlight,
                    datetime: bookmark.datetime,
                    text: noteContent,
                },
                metadata: {
                    body_hash: crypto.createHash('md5').update(content).digest('hex'),
                    keep_in_sync: keepInSync || this.plugin.settings.keepInSync,
                    yet_to_be_edited: true,
                    managed_book_title: managedBookTitle,
                    dataviewId: crypto
                    .createHash('md5')
                    .update(`${allMeta.bookMeta.title} - ${allMeta.bookMeta.authors}}`)
                    .digest('hex'),
                },
            },
        };
        return  { content, frontmatterData, notePath };
    }

    async createBookmarkNotes(allMeta,managedBookTitle,existingNotes): Promise<void> {
        const { path, bookMeta } = allMeta;
        let bookmark:any = {}
        for ( bookmark of Object.values(bookMeta.bookmarks)) {
            const uniqueId = crypto
            .createHash('md5')
            .update(`${bookMeta.title} - ${bookMeta.authors} - ${bookmark.pos0} - ${bookmark.pos1}`)
            .digest('hex');
            // if the note is not yet imported, make it
            if (!Object.keys(this.plugin.settings.importedNotes).includes(uniqueId)) {
                if (!Object.keys(existingNotes).includes(uniqueId) && "text" in bookmark) {
                    const { content, frontmatterData, notePath } = await this.createBookmarkNote({
                        uniqueId,
                        bookmark,
                        managedBookTitle,
                        allMeta,
                        keepInSync: this.plugin.settings.keepInSync,
                    });
                    
                    this.plugin.app.vault.create(`${notePath}.md`, matter.stringify(content, frontmatterData));
                }

                this.plugin.settings.importedNotes[uniqueId] = true;
                await this.plugin.saveSettings();
                // else if the note exists and keep_in_sync is true and yet_to_be_edited is false, we update it
            } else if (Object.keys(existingNotes).includes(uniqueId) &&
            existingNotes[uniqueId].keep_in_sync &&
            !existingNotes[uniqueId].yet_to_be_edited) {
            const note = existingNotes[uniqueId].note;
            let _a;
            const { content, frontmatterData } = await this.createBookmarkNote({
                path,
                uniqueId,
                bookmark,
                managedBookTitle,
                bookMeta,
                keepInSync: (_a = existingNotes[uniqueId]) === null || _a === void 0 ? void 0 : _a.keep_in_sync,
            });
            this.plugin.app.vault.modify(note, matter.stringify(content, frontmatterData));
        }
            
        }
    }
}