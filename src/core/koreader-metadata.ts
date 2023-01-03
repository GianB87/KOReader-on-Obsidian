import * as fs from "fs";
import * as path from "path";
import finder from "node-find-files";
import { parse } from "lua-json";
import { Books } from "settings/types";

export class KOReaderMetadata {
	booksPath: string;
	validBookPath: boolean;

	// get koreader base path on pc, if bookbath passed, then check if book path is valid, else use base path
	constructor(koreaderBasePath: string,koreaderBookPath: string) {
		const joinPath = path.join(koreaderBasePath,koreaderBookPath);
		this.validBookPath =fs.existsSync(joinPath);
		this.booksPath = this.validBookPath ? joinPath : koreaderBasePath
	}

	// scanning object to get metadata from hightlights
	public async scan(): Promise<Books> {
		const metadatas: any = {};
		return new Promise((resolve, reject) => {
			const find = new finder({
				rootFolder: this.booksPath,
			});

			// get metadata if there is one in your device
			find.on("match", (file: string) => {
				const filename = path.parse(file).base;
				
				if (filename.match(/metadata\..*\.lua$/)) {
					
					const content = fs.readFileSync(file, "utf8");
					const jsonMetadata: any = parse(content);

					const dataModify = jsonMetadata;
					// console.log(jsonMetadata)
					// extract content from metadata
					const {
						highlight,
						bookmarks,
						css,
						doc_props: { title },
						doc_props: { authors },
						// doc_pages,
						percent_finished,
					} = jsonMetadata;

					// get path for book of hightligh if epub (can also support pdf but not worth it for me, since i don't read pdf on ereaders)
					let bookPath
					if (css.includes("epub")) {
						bookPath = path.dirname(file).replace(/\.[^.]+$/, '.epub')
						// console.log(bookPath)
					} else {
						bookPath = ""
					}			
					if (Object.keys(highlight).length &&
						Object.keys(bookmarks).length) {
                        // KOReader manage highlights and bookmarks (highlight with notes) independently, then this process is to merge both. the code is probably improvised from stackoverflow copypaste to get the goal, so there is probably a gap for improvements here to optimize the code.
						const h = dataModify["highlight"];
						const b = bookmarks;
						const output : object[] = [];
						const result = {};
						let counter = 1;
                        // i don't know what i am doing
						for (const page in h) {
							for (const item in h[page]) {
								const merged = { page, ...h[page][item] };
								output.push(merged);
								result[counter] = merged;
								counter++;
							}
						}

						// to combine bookmarks with highlights
						for (const bookmark in b) {
							
							for (const highlight in result) {
								if (
									b[bookmark]["datetime"] ==
									result[highlight]["datetime"]
								) {
                                    // get page if exist
									b[bookmark]["page2"] =
										result[highlight]["page"];
                                    // get text of bookmark and replace break lines with html tag (for display in obsidian)
									b[bookmark]["text"] =
										"text" in b[bookmark]
											? b[bookmark]["text"].replace(
													/(?:\r\n|\r|\n)/g,
													"<br>")
											: "";
                                    // get notes appended to bookmark and replace break lines with html tag (for display in obsidian)
									b[bookmark]["notes"] =
										"notes" in b[bookmark]
											? b[bookmark]["notes"].replace(
													/(?:\r\n|\r|\n)/g,
													"<br>")
											: "";
								}
							}
						}
						// console.log(b)
						metadatas[`${title} - ${authors}`] = {
							title,
							authors,
							bookPath,
							// highlight,
							bookmarks,

							// doc_pages, // document pages total
							percent_finished: percent_finished * 100,
						};
					}
				}
			});
			find.on("error", (err: any) => {
				console.log(err);
				reject(err);
			});
			find.on("complete", () => {
				resolve(metadatas);
			});
			find.startSearch();
		});
	}
}
